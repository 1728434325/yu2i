const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function mountClickPaws(signal: AbortSignal, reduced: boolean) {
  const layer = document.getElementById("click-paws");
  if (!layer) return;
  let press: { pointerId: number; clientX: number; clientY: number; startedAt: number } | undefined;
  let sequence = 0;
  const stamp = (clientX: number, clientY: number) => {
    while (layer.children.length >= 12) {
      const old = layer.firstElementChild!;
      old.getAnimations().forEach((animation) => animation.cancel());
      old.remove();
    }
    const paw = document.createElement("span");
    paw.className = "click-paw";
    paw.style.left = `${clientX}px`;
    paw.style.top = `${clientY}px`;
    paw.style.rotate = `${[-18, 14, -9, 20][sequence++ % 4]}deg`;
    const svg = document.createElementNS(SVG_NAMESPACE, "svg");
    svg.setAttribute("viewBox", "0 0 40 42");
    svg.setAttribute("focusable", "false");
    svg.innerHTML = '<ellipse cx="7.5" cy="15" rx="4" ry="5.2" transform="rotate(-27 7.5 15)"/><ellipse cx="15.5" cy="8.5" rx="4.1" ry="5.5" transform="rotate(-8 15.5 8.5)"/><ellipse cx="25" cy="9.5" rx="4.1" ry="5.5" transform="rotate(12 25 9.5)"/><ellipse cx="33" cy="17" rx="3.7" ry="5" transform="rotate(31 33 17)"/><path d="M11 25c2-3.6 4.3-7.2 9-7.2s7.1 4.2 9.2 7.6c2.2 3.5 4.4 6.4 1.5 9.5-2.9 3-6.8.5-10.7.5-3.6 0-7.4 2.5-10.3-.2-3.2-3.1-.7-6.9 1.3-10.2Z"/>';
    paw.append(svg);
    layer.append(paw);
    const motion: Keyframe[] = reduced
      ? [{ opacity: .72 }, { opacity: 0 }]
      : [
          { opacity: 0, transform: "scale(.45)" },
          { offset: .14, opacity: .86, transform: "scale(1.04)" },
          { offset: .28, opacity: .78, transform: "scale(1)" },
          { offset: .58, opacity: .68, transform: "scale(1)" },
          { opacity: 0, transform: "scale(.98)" },
        ];
    const animation = paw.animate(motion, { duration: reduced ? 320 : 900, easing: "cubic-bezier(.16,1,.3,1)" });
    void animation.finished.catch(() => {}).finally(() => paw.remove());
  };
  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.isPrimary || (event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable]:not([contenteditable='false'])"))) { press = undefined; return; }
    press = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, startedAt: performance.now() };
  }, { passive: true, signal });
  document.addEventListener("pointermove", (event) => {
    if (press?.pointerId === event.pointerId && Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > 8) press = undefined;
  }, { passive: true, signal });
  document.addEventListener("pointerup", (event) => {
    const down = press;
    press = undefined;
    if (!down || down.pointerId !== event.pointerId || performance.now() - down.startedAt > 700 || Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) > 8) return;
    stamp(event.clientX, event.clientY);
  }, { passive: true, signal });
  document.addEventListener("pointercancel", () => { press = undefined; }, { passive: true, signal });
  signal.addEventListener("abort", () => {
    press = undefined;
    if (document.hidden) for (const paw of [...layer.children]) { paw.getAnimations().forEach((animation) => animation.cancel()); paw.remove(); }
  }, { once: true });
}
