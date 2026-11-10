export interface Live2DConfig {
  enabled: boolean;
  /** 留空表示没有可用模型：组件走静态回退，不创建 WebGL 上下文 */
  modelPath: string;
  corePath: string;
  position: "bottom-left" | "bottom-right";
  desktopScale: number;
  mobileScale: number;
  offsetX: number;
  offsetY: number;
  desktopWidth: number;
  mobileWidth: number;
  enableMouseTracking: boolean;
  enableClickInteraction: boolean;
  enableSpeech: boolean;
  enableIdleAnimation: boolean;
  mobileEnabled: boolean;
  respectReducedMotion: boolean;
  idleAfterMs: number;
  speechCooldownMs: number;
}

export const live2dConfig: Live2DConfig = {
  enabled: true,
  // 放模型时改成 "/live2d/models/hiyori/hiyori.model3.json"
  modelPath: "",
  corePath: "/live2d/core/live2dcubismcore.min.js",
  position: "bottom-left",
  desktopScale: 1,
  mobileScale: 0.7,
  offsetX: 0,
  offsetY: 0,
  desktopWidth: 240,
  mobileWidth: 200,
  enableMouseTracking: true,
  enableClickInteraction: true,
  enableSpeech: true,
  enableIdleAnimation: true,
  mobileEnabled: false,
  respectReducedMotion: true,
  idleAfterMs: 60_000,
  speechCooldownMs: 4_000,
};
