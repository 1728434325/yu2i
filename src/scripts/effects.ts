import { effectsConfig } from "../config/effects";

type Quality = "high" | "medium" | "low" | "off";

const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const coarseQuery = matchMedia("(pointer: coarse)");
const fineQuery = matchMedia("(hover: hover) and (pointer: fine)");

function tier(): Quality {
  if (effectsConfig.quality === "off") return "off";
  if (motionQuery.matches) return "off";
  if ((navigator as any).connection?.saveData) return "low";
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as any).deviceMemory ?? 8;
  if (coarseQuery.matches) return "low";
  if (effectsConfig.quality === "auto") return cores <= 4 || mem <= 4 ? "low" : "high";
  return effectsConfig.quality;
}

const q: Quality = tier();
const dpr = Math.min(devicePixelRatio || 1, q === "high" ? 1.5 : 1);

let stopped = false;
let pageCleanup: (() => void) | null = null;
const pageRaf = new Set<number>();

function rafPage(fn: FrameRequestCallback) {
  const id = requestAnimationFrame((t) => {
    pageRaf.delete(id);
    fn(t);
  });
  pageRaf.add(id);
  return id;
}

function sizeCanvas(c: HTMLCanvasElement) {
  const w = innerWidth;
  const h = innerHeight;
  c.width = Math.floor(w * dpr);
  c.height = Math.floor(h * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const ctx = c.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* ---------- 星空：全局常驻，轻量闪烁 ---------- */
function startStars() {
  const canvas = document.getElementById("fx-stars") as HTMLCanvasElement | null;
  if (!canvas || !effectsConfig.stars.enabled || q === "off") return;
  const ctx = sizeCanvas(canvas);
  if (!ctx) return;

  const n = q === "high" ? effectsConfig.stars.count : Math.round(effectsConfig.stars.count / 2);
  const stars = Array.from({ length: n }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.2 + 0.4,
    a: Math.random() * 0.6 + 0.15,
    p: Math.random() * Math.PI * 2,
    s: Math.random() * 0.9 + 0.4,
  }));

  let last = 0;
  const frame = (t: number) => {
    if (stopped || document.hidden) return;
    if (t - last < 33) return requestAnimationFrame(frame);
    last = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const st of stars) {
      st.p += 0.0016 * st.s;
      const a = st.a + Math.sin(st.p) * 0.25;
      ctx.globalAlpha = Math.max(0.05, a);
      ctx.fillStyle = "#f2ce8a";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const onResize = () => {
    sizeCanvas(canvas);
  };
  addEventListener("resize", onResize, { passive: true });
}

/* ---------- 樱花：全局常驻 ---------- */
function startSakura() {
  const canvas = document.getElementById("fx-sakura") as HTMLCanvasElement | null;
  if (!canvas || !effectsConfig.sakura.enabled || q === "off") return;
  const ctx = sizeCanvas(canvas);
  if (!ctx) return;

  const count = q === "high" ? effectsConfig.sakura.count : Math.round(effectsConfig.sakura.count / 2);
  const petals = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight - innerHeight,
    r: Math.random() * 5 + 3,
    vy: (Math.random() * 0.6 + 0.35) * effectsConfig.sakura.speed,
    vx: Math.random() * 0.4 - 0.2,
    rot: Math.random() * Math.PI * 2,
    spin: Math.random() * 0.02 - 0.01,
    sway: Math.random() * Math.PI * 2,
  }));

  let last = 0;
  const frame = (t: number) => {
    if (stopped || document.hidden) return;
    if (t - last < 33) return requestAnimationFrame(frame);
    last = t;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const dark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = dark ? "rgba(247,183,208,0.55)" : "rgba(206,92,130,0.55)";
    for (const p of petals) {
      p.y += p.vy;
      p.sway += 0.008;
      p.x += p.vx + Math.sin(p.sway) * 0.5;
      p.rot += p.spin;
      if (p.y > innerHeight + 12) {
        p.y = -12;
        p.x = Math.random() * innerWidth;
      }
      if (p.x < -12) p.x = innerWidth + 12;
      if (p.x > innerWidth + 12) p.x = -12;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  const onResize = () => {
    sizeCanvas(canvas);
  };
  addEventListener("resize", onResize, { passive: true });
}

/* ---------- 光标：光晕 + 轻拖尾（仅精确指针） ---------- */
function startCursor() {
  if (!effectsConfig.cursor.enabled || q === "off" || !fineQuery.matches) return;

  if (effectsConfig.cursor.glow) {
    const glow = document.getElementById("fx-glow");
    if (glow) {
      let gx = innerWidth / 2;
      let gy = innerHeight / 2;
      let tx = gx;
      let ty = gy;
      let active = false;
      const move = (e: PointerEvent) => {
        tx = e.clientX;
        ty = e.clientY;
        active = true;
      };
      const leave = () => {
        active = false;
        glow.style.opacity = "0";
      };
      addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerleave", leave);
      const tick = () => {
        if (stopped) return;
        gx += (tx - gx) * 0.18;
        gy += (ty - gy) * 0.18;
        glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
        if (active) glow.style.opacity = "1";
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  if (effectsConfig.cursor.trail) {
    const canvas = document.getElementById("fx-trail") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = sizeCanvas(canvas);
    if (!ctx) return;
    const points: { x: number; y: number; life: number }[] = [];
    const max = q === "high" ? effectsConfig.cursor.maxTrail : 8;
    const push = (e: PointerEvent) => {
      points.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (points.length > max) points.shift();
    };
    addEventListener("pointermove", push, { passive: true });
    const tick = () => {
      if (stopped) return;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.life -= 0.045;
        if (p.life <= 0) continue;
        ctx.globalAlpha = p.life * 0.45;
        ctx.fillStyle = "#f3a8c4";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 * p.life + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/* ---------- 页面级：渐入、进度、磁吸 ---------- */
function mountPage() {
  pageCleanup?.();
  pageRaf.forEach((id) => cancelAnimationFrame(id));
  pageRaf.clear();

  const cleanups: Array<() => void> = [];

  if (effectsConfig.scroll.reveal && q !== "off") {
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (targets.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add("is-in");
              io.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );
      targets.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    } else {
      targets.forEach((el) => el.classList.add("is-in"));
    }
  }

  if (effectsConfig.scroll.progress && q !== "off") {
    const bar = document.getElementById("fx-progress");
    if (bar) {
      let ticking = false;
      const update = () => {
        ticking = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        const ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
        bar.style.transform = `scaleX(${ratio})`;
      };
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          rafPage(update);
        }
      };
      addEventListener("scroll", onScroll, { passive: true });
      update();
      cleanups.push(() => removeEventListener("scroll", onScroll));
    }
  }

  if (effectsConfig.scroll.magnetic && fineQuery.matches && q !== "off") {
    const els = document.querySelectorAll<HTMLElement>("[data-magnetic]");
    const handlers: Array<[HTMLElement, (e: PointerEvent) => void, () => void]> = [];
    els.forEach((el) => {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
        el.style.transform = `translate(${Math.max(-8, Math.min(8, dx))}px, ${Math.max(-8, Math.min(8, dy))}px)`;
      };
      const leave = () => {
        el.style.transform = "";
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      handlers.push([el, move, leave]);
    });
    cleanups.push(() => {
      for (const [el, move, leave] of handlers) {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        el.style.transform = "";
      }
    });
  }

  pageCleanup = () => {
    for (const fn of cleanups) fn();
    pageRaf.forEach((id) => cancelAnimationFrame(id));
    pageRaf.clear();
  };
}

/* ---------- 启动：全局只初始化一次 ---------- */
let booted = false;

function boot() {
  if (booted) return;
  booted = true;
  document.documentElement.classList.toggle("fx-off", q === "off");
  if (q === "off") return;
  startStars();
  startSakura();
  startCursor();
  document.addEventListener("visibilitychange", () => {
    stopped = document.hidden;
    if (!document.hidden) {
      stopped = false;
      startStars();
      startSakura();
    }
  });
  addEventListener("pagehide", () => {
    stopped = true;
  });
}

document.addEventListener("astro:page-load", () => {
  boot();
  mountPage();
});

document.addEventListener("astro:before-swap", () => {
  pageCleanup?.();
  pageCleanup = null;
});

// 首次加载时 astro:page-load 也会触发；这里兜底一次。
if (document.readyState === "complete") boot();
else addEventListener("load", boot, { once: true });
mountPage();
