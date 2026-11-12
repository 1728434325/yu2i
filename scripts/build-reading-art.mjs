import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let packageRoot = join(root, "node_modules/sharp");
try { await access(join(packageRoot, "package.json")); } catch {
  const store = join(root, "node_modules/.pnpm");
  const entry = (await readdir(store)).find((name) => name.startsWith("sharp@"));
  if (!entry) throw new Error("Run pnpm install first.");
  packageRoot = join(store, entry, "node_modules/sharp");
}
const pkg = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const { default: sharp } = await import(pathToFileURL(resolve(packageRoot, pkg.main)).href);
const directory = join(root, "public/images/hanekawa/reading");
await mkdir(directory, { recursive: true });
const provenance = JSON.parse(await readFile(join(root, "docs/reading-companions-assets.json"), "utf8"));
const assets = {};
for (const form of ["day", "night"]) {
  const file = join(root, `design/reading/line-poses-${form}.png`);
  const metadata = await sharp(file).metadata();
  if (!metadata.hasAlpha) throw new Error(`Missing transparent alpha: ${file}`);
  const width = metadata.width, height = metadata.height;
  const source = await sharp(file).ensureAlpha().raw().toBuffer();
  const seen = new Uint8Array(width * height);
  const components = [];
  // Select the two actual connected silhouettes rather than assuming the
  // generator placed their forearms precisely on an atlas grid boundary.
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || source[start * 4 + 3] < 160) continue;
    const component = [start]; seen[start] = 1;
    for (let cursor = 0; cursor < component.length; cursor++) {
      const pixel = component[cursor], x = pixel % width, y = Math.floor(pixel / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !seen[next] && source[next * 4 + 3] >= 160) {
          seen[next] = 1; component.push(next);
        }
      }
    }
    components.push(component);
  }
  components.sort((a, b) => b.length - a.length);
  const subjects = components.slice(0, 2).sort((a, b) => a[0] - b[0]);
  if (subjects.length !== 2 || subjects[1].length < width * height * .025) throw new Error(`Missing pose silhouette: ${form}`);
  for (const [index, pose] of ["lean", "rest"].entries()) {
    const pixels = Buffer.from(source);
    const keep = new Uint8Array(seen.length);
    for (const pixel of subjects[index]) {
      const x = pixel % width, y = Math.floor(pixel / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && source[next * 4 + 3] >= 24) keep[next] = 1;
      }
    }
    let left = width, right = 0, upper = height, lower = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (!keep[y * width + x]) pixels.fill(0, offset, offset + 4);
      else { left = Math.min(left, x); right = Math.max(right, x); upper = Math.min(upper, y); lower = Math.max(lower, y); }
    }
    if (right <= left || lower <= upper) throw new Error(`Empty ${form}-${pose}`);
    const destination = join(directory, `${form}-${pose}.webp`);
    await sharp(pixels, { raw: { width, height, channels: 4 } })
      .extract({ left, top: upper, width: right - left + 1, height: lower - upper + 1 })
      .resize({ width: pose === "lean" ? 520 : 760, height: 480, fit: "inside", withoutEnlargement: true })
      .extend({ top: 4, bottom: 2, left: 4, right: 4, background: "#00000000" })
      .webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(destination);
    await writeFile(`${destination}.json`, JSON.stringify({ prompt: provenance.outputs.find((item) => item.form === form).prompt, source: `design/reading/line-poses-${form}.png` }, null, 2) + "\n");
    const info = await sharp(destination).metadata();
    const hash = createHash("sha256").update(await readFile(destination)).digest("hex").slice(0, 10);
    assets[`${form}-${pose}`] = { src: `/images/hanekawa/reading/${form}-${pose}.webp?v=${hash}`, width: info.width, height: info.height };
  }
}
await writeFile(join(root, "src/data/reading-art-assets.json"), JSON.stringify({ assets }, null, 2) + "\n");
console.log(JSON.stringify(assets, null, 2));
