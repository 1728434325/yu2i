import manifest from "./reading-art-assets.json";
import type { PairedArt } from "./artwork";
export type ReadingPose = "lean" | "rest";
export const readingArt = (pose: ReadingPose): PairedArt => ({
  day: manifest.assets[`day-${pose}`],
  night: manifest.assets[`night-${pose}`],
});
