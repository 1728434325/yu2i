# TECH_RESEARCH.md — 调研与依赖核验

> 全部数据为 2026-11-10 实测。星标/许可证来自 GitHub API，版本来自 npm registry，体积为实际下载后 gzip 测量，Demo 可达性为 curl 实测。

---

## 1. Fuwari 源码审查

### 1.1 仓库

| 项 | 值 |
|---|---|
| 地址 | https://github.com/saicaca/fuwari |
| 许可证 | MIT |
| 星标 / fork | 5150 / 1273 |
| 默认分支 | `master`（`main` 返回 404） |
| 最后提交 | 2025-12-11（依赖补丁）；仓库 `pushed_at` 2026-03-10 |
| Release | 无（`/releases/latest` 为空），以 commit 为基线 |
| Demo | https://fuwari.vercel.app（从国内网络实测返回 000，无法作为体积基准；改用第三方部署 https://fuwari.oh1.top 验证可达 200） |

### 1.2 依赖（package.json 实测）

- `astro 5.13.10`（精确锁定）
- `tailwindcss ^3.4.19`、`@astrojs/tailwind ^6.0.2`、`@tailwindcss/typography ^0.5.19`
- `svelte ^5.39.8`、`@astrojs/svelte 7.2.3`
- `@swup/astro ^1.7.0`、`overlayscrollbars ^2.12.0`
- `pagefind ^1.4.0`、`astro-expressive-code ^0.41.4`、`katex ^0.16.27`、`photoswipe ^5.4.4`
- 构建脚本：`astro build && pagefind --site dist`；`preinstall: npx only-allow pnpm`

### 1.3 路由与页面

```
src/pages/
  index.astro            # 由 [...page].astro 承接分页
  about.astro
  archive.astro
  posts/[...slug].astro
  robots.txt.ts
  rss.xml.ts
```
- 文章集合 `posts`，页面集合 `spec`（`src/content/config.ts`）。
- URL 规则 `trailingSlash: always`，文章地址形如 `/posts/<slug>/`。

### 1.4 Swup 生命周期（`src/layouts/Layout.astro` 实测）

- `window.swup.hooks.on('animation:out:start')`
- `'link:click'`
- `'content:replace'` → 重建 OverlayScrollbars
- `'visit:start'` → 记录来源 URL
- `'page:view'` → 页面可见后初始化（含 TOC 高亮、图片灯箱等）
- `'visit:end'`
- 配置：`containers: ["main", "#toc"]`、`smoothScrolling: true`、`cache: true`、`preload: true`、`updateHead: true`、`updateBodyClass: false`

**结论**：页面切换后必须重新初始化的组件，已经有明确落点（`page:view`）；我们的特效层只需订阅语义事件，不直接摸 Swup API。

### 1.5 OverlayScrollbars 的实际作用

- 在 `body` 上初始化虚拟滚动条（`autoHide: 'move'`），并为 `katex-display` 公式容器单独初始化。
- 源码注释自己写了：初始化到 `body` 会影响 `window.scrollTo` 等原生行为，“just leave it here for now”。

**结论**：它已经是滚动容器的实际接管者。再叠加 Lenis 会形成双滚动所有者，锚点跳转与返回位置最先坏。这不是理论推测，是源码注释与实现共同指向的结论。

### 1.6 Pagefind 与 CSP

- Pagefind 产物包含 WebAssembly；CSP 未含 `'wasm-unsafe-eval'` 时，搜索会在编译 wasm 阶段失败（表现为“搜索框在、没结果”）。
- 现有 `server.py` 的 CSP 是 `script-src 'self' 'unsafe-inline'`，**不含** `'wasm-unsafe-eval'`。上线前必须补上并在预览环境实测。

### 1.7 主题切换

- `src/utils/setting-utils.ts`：`setTheme` 操作 `document.documentElement.classList` 的 `dark`；支持 `auto`（跟随系统）。
- 颜色全部走 CSS 变量，特效层可直接读变量取色，不需要第二套颜色来源。

### 1.8 可复用 / 需重写 / 可删除

| 分类 | 内容 |
|---|---|
| 必须保留 | Content Collections、remark/rehype 插件链、Pagefind、RSS、sitemap、KaTeX、Expressive Code、PhotoSwipe、i18n、`setting-utils` |
| 可直接复用 | `PostCard` 数据逻辑、`TOC` 生成逻辑、`ArchivePanel` 数据聚合、分页逻辑、`Profile` 数据结构 |
| 需重新设计 | `Layout`、`MainGridLayout`、`Navbar`、`Footer`、`SideBar`、`PostPage`、`Search`、`about/archive` 页面外观 |
| 可删除 | 默认 banner 图、demo 资料、未使用的图标集、OverlayScrollbars 之外的重复滚动样式 |

