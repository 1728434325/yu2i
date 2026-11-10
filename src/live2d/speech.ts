/**
 * 气泡台词控制：逐字出现、自动消失、冷却时间。
 */
export interface SpeechOptions {
  bubble: HTMLElement;
  typeSpeedMs?: number;
  holdMs?: number;
  cooldownMs?: number;
}

export class Speech {
  private bubble: HTMLElement;
  private typeSpeed: number;
  private hold: number;
  private cooldown: number;
  private timer = 0;
  private typer = 0;
  private lastAt = 0;
  private visible = false;

  constructor(opts: SpeechOptions) {
    this.bubble = opts.bubble;
    this.typeSpeed = opts.typeSpeedMs ?? 34;
    this.hold = opts.holdMs ?? 2800;
    this.cooldown = opts.cooldownMs ?? 4000;
  }

  say(text: string, force = false): void {
    const now = performance.now();
    if (!force && now - this.lastAt < this.cooldown) return;
    this.lastAt = now;
    this.visible = true;
    clearTimeout(this.timer);
    clearInterval(this.typer);
    this.bubble.textContent = "";
    this.bubble.classList.add("is-on");
    this.bubble.setAttribute("aria-hidden", "false");
    let i = 0;
    this.typer = window.setInterval(() => {
      i += 1;
      this.bubble.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(this.typer);
        this.typer = 0;
      }
    }, this.typeSpeed);
    this.timer = window.setTimeout(() => this.hide(), this.hold + text.length * this.typeSpeed);
  }

  hide(): void {
    this.visible = false;
    this.bubble.classList.remove("is-on");
    this.bubble.setAttribute("aria-hidden", "true");
  }

  get isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    clearTimeout(this.timer);
    clearInterval(this.typer);
    this.hide();
  }
}
