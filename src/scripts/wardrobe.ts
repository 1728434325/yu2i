export {};

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let rememberedOutfit = "school";
let wantsAutoplay = true;
let dispose: (() => void) | undefined;

function mount() {
  dispose?.();
  const controller = new AbortController();
  const { signal } = controller;
  const readers = [...document.querySelectorAll<HTMLElement>(".rail-companion")];
  const visibleReaders = new Set<HTMLElement>();
  const updateReaders = () => {
    for (const reader of readers) reader.dataset.inView = String(visibleReaders.has(reader) && !document.hidden && !reduced.matches);
  };
  const readerObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleReaders.add(entry.target as HTMLElement);
      else visibleReaders.delete(entry.target as HTMLElement);
    }
    updateReaders();
  }, { threshold: .15 });
  readers.forEach((reader) => readerObserver.observe(reader));
  document.addEventListener("visibilitychange", updateReaders, { signal });
  reduced.addEventListener("change", updateReaders, { signal });

  let timer = 0;
  let cutTimer = 0;
  let request = 0;
  let viewObserver: IntersectionObserver | undefined;
  let themeObserver: MutationObserver | undefined;
  const animations = new Set<Animation>();
  dispose = () => {
    controller.abort();
    request++;
    clearTimeout(timer);
    clearTimeout(cutTimer);
    animations.forEach((animation) => animation.cancel());
    readerObserver.disconnect();
    viewObserver?.disconnect();
    themeObserver?.disconnect();
  };

  const root = document.querySelector<HTMLElement>("[data-wardrobe]");
  if (!root) return;
  const stage = root.querySelector<HTMLElement>(".wardrobe-stage")!;
  const options = [...root.querySelectorAll<HTMLButtonElement>("[data-outfit]")];
  const panels = [...root.querySelectorAll<HTMLElement>("[data-outfit-panel]")];
  const title = root.querySelector<HTMLElement>("[data-outfit-title]")!;
  const number = root.querySelector<HTMLElement>("[data-outfit-number]")!;
  const note = root.querySelector<HTMLElement>("[data-outfit-note]")!;
  const feedback = root.querySelector<HTMLElement>("[data-wardrobe-feedback]")!;
  const auto = root.querySelector<HTMLButtonElement>("[data-wardrobe-auto]")!;
  const autoLabel = root.querySelector<HTMLElement>("[data-wardrobe-auto-label]")!;
  let selected = Math.max(0, options.findIndex((option) => option.dataset.outfit === rememberedOutfit));
  let visible = false;
  let hovered = false;
  let focused = false;
  const canPlay = () => visible && !hovered && !focused && !document.hidden && !reduced.matches && wantsAutoplay;

  const updateControls = () => {
    const current = options[selected];
    root.dataset.currentOutfit = current.dataset.outfit;
    title.textContent = current.dataset.title!;
    note.textContent = current.dataset.note!;
    number.textContent = String(selected + 1).padStart(2, "0");
    options.forEach((option, index) => option.setAttribute("aria-pressed", String(index === selected)));
    const form = document.documentElement.classList.contains("dark") ? "黑羽川" : "羽川翼";
    stage.setAttribute("aria-label", `${form}，${current.dataset.title}`);
    const autoplay = wantsAutoplay && !reduced.matches;
    root.dataset.autoplay = String(autoplay);
    auto.setAttribute("aria-pressed", String(autoplay));
    auto.disabled = reduced.matches;
    auto.title = reduced.matches ? "已跟随系统的减少动态效果设置，可以手动选择衣装" : "";
    autoLabel.textContent = reduced.matches ? "手动换装" : autoplay ? "暂停换装" : "自动换装";
  };
  const schedule = () => {
    clearTimeout(timer);
    if (canPlay()) timer = window.setTimeout(() => void change(selected + 1, false), 8000);
  };
  const scan = () => {
    if (reduced.matches || !visible || document.hidden) return;
    clearTimeout(cutTimer);
    stage.classList.remove("is-changing");
    // Flush the previous cut so rapid manual selections can start a new one.
    void stage.offsetWidth;
    stage.classList.add("is-changing");
    cutTimer = window.setTimeout(() => stage.classList.remove("is-changing"), 450);
  };
  const animate = (element: HTMLElement, frames: Keyframe[], duration: number) => {
    const animation = element.animate(frames, { duration, easing: "cubic-bezier(.16,1,.3,1)" });
    animations.add(animation);
    void animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  };
  const change = async (value: number, manual = true) => {
    clearTimeout(timer);
    const target = (value + options.length) % options.length;
    const token = ++request;
    if (target === selected) { stage.removeAttribute("aria-busy"); schedule(); return; }
    const form = document.documentElement.classList.contains("dark") ? "night" : "day";
    const image = panels[target].querySelector<HTMLImageElement>(`.theme-art--${form} img`)!;
    stage.setAttribute("aria-busy", "true");
    try {
      // Lazy images are promoted only when needed for an explicit selection.
      image.loading = "eager";
      await image.decode();
    } catch {
      if (token === request && !signal.aborted) {
        stage.removeAttribute("aria-busy");
        feedback.textContent = "这套衣装暂时没有加载好，可以再选一次。";
        schedule();
      }
      return;
    }
    if (token !== request || signal.aborted) return;
    animations.forEach((animation) => animation.cancel());
    const previous = selected;
    selected = target;
    rememberedOutfit = options[selected].dataset.outfit!;
    panels.forEach((panel, index) => panel.dataset.active = String(index === selected));
    updateControls();
    stage.removeAttribute("aria-busy");
    feedback.textContent = manual ? `换上${options[selected].dataset.title}了。` : "";
    if (!reduced.matches && visible && !document.hidden) {
      animate(panels[previous], [{ opacity: 1 }, { opacity: 0 }], 130);
      animate(panels[selected], [{ opacity: .25, clipPath: "inset(0 0 100% 0)" }, { opacity: 1, clipPath: "inset(0)" }], 420);
      scan();
    }
    schedule();
  };
  options.forEach((option, index) => option.addEventListener("click", () => void change(index), { signal }));
  root.querySelector("[data-wardrobe-prev]")?.addEventListener("click", () => void change(selected - 1), { signal });
  root.querySelector("[data-wardrobe-next]")?.addEventListener("click", () => void change(selected + 1), { signal });
  auto.addEventListener("click", () => {
    wantsAutoplay = !wantsAutoplay;
    updateControls();
    feedback.textContent = wantsAutoplay ? "自动换装已开启。" : "自动换装已暂停。";
    schedule();
  }, { signal });
  root.querySelector(".wardrobe-options")?.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
    event.preventDefault();
    const index = key === "Home" ? 0 : key === "End" ? options.length - 1 : (current + (key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    options[index].focus();
    void change(index);
  }, { signal });
  for (const area of [stage, root.querySelector<HTMLElement>(".wardrobe-options")!]) {
    area.addEventListener("pointerenter", (event) => { if (event.pointerType !== "touch") { hovered = true; schedule(); } }, { signal });
    area.addEventListener("pointerleave", () => { hovered = false; schedule(); }, { signal });
  }
  root.addEventListener("focusin", (event) => { focused = !(event.target as Element).closest("[data-wardrobe-auto]"); schedule(); }, { signal });
  root.addEventListener("focusout", (event) => {
    const next = event.relatedTarget as Element | null;
    focused = !!next && root.contains(next) && !next.closest("[data-wardrobe-auto]");
    schedule();
  }, { signal });
  document.addEventListener("visibilitychange", schedule, { signal });
  reduced.addEventListener("change", () => {
    animations.forEach((animation) => animation.cancel());
    stage.classList.remove("is-changing");
    updateControls();
    schedule();
  }, { signal });
  viewObserver = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    root.dataset.inView = String(visible);
    schedule();
  }, { threshold: .4 });
  viewObserver.observe(stage);
  let dark = document.documentElement.classList.contains("dark");
  themeObserver = new MutationObserver(() => {
    const next = document.documentElement.classList.contains("dark");
    if (next === dark) return;
    dark = next;
    updateControls();
    scan();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  panels.forEach((panel, index) => panel.dataset.active = String(index === selected));
  updateControls();
  root.dataset.ready = "true";
}

document.addEventListener("astro:page-load", mount);
document.addEventListener("astro:before-swap", () => dispose?.());
mount();