### 1.9 三种改造方案的维护成本

| 方案 | 上游同步 | 视觉自由 | 风险 |
|---|---|---|---|
| A 直接改全部 | 无法同步（本地改动覆盖全站） | 高 | 上游安全补丁丢失 |
| **B Fork + 主题层** | 季度 merge，冲突集中在 Layout/pages | 高 | 需纪律维护边界清单 |
| C 自建前端 | 不依赖上游 | 最高 | 重写搜索/TOC/RSS，工作量 2–3 倍 |

---

## 2. 开源案例（均实测存在）

| 项目 | GitHub | Demo | 星标 | 许可证 | 技术栈 | 可借鉴 | 不照搬 |
|---|---|---|---|---|---|---|---|
| Fuwari | saicaca/fuwari | fuwari.vercel.app | 5150 | MIT | Astro 5.13 / Tailwind 3 / Svelte 5 / Swup | 内容管线、布局骨架、主题色系统 | 默认外观偏“极简白”，缺二次元氛围 |
| Firefly | CuteLeaf/Firefly | firefly.cuteleaf.cn（实测 200） | 2443 | MIT | **Astro 7.3.2 / Tailwind 4.3.3 / Swup 1.8 / Svelte 5.57** | 樱花/星空动效配置思路、移动端折叠策略 | 它的 Astro 7 + Tailwind 4 与 Fuwari 不兼容，不能混装；只借思路 |
| Astro Paper | satnaing/astro-paper | astro-paper.pages.dev | 5197 | MIT | Astro + Tailwind | 排版尺度、深浅色对比、可访问性 | 极简风，无动画层 |
| AstroWind | arthelokyo/astrowind | astrowind.vercel.app | 6128 | MIT | Astro + Tailwind | 首页 Hero/特性区结构、SEO 元数据 | 营销落地页气质，不是博客 |
| Retypeset | radishzzz/astro-theme-retypeset | retypeset.radishzz.cc | 713 | MIT | Astro | 中文排版、i18n 细节 | 版式偏印刷，动画少 |
| oregairu-fuwari | Liu233jh/oregairu-fuwari | 无 | 2 | MIT | Fuwari 分支 | 二次元配色改造的最小改动集 | 体量太小，不能作为架构依据 |
| personal_blog | elegy2/personal_blog | elegy2.netlify.app | 12 | **无许可证** | Astro + pixi-live2d-display | Live2D 集成位置参考 | 无许可证 = 不能复用代码 |
| live2d-widget | stevenjoezhang/live2d-widget | 项目 README 内 | 11027 | **GPL-3.0** | 原生 JS + Cubism | 交互与台词逻辑参考 | GPL 传染性，不引入本站 |

> 说明：以上星标为调研当日 API 返回值；Demo 可达性用 `curl -I` 实测，Firefly 返回 200，Fuwari 官方 Vercel 从本机返回 000（网络原因，不代表站点失效）。

---

## 3. 动画技术对比（体积为实测 gzip）

| 方案 | 适合 | 依赖 | 体积 | 运行成本 | Astro/Swup 兼容 | 维护 | 结论 |
|---|---|---|---|---|---|---|---|
| CSS Animation/Transition | 渐入、悬浮、光晕、转场 | 无 | 0 | 极低（合成层） | 天然兼容 | 极低 | **主力** |
| Web Animations API | 需要 JS 控制的时间线、取消 | 无 | 0 | 低 | 兼容，需在 `page:leave` cancel | 低 | **选用**（hero 入场） |
| Canvas 2D | 樱花、星点、拖尾 | 无 | 0（自写 ~2–4 KB） | 中（像素填充） | 需自行暂停/销毁 | 低 | **主力** |
| IntersectionObserver | 渐入、懒加载 | 无 | 0 | 极低 | 兼容 | 极低 | **选用** |
| GSAP | 复杂时间线、滚动编排 | 是 | **28.4 KB** | 中 | 需 `gsap.context().revert()` | 中 | 暂不引入 |
| Motion (framer-motion) | React/Vue 生态 | 是 | 较大 | 中 | 与 Svelte/原生混用收益低 | 中 | 不采用 |
| tsParticles | 复杂粒子行为/预设 | 是 | **46.4 KB**（slim） | 中高 | 需手动 pause/destroy | 中 | 暂不引入 |
| Three.js | 3D 星球/星环/视差 | 是 | **89.6 KB** | 高（GPU） | 需单独 chunk + 释放 | 中 | 可选（仅首页） |
| Lenis | 平滑滚动 | 是 | **5.4 KB** | 低 | **与 OverlayScrollbars 冲突** | 中 | **不引入** |

