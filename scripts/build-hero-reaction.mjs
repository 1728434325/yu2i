import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let packageRoot = join(root, "node_modules/sharp");
try { await access(join(packageRoot, "package.json")); } catch {
  const store = join(root, "node_modules/.pnpm");
  const name = (await readdir(store)).find((entry) => entry.startsWith("sharp@"));
  if (!name) throw new Error("Run pnpm install first.");
  packageRoot = join(store, name, "node_modules/sharp");
}
const pkg = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const { default: sharp } = await import(pathToFileURL(resolve(packageRoot, pkg.main)).href);
const files = await readdir(join(root, "tmp"));
const sources = {
  day: files.find((file) => file.startsWith("羽川翼六格 bonk") && file.endsWith(".gif")),
  night: files.find((file) => file.startsWith("ChatGPT GIF ") && file.endsWith("-1.gif")),
};
const directory = join(root, "public/images/hanekawa/reaction");
await mkdir(directory, { recursive: true });
const forms = {};
for (const form of ["day", "night"]) {
  if (!sources[form]) throw new Error(`Missing ${form} reaction GIF`);
  const file = join(root, "tmp", sources[form]);
  const metadata = await sharp(file, { animated: true }).metadata();
  const frames = metadata.pages ?? 1;
  const size = 192;
  const { data, info } = await sharp(file, { animated: true }).resize(size, size).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== size || info.height !== size * frames || info.channels !== 4) throw new Error(`Invalid ${form} frame strip`);
  const sprite = join(directory, `${form}-frames.webp`);
  const poster = join(directory, `${form}-poster.webp`);
  await sharp(data, { raw: { width: size, height: size * frames, channels: 4 } }).webp({ quality: 91, alphaQuality: 100, effort: 5 }).toFile(sprite);
  await sharp(data, { raw: { width: size, height: size * frames, channels: 4 } }).extract({ left: 0, top: 0, width: size, height: size }).webp({ quality: 91, alphaQuality: 100, effort: 5 }).toFile(poster);
  const version = createHash("sha256").update(await readFile(sprite)).digest("hex").slice(0, 10);
  const delays = Array.from({ length: frames }, (_, index) => Math.max(20, metadata.delay?.[index] || 100));
  const origin = { source: `tmp/${sources[form]}`, operation: "Decode supplied GIF frames without redrawing; export alpha frame strip and static first-frame poster", sha256: createHash("sha256").update(await readFile(file)).digest("hex") };
  for (const asset of [sprite, poster]) await writeFile(`${asset}.json`, JSON.stringify(origin, null, 2) + "\n");
  forms[form] = { sprite: `/images/hanekawa/reaction/${form}-frames.webp?v=${version}`, poster: `/images/hanekawa/reaction/${form}-poster.webp?v=${version}`, width: size, height: size, frames, delays, duration: delays.reduce((total, delay) => total + delay, 0), source: origin.source, sha256: origin.sha256 };
  const tiles = Array.from({ length: frames }, (_, index) => ({ input: data.subarray(index * size * size * 4, (index + 1) * size * size * 4), raw: { width: size, height: size, channels: 4 }, left: index * size, top: 0 }));
  await sharp({ create: { width: size * frames, height: size, channels: 4, background: "#f2eadb" } }).composite(tiles).png().toFile(join(root, `logs/hero-click/${form}-frames.png`));
}
await writeFile(join(root, "src/data/hero-reaction-assets.json"), JSON.stringify(forms, null, 2) + "\n");
console.log(JSON.stringify(forms, null, 2));
