import type { Live2DConfig } from "../config/live2d";

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
    PIXI?: unknown;
  }
}

export interface Renderer {
  app: any;
  model: any;
  layout: () => void;
  destroy: () => void;
  bounds: () => { x: number; y: number; w: number; h: number };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function ensureCubismCore(corePath: string): Promise<void> {
  if (window.Live2DCubismCore) return;
  await loadScript(corePath);
  if (!window.Live2DCubismCore) throw new Error("Cubism Core not available after load");
  // 官方 Core 需要在全局暴露，pixi-live2d-display 通过 window.Live2DCubismCore 读取
}

export async function createRenderer(
  canvas: HTMLCanvasElement,
  cfg: Live2DConfig,
  scale: number,
  width: number
): Promise<Renderer> {
  if (!cfg.modelPath) throw new Error("live2d.modelPath is empty");
  await ensureCubismCore(cfg.corePath);

  const PIXI = await import("pixi.js");
  // CSP 下 Pixi 6 的 shader 生成会用 new Function；用官方 shim 换成不依赖 eval 的实现
  const { install } = await import("@pixi/unsafe-eval");
  install(PIXI as unknown as Parameters<typeof install>[0]);
  const { Live2DModel } = await import("pixi-live2d-display/cubism4");
  Live2DModel.registerTicker(PIXI.Ticker);

  const height = Math.round(width * 1.35);
  canvas.width = 0; // 让 PIXI 自己按 resolution 设置
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const app = new PIXI.Application({
    view: canvas,
    width,
    height,
    backgroundAlpha: 0, // 透明背景：不填任何颜色
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: "low-power",
  });

  const model = await Live2DModel.from(cfg.modelPath, { autoInteract: false, autoUpdate: true });
  model.anchor.set(0, 1);
  app.stage.addChild(model);

  let lastScale = scale;

  const layout = () => {
    const w = canvas.clientWidth || width;
    const h = canvas.clientHeight || height;
    app.renderer.resize(w, h);
    model.scale.set(1);
    const fit = Math.min((w * 0.94) / (model.width || 1), (h * 0.94) / (model.height || 1));
    const s = fit * lastScale;
    model.scale.set(s);
    model.position.set(cfg.offsetX, h - cfg.offsetY);
  };
  layout();

  return {
    app,
    model,
    layout: () => layout(),
    bounds: () => {
      const b = model.getBounds();
      const baseY = canvas.clientHeight - cfg.offsetY;
      return {
        x: Math.max(0, b.x),
        y: Math.max(0, baseY - model.height),
        w: Math.min(canvas.clientWidth, model.width),
        h: Math.min(canvas.clientHeight, model.height),
      };
    },
    destroy: () => {
      try {
        app.destroy(false, { children: true, texture: true, baseTexture: true });
      } catch {
        /* 渲染上下文可能已丢失 */
      }
    },
  };
}
