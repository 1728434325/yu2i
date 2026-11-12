import { effectsConfig } from "../config/effects";
import { mountMascot } from "./mascot";
import { mountClickPaws } from "./click-paws";

const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const fine = matchMedia("(hover: hover) and (pointer: fine)");
let dispose: (() => void) | undefined;

// Every captured DOM node and animation belongs to one page.
function mount() {
  dispose?.();
  const controller = new AbortController();
  const { signal } = controller;
  let frame = 0;
  const observers: IntersectionObserver[] = [];
  dispose = () => {
    controller.abort();
    cancelAnimationFrame(frame);
    observers.forEach((observer) => observer.disconnect());
    document.documentElement.classList.remove("has-character-cursor");
  };
  mountMascot(signal);
  const disabled = reduced.matches || effectsConfig.quality === "off" || new URLSearchParams(location.search).get("fx") === "off";
  document.documentElement.classList.toggle("fx-off", disabled);
  if (document.hidden) return;
  if (effectsConfig.quality !== "off" && new URLSearchParams(location.search).get("fx") !== "off") mountClickPaws(signal, reduced.matches);

  const canvas = document.getElementById("fx-stars") as HTMLCanvasElement | null;
  const leavesCanvas = document.getElementById("fx-sakura") as HTMLCanvasElement | null;
  const ctx = canvas?.getContext("2d");
  const leavesCtx = leavesCanvas?.getContext("2d");
  const low = !fine.matches || navigator.hardwareConcurrency <= 4 || effectsConfig.quality === "low";
  const dpr = Math.min(devicePixelRatio || 1, low ? 1 : 1.5);
  const size = () => {
    for (const element of [canvas, leavesCanvas]) {
      if (!element) continue;
      element.width = Math.round(innerWidth * dpr); element.height = Math.round(innerHeight * dpr);
      element.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };
  size();
  addEventListener("resize", size, { passive: true, signal });
  const dust = Array.from({ length: low ? 36 : 100 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, phase: Math.random() * 6.28, size: Math.random() * 1.2 + .3 }));
  const leaves = Array.from({ length: low ? 5 : 12 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, phase: Math.random() * 6.28, speed: Math.random() * .3 + .25, size: Math.random() * 2.5 + 1.2 }));
  const cursor = document.getElementById("character-cursor");
  const glow = document.getElementById("fx-glow");
  if (fine.matches && !disabled && effectsConfig.cursor.enabled) {
    document.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      if (event.target instanceof Element && event.target.closest(".hero-title-line")) {
        document.documentElement.classList.remove("has-character-cursor");
        if (cursor) cursor.style.opacity = "0";
        if (glow) glow.style.opacity = "0";
        return;
      }
      document.documentElement.classList.add("has-character-cursor");
      if (cursor) { cursor.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`; cursor.style.opacity = "1"; }
      if (glow && effectsConfig.cursor.glow) { glow.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`; glow.style.opacity = "1"; }
    }, { passive: true, signal });
    const leave = () => {
      document.documentElement.classList.remove("has-character-cursor");
      if (cursor) cursor.style.opacity = "0";
      if (glow) glow.style.opacity = "0";
    };
    document.addEventListener("pointerleave", leave, { signal });
    document.addEventListener("pointerdown", () => cursor?.classList.add("is-pressed"), { signal });
    document.addEventListener("pointerup", () => cursor?.classList.remove("is-pressed"), { signal });
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
    if (disabled || low || !effectsConfig.scroll.reveal || !("IntersectionObserver" in window)) { element.classList.add("is-in"); continue; }
    element.classList.add("reveal-pending");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { element.classList.add("is-in"); element.classList.remove("reveal-pending"); observer.disconnect(); }
    }, { threshold: .08 });
    observer.observe(element); observers.push(observer);
  }
  const progress = document.getElementById("fx-progress");
  const updateProgress = () => {
    const distance = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
  };
  addEventListener("scroll", updateProgress, { passive: true, signal });
  updateProgress();
  if (!disabled && fine.matches && effectsConfig.scroll.magnetic) {
    for (const element of document.querySelectorAll<HTMLElement>("[data-magnetic]")) {
      element.addEventListener("pointermove", (event) => {
        const bounds = element.getBoundingClientRect();
        const x = Math.max(-4, Math.min(4, (event.clientX - bounds.left - bounds.width / 2) * .12));
        const y = Math.max(-4, Math.min(4, (event.clientY - bounds.top - bounds.height / 2) * .12));
        element.style.transform = `translate(${x}px,${y}px)`;
      }, { passive: true, signal });
      element.addEventListener("pointerleave", () => { element.style.transform = ""; }, { signal });
    }
  }

  let previous = 0;
  const draw = (time: number) => {
    if (signal.aborted) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden || time - previous < 33) return;
    const step = previous ? Math.min((time - previous) / 33, 3) : 1;
    previous = time;
    const dark = document.documentElement.classList.contains("dark");
    if (ctx && effectsConfig.stars.enabled) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = dark ? "#e4b96c" : "#9d6633";
      for (const mote of dust) {
        mote.phase += .012 * step; mote.y -= .06 * step;
        if (mote.y < 0) mote.y = innerHeight;
        ctx.globalAlpha = .15 + (Math.sin(mote.phase) + 1) * .2;
        ctx.beginPath(); ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (leavesCtx && effectsConfig.sakura.enabled) {
      leavesCtx.clearRect(0, 0, innerWidth, innerHeight);
      leavesCtx.fillStyle = dark ? "rgba(205,115,79,.45)" : "rgba(154,70,38,.25)";
      for (const leaf of leaves) {
        leaf.phase += .006 * step; leaf.y += leaf.speed * step;
        leaf.x += Math.sin(leaf.phase) * .18 * step;
        if (leaf.y > innerHeight + 6) { leaf.y = -6; leaf.x = Math.random() * innerWidth; }
        leavesCtx.save(); leavesCtx.translate(leaf.x, leaf.y); leavesCtx.rotate(leaf.phase);
        leavesCtx.beginPath(); leavesCtx.ellipse(0, 0, leaf.size, leaf.size * .35, 0, 0, Math.PI * 2); leavesCtx.fill(); leavesCtx.restore();
      }
    }
  };
  if (!disabled) frame = requestAnimationFrame(draw);
}
function stop() { dispose?.(); dispose = undefined; }
document.addEventListener("astro:before-swap", stop);
document.addEventListener("astro:page-load", mount);
document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else mount(); });
addEventListener("pagehide", stop);
addEventListener("pageshow", (event) => { if (event.persisted) mount(); });
reduced.addEventListener("change", mount);
fine.addEventListener("change", mount);
mount();
