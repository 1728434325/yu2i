export {};
type Action = "idle" | "walk" | "wave" | "jump" | "read" | "think" | "stretch" | "sleep";
type Facing = "right" | "left" | "up" | "down";
type Form = "light" | "dark";
type Point = { x: number; y: number };
type Particle = Point & { kind: "dust" | "paw" | "page" | "spark" | "energy" | "slash" | "sleep"; vx: number; vy: number; life: number; max: number };
const state = { x: -1, y: -1, target: null as Point | null, action: "walk" as Action, facing: "left" as Facing, elapsed: 0, duration: 0, paused: false, userPaused: false, hidden: false, trips: 0 };
let initialized = false;
let cleanup: (() => void) | undefined;

function mountCompanion() {
  cleanup?.();
  cleanup = undefined;
  const root = document.getElementById("pixel-companion");
  const actor = document.getElementById("pixel-actor");
  const character = document.getElementById("pixel-character");
  const canvas = document.getElementById("pixel-canvas") as HTMLCanvasElement | null;
  const fx = document.getElementById("pixel-effects") as HTMLCanvasElement | null;
  const context = canvas?.getContext("2d");
  const effects = fx?.getContext("2d");
  if (!root || !actor || !character || !canvas || !context || !fx || !effects) return;
  const controller = new AbortController();
  const { signal } = controller;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const sheets: Record<Form, HTMLImageElement> = { light: new Image(), dark: new Image() };
  const rows: Record<Exclude<Action, "walk">, number> = { idle: 0, wave: 5, jump: 6, read: 7, think: 8, stretch: 9, sleep: 10 };
  const walkRows: Record<Facing, number> = { right: 1, left: 2, up: 3, down: 4 };
  const durations: Record<Action, number> = { walk: 0, idle: 1400, wave: 1440, jump: 800, read: 4400, think: 2000, stretch: 1800, sleep: 6400 };
  const particles: Particle[] = [];
  let lastSprite = "";
  let frameRequest = 0;
  let lastTick = 0;
  let effectElapsed = 0;
  let hovered = false;
  let toolsTimer = 0;
  let suppressClickUntil = 0;
  let pageLoaded = document.readyState === "complete";
  let drag: { id: number; start: Point; origin: Point; moved: boolean } | undefined;
  let bounds = { minX: 8, minY: 8, maxX: 100, maxY: 100 };
  const form = (): Form => document.documentElement.classList.contains("dark") ? "dark" : "light";
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  if (!initialized) { state.paused = motion.matches; initialized = true; }

  const updateControls = () => {
    root.dataset.action = state.action;
    root.dataset.paused = String(state.paused);
    root.dataset.hidden = String(state.hidden);
    root.dataset.dragging = String(Boolean(drag));
    document.querySelectorAll<HTMLButtonElement>("[data-pixel-pause]").forEach((button) => {
      button.setAttribute("aria-pressed", String(state.paused));
      button.setAttribute("aria-label", state.paused ? "继续小羽川的动作" : "暂停小羽川");
      const label = button.querySelector("[data-pause-label]");
      if (label) label.textContent = state.paused ? "继续" : "暂停";
    });
    document.querySelectorAll<HTMLButtonElement>(".pixel-action[data-pixel-action]").forEach((button) => {
      if (button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", String(!state.paused && !state.hidden && button.dataset.pixelAction === state.action));
    });
    const visibility = document.querySelector("[data-pixel-visibility]");
    if (visibility) visibility.textContent = state.hidden ? "叫回小羽川" : "收起小羽川";
    const labels = form() === "dark" ? { read: "理理毛", think: "拍猫爪" } : { read: "翻翻书", think: "推眼镜" };
    for (const [action, label] of Object.entries(labels)) {
      const span = document.querySelector(`[data-pixel-form-label="${action}"]`);
      if (span) span.textContent = label;
    }
    const status = document.getElementById("pixel-status");
    const messages: Record<Action, string> = {
      walk: "她在屏幕里散步，拖一拖就能换个位置。", idle: "停下来想一会儿。", wave: "嗨，你来啦！", jump: "轻轻跳一下，再出发。",
      read: form() === "dark" ? "猫咪也要整理一下自己。" : "这一页，好像很有意思。", think: form() === "dark" ? "喵，接住这一爪。" : "让我想一想。", stretch: "伸个懒腰，继续逛逛。", sleep: "借这里，打一个小小的盹。",
    };
    if (status) status.textContent = state.hidden ? "休息去了，叫她回来就好。" : state.paused ? "休息一下，点继续就回来。" : messages[state.action];
  };

  const render = () => {
    const selected = form();
    const sheet = sheets[selected];
    root.hidden = !pageLoaded || !sheet.complete || sheet.naturalWidth === 0;
    const action = drag ? "jump" : state.action;
    const row = action === "walk" ? walkRows[state.facing] : rows[action];
    const blink = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0];
    const column = drag ? 1 : action === "idle" ? blink[Math.floor(state.elapsed / 180) % blink.length]
      : action === "sleep" && state.elapsed > 1400 ? 3 : Math.floor(state.elapsed / (action === "walk" ? 130 : action === "read" ? 300 : 200)) % 4;
    const lift = drag ? 6 : action === "jump" ? Math.sin(Math.min(1, state.elapsed / state.duration) * Math.PI) * 24 : 0;
    actor.style.transform = `translate3d(${Math.round(state.x)}px,${Math.round(Math.max(bounds.minY, state.y - lift))}px,0)`;
    root.dataset.nearTop = String(state.y < 65);
    root.dataset.facing = state.facing;
    root.dataset.form = selected;
    const key = `${selected}:${row}:${column}`;
    if (!sheet.complete || !sheet.naturalWidth || key === lastSprite) return;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, 64, 64);
    // Each direction has its own drawn head, hair and body; never mirror a front pose.
    context.drawImage(sheet, column * 64, row * 64, 64, 64, 0, 0, 64, 64);
    lastSprite = key;
    character.dataset.ready = "true";
    root.dataset.frame = `${row}:${column}`;
  };

  const add = (kind: Particle["kind"], x: number, y: number, life: number, vx = 0, vy = 0) => {
    if (motion.matches || state.hidden || particles.length >= 36) return;
    particles.push({ kind, x, y, life, max: life, vx, vy });
  };
  const burst = () => {
    if (motion.matches || state.paused) return;
    for (let index = 0; index < 12; index++) {
      const angle = index * Math.PI / 6;
      add(form() === "dark" ? "energy" : "spark", state.x + 64 + Math.cos(angle) * 42, state.y + 64 + Math.sin(angle) * 42, 800, Math.cos(angle) * .02, Math.sin(angle) * .02);
    }
  };
  const paintEffects = (delta: number) => {
    effects.clearRect(0, 0, fx.width, fx.height);
    if (motion.matches || state.hidden) { particles.length = 0; root.dataset.effects = "0"; return; }
    const night = form() === "dark";
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      particle.life -= delta;
      if (particle.life <= 0) { particles.splice(index, 1); continue; }
      if (particle.kind === "energy") {
        particle.x += (state.x + 65 - particle.x) * Math.min(.16, delta / 450);
        particle.y += (state.y + 68 - particle.y) * Math.min(.16, delta / 450);
      } else { particle.x += particle.vx * delta; particle.y += particle.vy * delta; }
      const x = Math.round(particle.x / 3), y = Math.round(particle.y / 3);
      effects.globalAlpha = Math.min(.8, particle.life / Math.min(350, particle.max));
      effects.fillStyle = night ? "#e1bb79" : "#9e3528";
      if (particle.kind === "paw") {
        effects.globalAlpha *= .5;
        effects.fillRect(x, y + 2, 2, 2);
        effects.fillRect(x - 1, y, 1, 1); effects.fillRect(x + 1, y - 1, 1, 1); effects.fillRect(x + 3, y, 1, 1);
      } else if (particle.kind === "spark") {
        effects.fillRect(x - 1, y, 3, 1); effects.fillRect(x, y - 1, 1, 3);
      } else if (particle.kind === "page") {
        effects.fillStyle = night ? "#f1e3ce" : "#a9762e";
        effects.fillRect(x, y, 2, 3); effects.clearRect(x + 1, y + 1, 1, 1);
      } else if (particle.kind === "slash") {
        effects.fillStyle = "#f1e3ce";
        for (let claw = 0; claw < 3; claw++) for (let step = 0; step < 5; step++) effects.fillRect(x + claw * 3 + step, y + step, 1, 2);
      } else if (particle.kind === "sleep") {
        effects.fillRect(x, y, 3, 1); effects.fillRect(x + 1, y + 1, 1, 1); effects.fillRect(x, y + 2, 3, 1);
      } else effects.fillRect(x, y, 1, particle.kind === "energy" ? 2 : 1);
    }
    effects.globalAlpha = 1;
    root.dataset.effects = String(particles.length);
  };

  const selectAction = (action: Action, duration = durations[action]) => {
    state.action = action;
    state.elapsed = 0;
    state.duration = duration;
    effectElapsed = 0;
    if (action !== "walk") state.target = null;
    updateControls();
    render();
  };
  const faceTarget = (target: Point) => {
    const dx = target.x - state.x, dy = target.y - state.y;
    if (Math.abs(dx) > Math.abs(dy) * .9) state.facing = dx >= 0 ? "right" : "left";
    else state.facing = dy >= 0 ? "down" : "up";
  };
  const chooseTarget = () => {
    const width = bounds.maxX - bounds.minX;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.min(width * .6, 300) * (.6 + Math.random() * .5);
    let x = clamp(state.x + Math.cos(angle) * distance, bounds.minX, bounds.maxX);
    let y = clamp(state.y + Math.sin(angle) * distance, Math.min(85, bounds.maxY), bounds.maxY);
    if (Math.hypot(x - state.x, y - state.y) < 45 || state.trips % 4 === 3) {
      x = bounds.minX + Math.random() * width;
      y = Math.min(85, bounds.maxY) + Math.random() * Math.max(0, bounds.maxY - 85);
    }
    state.target = { x, y };
    faceTarget(state.target);
  };
  const canPlay = () => !root.hidden && !signal.aborted && !state.paused && !state.hidden && !document.hidden && !drag && !hovered;
  const tick = (now: number) => {
    frameRequest = 0;
    if (!canPlay()) return;
    if (lastTick && now - lastTick < 1000 / 30) { frameRequest = requestAnimationFrame(tick); return; }
    const delta = lastTick ? Math.min(now - lastTick, 80) : 0;
    lastTick = now;
    state.elapsed += delta;
    if (state.action === "walk") {
      if (!state.target) chooseTarget();
      const target = state.target!;
      const dx = target.x - state.x, dy = target.y - state.y;
      const distance = Math.hypot(dx, dy);
      const step = delta * (innerWidth < 600 ? .038 : .048);
      if (distance <= Math.max(2, step)) {
        state.x = target.x; state.y = target.y; state.target = null; state.trips++;
        const routine: Action[] = ["idle", "read", "wave", "stretch", "think", "sleep", "jump"];
        selectAction(routine[(state.trips - 1) % routine.length]);
      } else { state.x += dx / distance * step; state.y += dy / distance * step; }
    } else if (state.elapsed >= state.duration) {
      if (motion.matches) { state.paused = true; selectAction("idle"); }
      else { selectAction("walk"); chooseTarget(); }
    }
    effectElapsed += delta;
    const effectInterval = state.action === "walk" ? 430 : state.action === "think" ? 600 : 800;
    if (effectElapsed >= effectInterval) {
      effectElapsed = 0;
      const x = state.x + 64, y = state.y;
      if (state.action === "walk") add(form() === "dark" ? "paw" : "dust", x + (Math.floor(state.elapsed / 430) % 2 ? 5 : -5), y + 118, 1100, 0, -.002);
      if (state.action === "read") {
        if (form() === "dark") for (let i = 0; i < 4; i++) add("energy", x + Math.cos(i * 1.6) * 45, y + 62 + Math.sin(i * 1.6) * 35, 1000);
        else add("page", x + 15, y + 68, 1200, .01, -.025);
      }
      if (state.action === "think") add(form() === "dark" ? "slash" : "spark", x + 22, y + 42, 450);
      if (state.action === "sleep") add("sleep", x + 30, y + 36, 1400, .008, -.018);
      if (state.action === "stretch" || state.action === "jump") add("spark", x - 25, y + 40, 600, -.01, -.012);
    }
    render();
    paintEffects(delta);
    frameRequest = requestAnimationFrame(tick);
  };
  const startLoop = () => {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    lastTick = 0;
    render();
    if (canPlay()) frameRequest = requestAnimationFrame(tick);
  };
  const resize = () => {
    const width = visualViewport?.width ?? innerWidth, height = visualViewport?.height ?? innerHeight;
    bounds = { minX: 8, minY: 8, maxX: Math.max(8, width - 136), maxY: Math.max(8, height - 136) };
    if (state.x < 0) { state.x = Math.max(8, bounds.maxX - 32); state.y = Math.max(8, bounds.maxY - 28); }
    state.x = clamp(state.x, bounds.minX, bounds.maxX); state.y = clamp(state.y, bounds.minY, bounds.maxY);
    if (state.target) {
      state.target.x = clamp(state.target.x, bounds.minX, bounds.maxX); state.target.y = clamp(state.target.y, bounds.minY, bounds.maxY);
      faceTarget(state.target);
    }
    fx.width = Math.ceil(innerWidth / 3); fx.height = Math.ceil(innerHeight / 3);
    render(); paintEffects(0);
  };
  const showTools = () => {
    root.dataset.tools = "true";
    clearTimeout(toolsTimer);
    toolsTimer = window.setTimeout(() => { delete root.dataset.tools; }, 3000);
  };
  const play = (action: Action) => {
    state.hidden = false; state.paused = false; state.userPaused = false;
    selectAction(action);
    if (action === "walk") { state.target = null; chooseTarget(); }
    startLoop();
  };
  const setPaused = (paused: boolean) => {
    state.paused = paused; state.userPaused = paused;
    updateControls(); startLoop();
  };

  const controlsSelector = "[data-pixel-action], [data-pixel-pause], [data-pixel-hide], [data-pixel-show], [data-pixel-visibility]";
  const activateControl = (button: HTMLButtonElement) => {
    if (button.hasAttribute("data-pixel-pause")) { setPaused(!state.paused); return; }
    if (button.hasAttribute("data-pixel-hide") || button.hasAttribute("data-pixel-show") || button.hasAttribute("data-pixel-visibility")) {
      state.hidden = button.hasAttribute("data-pixel-hide") ? true : button.hasAttribute("data-pixel-show") ? false : !state.hidden;
      particles.length = 0; paintEffects(0); updateControls(); startLoop(); return;
    }
    const action = button.dataset.pixelAction;
    if (action === "come") {
      const box = document.querySelector(".pixel-controls-section")?.getBoundingClientRect();
      play("walk");
      if (box) { state.target = { x: clamp(box.right - 125, bounds.minX, bounds.maxX), y: clamp(box.top - 130, bounds.minY, bounds.maxY) }; faceTarget(state.target); }
    } else if (action && Object.hasOwn(durations, action)) play(action as Action);
  };
  let lastTouchControl: HTMLButtonElement | null = null;
  let lastTouchTime = 0;
  const touches = new Map<number, { button: HTMLButtonElement; x: number; y: number }>();
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || !event.isPrimary || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(controlsSelector);
    if (button && !button.disabled) touches.set(event.pointerId, { button, x: event.clientX, y: event.clientY });
  }, { signal });
  document.addEventListener("pointercancel", (event) => { touches.delete(event.pointerId); }, { signal });
  document.addEventListener("pointerup", (event) => {
    const touch = touches.get(event.pointerId);
    touches.delete(event.pointerId);
    if (!touch || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(controlsSelector);
    if (button !== touch.button || Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 12) return;
    // A browser may omit the compatibility click after a captured touch drag.
    // Commit a real tap on pointerup and consume its later synthetic click once.
    lastTouchControl = button;
    lastTouchTime = Date.now();
    activateControl(button);
  }, { signal });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>(controlsSelector);
    if (!button) return;
    if (button === lastTouchControl && Date.now() - lastTouchTime < 700 && event.detail !== 0) return;
    activateControl(button);
  }, { signal });

  character.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    drag = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { x: state.x, y: state.y }, moved: false };
    character.setPointerCapture(event.pointerId);
    hovered = false; particles.length = 0; paintEffects(0);
    updateControls(); startLoop();
  }, { signal });
  character.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.start.x, dy = event.clientY - drag.start.y;
    drag.moved ||= Math.hypot(dx, dy) > 5;
    state.x = clamp(drag.origin.x + dx, bounds.minX, bounds.maxX); state.y = clamp(drag.origin.y + dy, bounds.minY, bounds.maxY);
    render();
  }, { signal });
  const release = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = undefined; hovered = false;
    if (character.hasPointerCapture(event.pointerId)) character.releasePointerCapture(event.pointerId);
    suppressClickUntil = Date.now() + 250;
    state.target = null;
    if (!moved && event.type === "pointerup") { state.paused = false; state.userPaused = false; }
    selectAction(event.type === "pointercancel" ? "walk" : moved ? "jump" : "wave");
    showTools(); startLoop();
  };
  character.addEventListener("pointerup", release, { signal });
  character.addEventListener("pointercancel", release, { signal });
  character.addEventListener("lostpointercapture", (event) => { if (drag?.id === event.pointerId) release(event); }, { signal });
  character.addEventListener("click", (event) => { if (Date.now() > suppressClickUntil && event.detail === 0) { play("wave"); showTools(); } }, { signal });
  actor.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse" && !drag) { hovered = true; startLoop(); } }, { signal });
  actor.addEventListener("pointerleave", () => { hovered = false; startLoop(); }, { signal });
  character.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
  character.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); setPaused(true); return; }
    const steps: Record<string, Point> = { ArrowLeft: { x: -48, y: 0 }, ArrowRight: { x: 48, y: 0 }, ArrowUp: { x: 0, y: -48 }, ArrowDown: { x: 0, y: 48 } };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const target = { x: clamp(state.x + step.x, bounds.minX, bounds.maxX), y: clamp(state.y + step.y, bounds.minY, bounds.maxY) };
    hovered = false; play("walk"); state.target = target; faceTarget(target); render();
  }, { signal });

  motion.addEventListener("change", () => {
    state.paused = motion.matches || state.userPaused;
    if (motion.matches) { selectAction("idle"); particles.length = 0; paintEffects(0); }
    else if (!state.paused) selectAction("walk");
    updateControls(); startLoop();
  }, { signal });
  const themeChanged = () => { lastSprite = ""; particles.length = 0; updateControls(); burst(); render(); paintEffects(0); };
  const themeObserver = new MutationObserver(() => { if (root.dataset.form !== form()) themeChanged(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("yu2i:theme-change", themeChanged, { signal });
  document.addEventListener("visibilitychange", () => { hovered = false; startLoop(); }, { signal });
  if (!pageLoaded) addEventListener("load", () => { pageLoaded = true; startLoop(); }, { once: true, signal });
  addEventListener("resize", resize, { signal });
  visualViewport?.addEventListener("resize", resize, { signal });
  addEventListener("blur", () => {
    if (drag) {
      const pointer = drag.id; drag = undefined;
      if (character.hasPointerCapture(pointer)) character.releasePointerCapture(pointer);
      selectAction("walk");
    }
    hovered = false; updateControls(); startLoop();
  }, { signal });
  for (const [selected, sheet] of Object.entries(sheets)) {
    sheet.addEventListener("load", () => { lastSprite = ""; startLoop(); }, { signal });
    sheet.src = `/images/hanekawa/pixel-${selected === "light" ? "day" : "night"}-roaming.png`;
  }
  cleanup = () => {
    controller.abort(); cancelAnimationFrame(frameRequest); clearTimeout(toolsTimer); themeObserver.disconnect();
    if (drag && character.hasPointerCapture(drag.id)) character.releasePointerCapture(drag.id);
    drag = undefined;
  };
  resize(); updateControls(); startLoop();
}

document.addEventListener("astro:before-swap", () => { cleanup?.(); cleanup = undefined; });
document.addEventListener("astro:page-load", mountCompanion);
addEventListener("pagehide", () => { cleanup?.(); cleanup = undefined; });
addEventListener("pageshow", (event) => { if (event.persisted) mountCompanion(); });
mountCompanion();
