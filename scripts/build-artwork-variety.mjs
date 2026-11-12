import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let sharpDirectory = join(root, "node_modules/sharp");
try { await access(join(sharpDirectory, "package.json")); } catch {
  const store = join(root, "node_modules/.pnpm");
  const entry = (await readdir(store)).find((name) => name.startsWith("sharp@"));
  if (!entry) throw new Error("Run pnpm install first.");
  sharpDirectory = join(store, entry, "node_modules/sharp");
}
const sharpPackage = JSON.parse(await readFile(join(sharpDirectory, "package.json"), "utf8"));
const { default: sharp } = await import(pathToFileURL(resolve(sharpDirectory, sharpPackage.main)).href);
const source = join(root, "design/variety");
const output = join(root, "public/images/hanekawa/collection");
await mkdir(output, { recursive: true });
const assets = {};

// Export the supplied/generated alpha as independent cutouts. Remove disconnected
// matte specks, keep a soft one-pixel edge, then trim transparent canvas margins.
async function exportCutout(file, index, columns, rows, name, portrait = false) {
  const metadata = await sharp(file).metadata();
  const column = index % columns, row = Math.floor(index / columns);
  // The supplied outfit collage has a few shoes/props crossing the nominal
  // cell boundary. Read a margin, then select the character's connected shape.
  const body = name.startsWith("body-");
  const margin = body ? Math.round(metadata.width / columns * .14) : 0;
  const left = Math.max(0, Math.round(column * metadata.width / columns) - margin);
  const top = Math.max(0, Math.round(row * metadata.height / rows) - margin);
  const right = Math.min(metadata.width, Math.round((column + 1) * metadata.width / columns) + margin);
  const bottom = Math.min(metadata.height, Math.round((row + 1) * metadata.height / rows) + margin);
  const width = right - left, height = bottom - top;
  const pixels = await sharp(file).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer();
  const size = width * height, seen = new Uint8Array(size);
  const components = [];
  for (let start = 0; start < size; start++) {
    if (seen[start] || pixels[start * 4 + 3] < 160) continue;
    const component = [start]; seen[start] = 1;
    for (let cursor = 0; cursor < component.length; cursor++) {
      const pixel = component[cursor], x = pixel % width, y = Math.floor(pixel / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (!seen[next] && pixels[next * 4 + 3] >= 160) { seen[next] = 1; component.push(next); }
      }
    }
    components.push(component);
  }
  components.sort((a, b) => b.length - a.length);
  if (!components[0] || components[0].length < size * .025) throw new Error(`Empty cutout ${name}`);
  const keep = new Uint8Array(size);
  const minimum = Math.max(40, components[0].length * .002);
  const primaryBox = { left: width, top: height, right: 0, bottom: 0 };
  for (const pixel of components[0]) {
    primaryBox.left = Math.min(primaryBox.left, pixel % width); primaryBox.right = Math.max(primaryBox.right, pixel % width);
    primaryBox.top = Math.min(primaryBox.top, Math.floor(pixel / width)); primaryBox.bottom = Math.max(primaryBox.bottom, Math.floor(pixel / width));
  }
  for (const component of components) {
    if (component.length < minimum) continue;
    if (body && component !== components[0] && component.some((pixel) => pixel % width < primaryBox.left || pixel % width > primaryBox.right || Math.floor(pixel / width) < primaryBox.top || Math.floor(pixel / width) > primaryBox.bottom)) continue;
    for (const pixel of component) keep[pixel] = 1;
  }
  const expanded = keep.slice();
  for (let pixel = 0; pixel < size; pixel++) if (keep[pixel]) {
    const x = pixel % width, y = Math.floor(pixel / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const next = ny * width + nx;
        if (pixels[next * 4 + 3] >= 24) expanded[next] = 1;
      }
    }
  }
  const box = { left: width, top: height, right: 0, bottom: 0 };
  for (let pixel = 0; pixel < size; pixel++) {
    if (!expanded[pixel]) pixels.fill(0, pixel * 4, pixel * 4 + 4);
    else {
      box.left = Math.min(box.left, pixel % width); box.right = Math.max(box.right, pixel % width);
      box.top = Math.min(box.top, Math.floor(pixel / width)); box.bottom = Math.max(box.bottom, Math.floor(pixel / width));
      pixels[pixel * 4 + 3] = Math.min(255, Math.round(pixels[pixel * 4 + 3] * 255 / 254));
    }
  }
  const crop = sharp(pixels, { raw: { width, height, channels: 4 } }).extract({ left: box.left, top: box.top, width: box.right - box.left + 1, height: box.bottom - box.top + 1 });
  const buffer = portrait
    ? await crop.resize(280, 280, { fit: "contain", background: "#00000000" }).png().toBuffer()
    : await crop.resize({ width: 480, height: 600, fit: "inside" }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: "#00000000" }).png().toBuffer();
  const destination = join(output, `${name}.webp`);
  await sharp(buffer).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(destination);
  const info = await sharp(destination).metadata();
  const version = createHash("sha256").update(await readFile(destination)).digest("hex").slice(0, 10);
  assets[name] = { src: `/images/hanekawa/collection/${name}.webp?v=${version}`, width: info.width, height: info.height };
}

