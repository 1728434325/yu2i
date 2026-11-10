export interface EffectsConfig {
  sakura: { enabled: boolean; count: number; speed: number };
  stars: { enabled: boolean; count: number };
  cursor: { enabled: boolean; glow: boolean; trail: boolean; maxTrail: number };
  scroll: { reveal: boolean; progress: boolean; magnetic: boolean };
  three: { enabled: boolean; stars: number; planet: boolean; ring: boolean };
  live2d: { enabled: boolean; dialog: boolean };
  quality: "auto" | "high" | "medium" | "low" | "off";
}

export const effectsConfig: EffectsConfig = {
  sakura: { enabled: true, count: 18, speed: 0.55 },
  stars: { enabled: true, count: 320 },
  cursor: { enabled: true, glow: true, trail: true, maxTrail: 18 },
  scroll: { reveal: true, progress: true, magnetic: true },
  three: { enabled: true, stars: 6000, planet: true, ring: true },
  live2d: { enabled: true, dialog: true },
  quality: "auto",
};