体积实测命令：下载 unpkg 上的 min 文件后 `gzip -c | wc -c`，得到 three 89,618 B、pixi6 125,624 B、gsap 28,435 B、lenis 5,439 B、tsparticles slim 46,352 B。

---

## 4. Live2D 方案对比

| 方案 | 许可证 | 维护 | Pixi 版本 | Cubism | 结论 |
|---|---|---|---|---|---|
| `pixi-live2d-display` 0.4.0 | MIT | npm 最后发布 2022-09，仓库 2024-08 | **仅 Pixi 6** | 2.1 / 4 | 稳定但技术栈落后，仅作后备 |
| `pixi-live2d-display-lipsyncpatch` 0.5.0-ls-8 | MIT | 2025-06，195★ | Pixi **7** | 2 / 4 | 可用，但仍是过渡代 |
| **`untitled-pixi-live2d-engine` 1.4.0** | MIT | 2026-09-20，82★ | **Pixi 8（^8.13.1）** | 2–5 | **首选**，与 Pixi 8.22 匹配 |
| 官方 Cubism SDK for Web | 专有许可 | 官方维护 | 自渲染 | 4/5 | 不引入，API 复杂、体积大 |
| `live2d-widget` | **GPL-3.0** | 11027★ | 无 Pixi | 2/4 | 不引入 |

**Core 与模型授权（实测条款）**：
- Live2D Cubism SDK 发布许可：**个人与年营收 < 1000 万日元的 Small-Scale Enterprise 免许可费**（Expandable Application 除外）。
- SDK 本体受 Live2D Proprietary Software License Agreement 约束；Core 可以随站点分发，但需保留版权声明，禁止反向工程。
- **模型是另一层授权**：官方 sample 模型有各自条款；来源不明的模型一律不用。
- 结论：个人博客在许可上可行，但模型来源必须逐一核验并记录在 `docs/ASSETS_LICENSE.md`。

---

## 5. Three.js 必要性分析

| 目标 | Canvas 2D 成本 | Three.js 成本 | 建议 |
|---|---|---|---|
| 星空点阵 + 闪烁 + 鼠标视差 | 2 KB 代码，稳定 60fps | 89.6 KB + 场景代码，需 WebGL | **Canvas 2D** |
| 旋转星球 + 星环 + 光照 | 伪 3D 需手写投影，效果差 | 原生 3D，效果好 | Three.js（仅首页 hero） |
| 悬浮岛屿 | 不可行 | 建模/贴图成本高 | 不做 |
| 鼠标控制视角 | 2D 视差足够 | 相机控制更自然 | Three.js（与星球同场景） |

**结论**：v1 用 Canvas 2D 做背景星空；Three.js 只在首页 hero 做“星球 + 星环”，默认关闭，阶段五评估后再开。理由：89.6 KB 换一个视觉焦点可以接受，换全站背景不值得。

---

## 6. 依赖许可证核验

| 包 | 许可证 | 商用 | 备注 |
|---|---|---|---|
| astro / tailwind / svelte / swup / overlayscrollbars / pagefind | MIT | 可 | 保留版权声明 |
| three | MIT | 可 | 同上 |
| pixi.js | MIT | 可 | 同上 |
| untitled-pixi-live2d-engine | MIT | 可 | 同上 |
| gsap | “Standard no charge” | 可（免费） | 非 OSI 开源；未采用 |
| lenis | MIT | 可 | 未采用 |
| tsParticles | MIT | 可 | 未采用 |
| Live2D Cubism Core | 专有 | 个人/小微免费 | 需版权声明，禁反向工程 |
| live2d-widget | GPL-3.0 | 传染 | 不采用 |

---

## 7. 版本兼容结论

1. **Astro 5.13.10 是硬约束**：Fuwari 的 `@astrojs/tailwind@6` 与 Tailwind 3 绑定；Astro 7（Firefly 在用）是另一套插件生态，不能混。
2. **Tailwind 3.4.19 是硬约束**：4.x 的 CSS-first 配置与 `@astrojs/tailwind` 不兼容。
3. **Pixi 版本按 Live2D 引擎选**：选 `untitled-pixi-live2d-engine` → Pixi 8；若退回 `pixi-live2d-display` → Pixi 6。两者不能共存。
4. **Node 26 可用但非官方矩阵**：Astro 5 声明 `>=22.0.0`，26 满足；若构建异常，先用 Node 22 LTS 复现再归因。
5. **Swup 与 ClientRouter 互斥**：保留 Swup。

---

## 8. 调研未决项

- Fuwari 官方 Demo 从本机不可达，无法用其线上包体积做基准；改用自建后实测。
- `untitled-pixi-live2d-engine` 的实际运行表现（模型兼容性、内存）需在阶段六做最小验证。
- Firefly 的动效配置思路可借鉴，但其 Astro 7 / Tailwind 4 代码不可直接移植。
