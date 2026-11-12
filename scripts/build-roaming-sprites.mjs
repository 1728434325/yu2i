import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let sharpDirectory = join(root, "node_modules/sharp");
try { await access(join(sharpDirectory, "package.json")); } catch {
  const store = join(root, "node_modules/.pnpm");
  const entry = (await readdir(store)).find((name) => name.startsWith("sharp@"));
  if (!entry) throw new Error("Run pnpm install before assembling animation assets.");
  sharpDirectory = join(store, entry, "node_modules/sharp");
}
const sharpPackage = JSON.parse(await readFile(join(sharpDirectory, "package.json"), "utf8"));
const { default: sharp } = await import(pathToFileURL(resolve(sharpDirectory, sharpPackage.main)).href);
const generated = join(root, "design/generated");
const destination = join(root, "public/images/hanekawa");
const previews = join(root, "design/previews");
await mkdir(destination, { recursive: true });
await mkdir(previews, { recursive: true });

// Standard sprite export: crop generated cells, remove disconnected matte specks,
// snap alpha to game pixels and register all feet to a shared baseline.
async function readCells(file) {
  const { width, height } = await sharp(file).metadata();
  const cells = [];
  for (let index = 0; index < 16; index++) {
    const column = index % 4, row = Math.floor(index / 4);
    const left = Math.round(column * width / 4), top = Math.round(row * height / 4);
    const right = Math.round((column + 1) * width / 4), bottom = Math.round((row + 1) * height / 4);
    const pixels = await sharp(file).extract({ left, top, width: right - left, height: bottom - top })
      .resize(64, 64, { kernel: "nearest" }).ensureAlpha().raw().toBuffer();
    const visited = new Uint8Array(4096);
    let largest = [];
    for (let pixel = 0; pixel < 4096; pixel++) {
      if (visited[pixel] || pixels[pixel * 4 + 3] < 128) continue;
      const component = [pixel]; visited[pixel] = 1;
      for (let cursor = 0; cursor < component.length; cursor++) {
        const current = component[cursor], x = current % 64, y = Math.floor(current / 64);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= 64 || ny < 0 || ny >= 64) continue;
          const next = ny * 64 + nx;
          if (!visited[next] && pixels[next * 4 + 3] >= 128) { visited[next] = 1; component.push(next); }
        }
      }
      if (component.length > largest.length) largest = component;
    }
    if (largest.length < 150 || largest.length > 3500) throw new Error(`Invalid transparent sprite: ${file}, cell ${index}`);
    const keep = new Set(largest);
    const bbox = { left: 64, top: 64, right: 0, bottom: 0 };
    for (let pixel = 0; pixel < 4096; pixel++) {
      if (keep.has(pixel)) {
        pixels[pixel * 4 + 3] = 255;
        bbox.left = Math.min(bbox.left, pixel % 64); bbox.right = Math.max(bbox.right, pixel % 64);
        bbox.top = Math.min(bbox.top, Math.floor(pixel / 64)); bbox.bottom = Math.max(bbox.bottom, Math.floor(pixel / 64));
      } else pixels.fill(0, pixel * 4, pixel * 4 + 4);
    }
    cells.push({ pixels, left: bbox.left, top: bbox.top, width: bbox.right - bbox.left + 1, height: bbox.bottom - bbox.top + 1 });
  }
  // One scale per sheet preserves seated height and arm extension across poses.
  const scale = Math.min(52 / Math.max(...cells.map((cell) => cell.height)), 54 / Math.max(...cells.map((cell) => cell.width)));
  return Promise.all(cells.map(async (cell) => {
    const width = Math.max(1, Math.round(cell.width * scale)), height = Math.max(1, Math.round(cell.height * scale));
    const input = await sharp(cell.pixels, { raw: { width: 64, height: 64, channels: 4 } })
      .extract({ left: cell.left, top: cell.top, width: cell.width, height: cell.height }).resize(width, height, { kernel: "nearest" }).png().toBuffer();
    return sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input, left: Math.floor((64 - width) / 2), top: 58 - height }]).png().toBuffer();
  }));
}

const rowNames = ["idle", "walk-right", "walk-left", "walk-up", "walk-down", "wave", "jump", "read-or-groom", "glasses-or-paw", "stretch", "sleep"];
const result = { frameSize: 64, columns: 4, rows: rowNames, forms: [] };
for (const form of ["day", "night"]) {
  const files = {
    base: join(destination, `pixel-${form}-sheet.png`),
    walk: join(generated, `pixel-${form}-walk-v2.png`),
    actions: join(generated, `pixel-${form}-actions-v2.png`),
  };
  const base = await readCells(files.base), walk = await readCells(files.walk), actions = await readCells(files.actions);
  const tiles = [...base.slice(0, 4), ...walk, ...base.slice(8, 16), ...actions];
  const output = join(destination, `pixel-${form}-roaming.png`);
  await sharp({ create: { width: 256, height: rowNames.length * 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(tiles.map((input, index) => ({ input, left: index % 4 * 64, top: Math.floor(index / 4) * 64 })))
    .png({ palette: true, colours: 64, dither: 0 }).toFile(output);
  const walkFrames = [];
  for (const tile of tiles.slice(4, 20)) walkFrames.push(await sharp(tile).resize(128, 128, { kernel: "nearest" }).ensureAlpha().raw().toBuffer());
  await sharp(Buffer.concat(walkFrames), { raw: { width: 128, height: 128 * 16, channels: 4, pageHeight: 128 } })
    .gif({ loop: 0, delay: Array(16).fill(150), colours: 64, dither: 0, effort: 7 }).toFile(join(previews, `pixel-${form}-directions.gif`));
  result.forms.push({ form, file: `public/images/hanekawa/pixel-${form}-roaming.png`, frames: tiles.length,
    bytes: (await readFile(output)).length, sha256: createHash("sha256").update(await readFile(output)).digest("hex"),
    sources: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, value.slice(root.length + 1).replaceAll("\\", "/")])) });
}
await writeFile(join(generated, "pixel-roaming-manifest.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
