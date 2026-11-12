export function mountMascot(signal: AbortSignal) {
  const root = document.getElementById("chibi");
  const bubble = document.getElementById("chibi-bubble");
  if (!root || !bubble) return;
  const day = ["你来啦。今天先看哪一篇？", "修好了，别担心。", "慢慢来，比较快。", "看屏幕久了，看看远处吧。"];
  const night = ["夜深了，猫也还没睡。", "今晚想翻哪一页？", "不急，我陪你读完这一篇。", "白天留下的问题，今晚一起想想。"];
  let last = -1;
  let closeTimer = 0;
  const setHidden = (hidden: boolean) => {
    root.classList.toggle("is-hidden", hidden);
    try { localStorage.setItem("yu2i-chibi-hidden", hidden ? "1" : "0"); } catch { /* Optional persistence. */ }
  };
  try { root.classList.toggle("is-hidden", localStorage.getItem("yu2i-chibi-hidden") === "1"); } catch { /* Show by default. */ }
  const say = () => {
    const lines = document.documentElement.classList.contains("dark") ? night : day;
    const next = (last + 1 + Math.floor(Math.random() * (lines.length - 1))) % lines.length;
    last = next; bubble.textContent = lines[next];
    bubble.setAttribute("aria-hidden", "false"); bubble.classList.add("is-on"); root.classList.add("is-talking");
    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      bubble.classList.remove("is-on"); root.classList.remove("is-talking"); bubble.setAttribute("aria-hidden", "true");
    }, 3200);
  };
  document.getElementById("chibi-figure")?.addEventListener("click", say, { signal });
  document.getElementById("chibi-close")?.addEventListener("click", () => setHidden(true), { signal });
  document.getElementById("chibi-open")?.addEventListener("click", () => setHidden(false), { signal });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") setHidden(true); }, { signal });
  const welcomeTimer = window.setTimeout(() => { if (!root.classList.contains("is-hidden")) say(); }, 5000);
  signal.addEventListener("abort", () => { clearTimeout(welcomeTimer); clearTimeout(closeTimer); }, { once: true });
}
