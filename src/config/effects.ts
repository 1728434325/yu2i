export interface EffectsConfig {
  sakura: { enabled: boolean; count: number; speed: number };
  stars: { enabled: boolean; count: number };
  cursor: { enabled: boolean; glow: boolean; trail: boolean; maxTrail: number };
  scroll: { reveal: boolean; progress: boolean; magnetic: boolean };
  quality: "auto" | "high" | "medium" | "low" | "off";
}

export const effectsConfig: EffectsConfig = {
  sakura: { enabled: true, count: 18, speed: 0.55 },
  stars: { enabled: true, count: 320 },
  cursor: { enabled: true, glow: true, trail: true, maxTrail: 18 },
  scroll: { reveal: true, progress: true, magnetic: true },
  quality: "auto",
};
