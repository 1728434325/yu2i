import type { Live2DConfig } from "../config/live2d";
import { createRenderer, type Renderer } from "./renderer";
import { Speech } from "./speech";
import { greetingForHour, speechLines } from "./lines";

export interface WidgetElements {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  hit: HTMLElement;
  bubble: HTMLElement;
}

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? "";
}

export class Live2DController {
  private cfg: Live2DConfig;
  private el: WidgetElements;
  private renderer: Renderer | null = null;
  private speech: Speech | null = null;
  private idleTimer = 0;
  private cooldownUntil = 0;
  private pointerRaf = 0;
  private removed = false;
  private readonly cleanups: Array<() => void> = [];

  constructor(cfg: Live2DConfig, el: WidgetElements) {
    this.cfg = cfg;
    this.el = el;
  }

  async init(): Promise<void> {
    const reduced = this.cfg.respectReducedMotion && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = matchMedia("(max-width: 1023px)").matches;
    if (!this.cfg.enabled) return;
    if (mobile && !this.cfg.mobileEnabled) return;

    this.speech = this.cfg.enableSpeech
      ? new Speech({
          bubble: this.el.bubble,
          cooldownMs: this.cfg.speechCooldownMs,
          typeSpeedMs: reduced ? 0 : 34,
        })
      : null;

    this.bindInteractions();

    if (!this.cfg.modelPath) {
      // 没有模型：组件保持静态回退，不创建 WebGL 上下文
      this.el.root.dataset.mode = "fallback";
      this.say(pick(speechLines.welcome), true);
      return;
    }

    try {
      const scale = mobile ? this.cfg.mobileScale : this.cfg.desktopScale;
      const width = mobile ? this.cfg.mobileWidth : this.cfg.desktopWidth;
      this.renderer = await createRenderer(this.el.canvas, this.cfg, scale, width);
      this.el.root.dataset.mode = "live2d";
      this.el.canvas.classList.add("is-ready");
      this.updateHitArea();

      const onResize = () => {
        this.renderer?.layout();
        this.updateHitArea();
      };
      addEventListener("resize", onResize, { passive: true });
      this.cleanups.push(() => removeEventListener("resize", onResize));

      if (this.cfg.enableMouseTracking) this.bindMouseTracking();
      this.say(pick(greetingForHour(new Date().getHours())), true);

      const onHidden = () => {
        if (!this.renderer) return;
        if (document.hidden) this.renderer.app.ticker.stop();
        else this.renderer.app.ticker.start();
      };
      document.addEventListener("visibilitychange", onHidden);
      this.cleanups.push(() => document.removeEventListener("visibilitychange", onHidden));
    } catch (err) {
      // 模型加载失败不影响博客：保留静态回退并把错误留在控制台
      console.warn("[live2d] model load failed, fallback to static:", (err as Error)?.stack ?? err);
      this.el.root.dataset.mode = "fallback";
    }
  }

  private say(text: string, force = false): void {
    this.speech?.say(text, force);
  }

  private resetIdle(): void {
    clearTimeout(this.idleTimer);
    if (!this.cfg.enableIdleAnimation) return;
    this.idleTimer = window.setTimeout(() => {
      this.say(pick(speechLines.idle), true);
    }, this.cfg.idleAfterMs);
  }

  private interact(event: "click" | "hover"): void {
    const now = Date.now();
    if (now < this.cooldownUntil) return;
    this.cooldownUntil = now + (event === "hover" ? 6000 : 1200);
    this.resetIdle();
    if (!this.cfg.enableClickInteraction && event === "click") return;
    this.say(pick(event === "click" ? speechLines.click : speechLines.hover));
    if (event === "click" && this.renderer && this.cfg.enableIdleAnimation) {
      const model = this.renderer.model;
      try {
        model.motion?.("TapBody", 0);
      } catch {
        /* 模型没有该动作：降级 */
      }
    }
    if (this.renderer) {
      this.renderer.app.stage.rotation.z = 0.01;
      setTimeout(() => {
        if (this.renderer) this.renderer.app.stage.rotation.z = 0;
      }, 220);
    }
  }

  private bindInteractions(): void {
    const onClick = (e: Event) => {
      e.preventDefault();
      this.interact("click");
    };
    const onEnter = () => this.interact("hover");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.hide();
    };
    this.el.hit.addEventListener("click", onClick);
    this.el.hit.addEventListener("pointerenter", onEnter);
    document.addEventListener("keydown", onKey);
    this.cleanups.push(() => {
      this.el.hit.removeEventListener("click", onClick);
      this.el.hit.removeEventListener("pointerenter", onEnter);
      document.removeEventListener("keydown", onKey);
    });

    const onPage = () => {
      const path = location.pathname;
      if (path.startsWith("/posts/") && path !== "/posts/") this.say(pick(speechLines.article));
      else this.say(pick(speechLines.page));
      this.resetIdle();
    };
    document.addEventListener("astro:page-load", onPage);
    this.cleanups.push(() => document.removeEventListener("astro:page-load", onPage));
    this.resetIdle();
  }

  private bindMouseTracking(): void {
    const onMove = (e: PointerEvent) => {
      if (!this.renderer || this.pointerRaf) return;
      const x = e.clientX;
      const y = e.clientY;
      this.pointerRaf = requestAnimationFrame(() => {
        this.pointerRaf = 0;
        const r = this.el.canvas.getBoundingClientRect();
        const nx = ((x - r.left) / r.width) * 2 - 1;
        const ny = ((y - r.top) / r.height) * 2 - 1;
        const model = this.renderer?.model;
        try {
          model?.focus?.(nx, ny);
        } catch {
          /* 该模型不支持视线跟随：降级 */
        }
      });
    };
    addEventListener("pointermove", onMove, { passive: true });
    this.cleanups.push(() => {
      removeEventListener("pointermove", onMove);
      if (this.pointerRaf) cancelAnimationFrame(this.pointerRaf);
    });
  }

  private updateHitArea(): void {
    if (!this.renderer) return;
    const b = this.renderer.bounds();
    const r = this.el.canvas.getBoundingClientRect();
    const host = this.el.hit;
    host.style.left = `${b.x}px`;
    host.style.top = `${b.y}px`;
    host.style.width = `${Math.max(80, Math.round(b.w))}px`;
    host.style.height = `${Math.max(120, Math.round(b.h))}px`;
    host.style.display = r.width ? "block" : "none";
  }

  hide(): void {
    this.el.root.classList.add("is-hidden");
    try {
      localStorage.setItem("yu2i-live2d-hidden", "1");
    } catch {
      /* 隐私模式下忽略 */
    }
  }

  show(): void {
    this.el.root.classList.remove("is-hidden");
    try {
      localStorage.setItem("yu2i-live2d-hidden", "0");
    } catch {
      /* 忽略 */
    }
  }

  destroy(): void {
    if (this.removed) return;
    this.removed = true;
    clearTimeout(this.idleTimer);
    for (const fn of this.cleanups) fn();
    this.speech?.dispose();
    this.renderer?.destroy();
    this.renderer = null;
  }
}

/** 单例：ClientRouter 切页时复用，不重复创建 */
let controller: Live2DController | null = null;

export function mountLive2D(cfg: Live2DConfig, el: WidgetElements): Live2DController | null {
  if (controller) return controller;
  controller = new Live2DController(cfg, el);
  void controller.init();
  return controller;
}

export function getLive2DController(): Live2DController | null {
  return controller;
}
