import manifest from "./artwork-assets.json";

export interface ArtAsset { src: string; width: number; height: number; poster?: string }
export interface PairedArt { day: ArtAsset; night: ArtAsset }
export type Expression = "smile" | "shy" | "confident" | "focused" | "curious" | "cry";
export type Outfit = "formal" | "school" | "summer" | "martial" | "kimono" | "casual";
export type CatPose = "sit" | "sleep" | "stretch" | "groom" | "walk" | "roll";
const assets: Record<string, ArtAsset> = manifest.assets;
const get = (name: string): ArtAsset => {
  const art = assets[name];
  if (!art) throw new Error(`Missing artwork: ${name}`);
  return art;
};
export const faviconVersion = manifest.faviconVersion;
export const expressionArt = (name: Expression): PairedArt => ({ day: get(`head-day-${name}`), night: get(`head-night-${name}`) });
export const outfitArt = (name: Outfit): PairedArt => ({ day: get(`body-day-${name}`), night: get(`body-night-${name}`) });
export const catArt = (day: CatPose, night: CatPose = day): PairedArt => ({ day: get(`cat-${day}`), night: get(`cat-${night}`) });
export const avatarArt: PairedArt = { day: get("avatar-day"), night: get("avatar-night") };
export function footerOutfits(path: string): Outfit[] {
  if (path === "/") return ["school", "casual"];
  if (path === "/about/") return ["kimono", "summer"];
  if (path === "/archive/") return ["martial"];
  if (path.startsWith("/posts/")) return ["formal"];
  if (path.startsWith("/friends/")) return ["casual"];
  if (path.startsWith("/projects/")) return ["school"];
  return ["kimono"];
}
export function dividerCats(path: string): PairedArt {
  if (path === "/") return catArt("walk", "groom");
  if (path === "/about/") return catArt("sleep", "roll");
  if (path === "/archive/") return catArt("stretch", "sleep");
  if (path.startsWith("/posts/")) return catArt("sit", "stretch");
  return catArt("roll", "groom");
}
export function pageExpression(path: string): Expression {
  if (path.startsWith("/archive/") || path.startsWith("/projects/")) return "confident";
  if (path.startsWith("/posts/") || path.startsWith("/search/")) return "curious";
  if (path.startsWith("/friends/")) return "shy";
  if (path.startsWith("/lab/")) return "focused";
  return "smile";
}
