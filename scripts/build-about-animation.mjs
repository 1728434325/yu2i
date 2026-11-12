import { readdir, readFile, mkdir, writeFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
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
const source = join(root, "design/generated");
const output = join(root, "public/images/hanekawa");
await mkdir(output, { recursive: true });
const cropCell = async (file, index, size, pixel = false) => {
  const { width, height } = await sharp(file).metadata();
  const column = index % 4;
  const row = Math.floor(index / 4);
  const left = Math.round(column * width / 4);
  const top = Math.round(row * height / 4);
  const right = Math.round((column + 1) * width / 4);
  const bottom = Math.round((row + 1) * height / 4);
  return sharp(file).extract({ left, top, width: right - left, height: bottom - top })
    .resize(size, size, { kernel: pixel ? "nearest" : "lanczos3" }).ensureAlpha();
};

// Normalize exported game pixels to binary alpha. Keep the sprite's connected
// silhouette so isolated matte specks do not become animated background noise.
const spriteCell = async (file, index) => {
  const data = await (await cropCell(file, index, 64, true)).raw().toBuffer();
  const visited = new Uint8Array(64 * 64);
  let silhouette = [];
  for (let pixel = 0; pixel < visited.length; pixel++) {
    if (visited[pixel] || data[pixel * 4 + 3] < 128) continue;
    const component = [pixel];
    visited[pixel] = 1;
    for (let cursor = 0; cursor < component.length; cursor++) {
      const current = component[cursor];
      const x = current % 64;
      const y = Math.floor(current / 64);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= 64 || ny < 0 || ny >= 64) continue;
        const next = ny * 64 + nx;
        if (!visited[next] && data[next * 4 + 3] >= 128) { visited[next] = 1; component.push(next); }
      }
    }
    if (component.length > silhouette.length) silhouette = component;
  }
  if (silhouette.length < 100) throw new Error(`Missing sprite in ${file}, cell ${index}`);
  const keep = new Set(silhouette);
  for (let pixel = 0; pixel < visited.length; pixel++) {
    if (keep.has(pixel)) data[pixel * 4 + 3] = 255;
    else data.fill(0, pixel * 4, pixel * 4 + 4);
  }
  return sharp(data, { raw: { width: 64, height: 64, channels: 4 } }).png().toBuffer();
};

const originalGif = join(root, "public/images/about-avatar.gif");
const originalBytes = await readFile(originalGif);
await sharp(originalGif, { page: 0 }).resize(240, 240).webp({ quality: 92 }).toFile(join(output, "about-avatar-day-poster.webp"));
const avatarSheet = join(source, "about-night-frames.png");
const frames = [];
for (let index = 0; index < 16; index++) frames.push(await (await cropCell(avatarSheet, index, 240)).raw().toBuffer());
const delays = [240, 120, 120, 160, 100, 100, 100, 160, 120, 120, 120, 120, 120, 120, 160, 240];
await sharp(Buffer.concat(frames), { raw: { width: 240, height: 240 * frames.length, channels: 4, pageHeight: 240 } })
  .gif({ loop: 0, delay: delays, colours: 256, dither: .25, effort: 7 }).toFile(join(output, "about-avatar-night.gif"));
await (await cropCell(avatarSheet, 0, 240)).webp({ quality: 92 }).toFile(join(output, "about-avatar-night-poster.webp"));

const sprites = [];
for (const form of ["day", "night"]) {
  const file = join(source, `pixel-${form}-frames.png`);
  const tiles = [];
  for (let index = 0; index < 16; index++) {
    const input = await spriteCell(file, index);
    tiles.push({ input, left: (index % 4) * 64, top: Math.floor(index / 4) * 64 });
  }
  const destination = join(output, `pixel-${form}-sheet.png`);
  await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(tiles).png({ palette: true, colours: 64, dither: 0 }).toFile(destination);
  sprites.push({ form, file: `public/images/hanekawa/pixel-${form}-sheet.png`, frames: 16, frameSize: 64, rows: ["idle", "walk", "wave", "jump"] });
}
const metadata = await sharp(join(output, "about-avatar-night.gif"), { animated: true }).metadata();
const report = {
  dayGif: "public/images/about-avatar.gif",
  dayGifSha256: createHash("sha256").update(originalBytes).digest("hex"),
  nightGif: { file: "public/images/hanekawa/about-avatar-night.gif", frames: metadata.pages, width: metadata.width, height: metadata.pageHeight, loop: metadata.loop, delay: metadata.delay },
  sprites,
};
await writeFile(join(source, "about-animation-manifest.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