const outfits = ["formal", "school", "summer", "martial", "kimono", "casual"];
const expressions = ["smile", "shy", "confident", "focused", "curious", "cry"];
for (const form of ["day", "night"]) {
  for (let index = 0; index < 6; index++) {
    await exportCutout(join(source, `gift-body-${form}.png`), index, 3, 2, `body-${form}-${outfits[index]}`);
    await exportCutout(join(source, `gift-head-${form}.png`), index, 3, 2, `head-${form}-${expressions[index]}`, true);
  }
}
for (const [index, pose] of ["sit", "sleep", "stretch", "groom", "walk", "roll"].entries()) {
  await exportCutout(join(source, "cats-six-poses.png"), index, 3, 2, `cat-${pose}`);
}

const giftFiles = await readdir(join(root, "tmp"));
for (const form of ["day", "night"]) {
  const suffix = form === "day" ? "-2.gif" : "-1.gif";
  const name = giftFiles.find((file) => file.startsWith("ChatGPT GIF ") && file.endsWith(suffix));
  if (!name) throw new Error(`Missing supplied ${form} GIF`);
  const file = join(root, "tmp", name);
  const destination = join(output, `gift-avatar-${form}.webp`);
  await sharp(file, { animated: true }).resize(192, 192).webp({ quality: 88, effort: 5 }).toFile(destination);
  const poster = join(output, `gift-avatar-${form}-poster.webp`);
  await sharp(file, { page: 0 }).resize(192, 192).webp({ quality: 90 }).toFile(poster);
  assets[`avatar-${form}`] = { src: `/images/hanekawa/collection/gift-avatar-${form}.webp`, width: 192, height: 192, poster: `/images/hanekawa/collection/gift-avatar-${form}-poster.webp` };
}

// ICO is a container of resized transparent PNG frames. Preserve RGBA through
// every size; converting to RGB here would reintroduce the black corners.
const icon = await sharp(join(source, "favicon-transparent.png")).resize(512, 512).ensureAlpha().png().toBuffer();
const resizeIcon = async (size) => {
  const pixels = await sharp(icon).resize(size, size).ensureAlpha().raw().toBuffer();
  for (let offset = 0; offset < pixels.length; offset += 4) if (pixels[offset + 3] < 8) pixels.fill(0, offset, offset + 4);
  return sharp(pixels, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
};
const frames = [];
for (const size of [16, 24, 32, 48, 64, 128, 256]) frames.push({ size, png: await resizeIcon(size) });
const header = Buffer.alloc(6 + frames.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
let offset = header.length;
for (const [index, frame] of frames.entries()) {
  const start = 6 + index * 16;
  header[start] = frame.size === 256 ? 0 : frame.size; header[start + 1] = header[start];
  header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(frame.png.length, start + 8); header.writeUInt32LE(offset, start + 12);
  offset += frame.png.length;
}
const ico = Buffer.concat([header, ...frames.map((frame) => frame.png)]);
await writeFile(join(root, "public/favicon.ico"), ico);
for (const size of [192, 512]) await writeFile(join(root, `public/favicon-${size}.png`), await resizeIcon(size));
await writeFile(join(root, "public/apple-touch-icon.png"), await resizeIcon(180));
const manifest = { faviconVersion: createHash("sha256").update(ico).digest("hex").slice(0, 12), assets };
await writeFile(join(root, "src/data/artwork-assets.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(join(source, "manifest.json"), JSON.stringify({ ...manifest, outfits, expressions, catPoses: ["sit", "sleep", "stretch", "groom", "walk", "roll"] }, null, 2) + "\n");
console.log(JSON.stringify({ assets: Object.keys(assets).length, faviconVersion: manifest.faviconVersion, icoSizes: frames.map((frame) => frame.size) }));
