export {};
type Theme = "light" | "dark";
const preference = matchMedia("(prefers-color-scheme: dark)");
let explicit = false;
function initialTheme(): Theme {
  try {
    const requested = new URLSearchParams(location.search).get("theme");
    const stored = localStorage.getItem("yu2i-theme");
    const value = requested === "dark" || requested === "light" ? requested : stored;
    explicit = value === "dark" || value === "light";
    if (explicit) return value as Theme;
  } catch { /* Privacy mode still supports the system preference. */ }
  return preference.matches ? "dark" : "light";
}
let current = initialTheme();
function applyTheme(target: Document = document) {
  target.documentElement.classList.toggle("dark", current === "dark");
  target.documentElement.dataset.theme = current;
  target.documentElement.style.colorScheme = current;
  const toggle = target.getElementById("theme-toggle");
  toggle?.setAttribute("aria-pressed", String(current === "dark"));
  toggle?.setAttribute("aria-label", current === "dark" ? "切换到白天形态" : "切换到夜间形态");
}
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest("#theme-toggle")) return;
  current = current === "dark" ? "light" : "dark";
  explicit = true;
  try { localStorage.setItem("yu2i-theme", current); } catch { /* Keep the in-memory choice. */ }
  applyTheme();
  document.dispatchEvent(new Event("yu2i:theme-change"));
});
document.addEventListener("astro:before-swap", (event) => applyTheme(event.newDocument));
document.addEventListener("astro:after-swap", () => applyTheme());
document.addEventListener("astro:page-load", () => applyTheme());
preference.addEventListener("change", () => {
  if (!explicit) { current = preference.matches ? "dark" : "light"; applyTheme(); }
});
addEventListener("storage", (event) => {
  if (event.key === "yu2i-theme" && (event.newValue === "light" || event.newValue === "dark")) {
    current = event.newValue; explicit = true; applyTheme();
  }
});
applyTheme();
