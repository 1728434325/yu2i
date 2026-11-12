export {};
interface PagefindInstance { destroy?: () => void }
declare global { interface Window { PagefindUI?: new (options: Record<string, unknown>) => PagefindInstance } }
let pending: Promise<void> | undefined;
let active: PagefindInstance | undefined;
function loadUI() {
  if (window.PagefindUI) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/pagefind/pagefind-ui.js";
    script.onload = () => resolve();
    script.onerror = () => { pending = undefined; reject(new Error("Search could not load")); };
    document.head.append(script);
  });
  return pending;
}
async function mountSearch() {
  const target = document.getElementById("search");
  if (!target || target.dataset.searchReady) return;
  target.dataset.searchReady = "loading";
  try {
    await loadUI();
    if (!target.isConnected || !window.PagefindUI) return;
    active = new window.PagefindUI({ element: "#search", showSubResults: true, showImages: false, resetButton: true });
    target.dataset.searchReady = "ready";
    const query = new URLSearchParams(location.search).get("q");
    const input = target.querySelector<HTMLInputElement>(".pagefind-ui__search-input");
    if (query && input) { input.value = query; input.dispatchEvent(new Event("input", { bubbles: true })); }
  } catch {
    if (target.isConnected) target.textContent = "搜索暂时无法加载，请刷新后再试。";
  }
}
document.addEventListener("astro:before-swap", () => { active?.destroy?.(); active = undefined; });
document.addEventListener("astro:page-load", mountSearch);
void mountSearch();
