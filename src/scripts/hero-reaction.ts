export {};
interface Reaction { sprite: string; width: number; height: number; frames: number; delays: number[]; duration: number }
const sheets = new Map<string, Promise<HTMLImageElement>>();
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let dispose: (() => void) | undefined;

function loadSheet(src: string): Promise<HTMLImageElement> {
  const cached = sheets.get(src);
  if (cached) return cached;
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  const pending = image.decode().then(() => image).catch((error) => { sheets.delete(src); throw error; });
  sheets.set(src, pending);
  return pending;
}

function mount() {
  dispose?.();
  const button = document.querySelector<HTMLButtonElement>("[data-hero-reaction]");
  if (!button) { dispose = undefined; return; }
  const controller = new AbortController();
  const { signal } = controller;
  const canvas = button.querySelector<HTMLCanvasElement>("canvas")!;
  const ctx = canvas.getContext("2d");
  const feedback = button.parentElement!.querySelector<HTMLElement>(".hero-reaction-feedback")!;
  const day: Reaction = JSON.parse(button.dataset.reactionDay!);
  const night: Reaction = JSON.parse(button.dataset.reactionNight!);
  let dark = document.documentElement.classList.contains("dark");
  let request = 0;
  let frame = 0;
  let hold = 0;
  const stop = () => {
    request++;
    cancelAnimationFrame(frame);
    clearTimeout(hold);
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    button.dataset.playing = "false";
    button.dataset.reactionFrame = "0";
    button.removeAttribute("aria-busy");
  };
  const describe = () => {
    const name = dark ? "黑羽川" : "羽川翼";
    button.setAttribute("aria-label", reduced.matches ? `显示${name}的反击表情` : `播放${name}的反击表情`);
    button.title = reduced.matches ? "减少动态效果：点击显示反击表情" : `点一下，看看${name}的反应`;
  };
  button.addEventListener("click", async () => {
    stop();
    feedback.textContent = "";
    if (!ctx) return;
    const token = request;
    const spec = dark ? night : day;
    button.setAttribute("aria-busy", "true");
    try {
      const sheet = await loadSheet(spec.sprite);
      if (token !== request || signal.aborted || document.hidden) return;
      let painted = -1;
      const paint = (index: number) => {
        if (index === painted) return;
        painted = index;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sheet, 0, index * spec.height, spec.width, spec.height, 0, 0, canvas.width, canvas.height);
        button.dataset.reactionFrame = String(index);
      };
      paint(reduced.matches ? spec.frames - 1 : 0);
      button.dataset.playing = "true";
      button.removeAttribute("aria-busy");
      if (reduced.matches) { hold = window.setTimeout(stop, spec.duration); return; }
      const start = performance.now();
      const draw = (now: number) => {
        if (signal.aborted || token !== request) return;
        const elapsed = now - start;
        if (elapsed >= spec.duration) { stop(); return; }
        let boundary = 0;
        for (let index = 0; index < spec.frames; index++) {
          boundary += spec.delays[index];
          if (elapsed < boundary) { paint(index); break; }
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    } catch {
      if (token !== request || signal.aborted) return;
      stop();
      feedback.textContent = "表情暂时没有加载好，再点一次试试。";
    }
  }, { signal });
  const theme = new MutationObserver(() => {
    const next = document.documentElement.classList.contains("dark");
    if (next === dark) return;
    dark = next;
    stop();
    describe();
  });
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const view = new IntersectionObserver((entries) => { if (entries.every((entry) => !entry.isIntersecting)) stop(); }, { threshold: .05 });
  view.observe(button);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); }, { signal });
  reduced.addEventListener("change", () => { stop(); describe(); }, { signal });
  describe();
  dispose = () => { controller.abort(); stop(); theme.disconnect(); view.disconnect(); };
}

document.addEventListener("astro:page-load", mount);
document.addEventListener("astro:before-swap", () => dispose?.());
mount();
