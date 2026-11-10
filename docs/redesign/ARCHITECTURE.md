# ARCHITECTURE.md — 全站重设计技术架构

> **2026-11-10 决策变更：路线改为 C（自建 Astro 前端，选择性复用 Fuwari 能力）。**
> 实际落地栈：Astro **7.4.8** + Tailwind **4.3.5**（`@tailwindcss/vite`）+ **ClientRouter** + Pagefind 1.6 + `@astrojs/sitemap` 3.7 + `@astrojs/rss` 4.0。
> 不再使用 Swup、OverlayScrollbars、Fuwari 的 Layout/组件；Fuwari 仅作为内容模型与插件思路的参考（MIT）。
> 理由：全站视觉重写本来就要替换 Layout/页面/导航，Fuwari 的 Swup 与 Astro 5 锁定反而成为负担；C 让 Astro 7、Tailwind 4、ClientRouter 原生转场、Content Layer 全部可用。
> 以下 B 路线章节保留作为对比记录，实施以本节为准。

> 调研日期 2026-11-10。所有版本、星标、许可证均为当日实测（GitHub API / npm / 本地 clone / 线上站点实测）。
> 本文件只描述架构，不含代码改动。开发需另行批准。

---

## 1. 技术栈与版本

| 层 | 选型 | 版本 | 依据 |
|---|---|---|---|
| 框架 | Astro（随 Fuwari 锁定） | **5.13.10** | Fuwari 精确锁定；npm 最新 7.4.8，升级会打断 `@astrojs/tailwind@6`、`@astrojs/svelte@7`、`astro-expressive-code@0.41` 兼容链 |
| 样式 | Tailwind + 自定义 CSS 变量 | **3.4.19** / `@astrojs/tailwind 6.x` | Fuwari 基线；npm 最新 4.3.5 是不同引擎与配置格式 |
| 交互组件 | Svelte | 5.39.8 | Fuwari 现有（主题开关、搜索、设置面板） |
| 路由/转场 | Swup (`@swup/astro`) | 1.7.x | Fuwari 原生；与 ClientRouter 互斥 |
| 滚动条 | OverlayScrollbars | 2.12 | Fuwari 原生，初始化在 `body` 上 |
| 搜索 | Pagefind | 1.4 | 构建后索引，零后端；需要 WebAssembly |
| 内容 | Astro Content Collections + Markdown | 内置 | 已是成熟能力，不重写 |
| 动画 | CSS Animation / WAAPI / Canvas 2D / IntersectionObserver | 原生 | 体积与维护成本最低（见 TECH_RESEARCH） |
| 可选 3D | Three.js | 0.187.0（89.6 KB gzip） | 仅首页 hero，动态 import |
| 可选 Live2D | PixiJS 8 + `untitled-pixi-live2d-engine` | 8.22 / 1.4.0 | 2026-09 维护、MIT、支持 Cubism 2–5、peer `pixi.js ^8.13.1` |
| 包管理 | pnpm | 12.15（本机） | Fuwari `preinstall: only-allow pnpm` |
| 运行时 | Node（仅构建） | 26.12.1（官方矩阵 18/20/22） | 构建异常时优先切 Node 22 LTS 复现 |

**明确不引入**：Lenis、GSAP、tsParticles（v1）、ClientRouter、任何数据库/后端/评论系统/统计分析脚本。

---

## 2. 三条路线与最终选择

| 维度 | A 直接重构 Fuwari 全部 UI | **B Fork + 主题层（推荐）** | C 自建 Astro 前端，复用 Fuwari 内容能力 |
|---|---|---|---|
| 视觉自由度 | 高 | 高 | 最高 |
| 开发工作量 | 中（改现有组件） | 中 | 高（页面/搜索/TOC/RSS 全重建） |
| 长期维护 | 难（与上游混在一起，无法同步） | 中（边界清晰，可按季度合并上游） | 易（自有代码，可自由升级 Astro） |
| 性能 | 中 | 中 | 中 |
| 安全 | 高 | 高 | 高 |
| Fuwari 升级难度 | 极高（本地改动覆盖全站） | 低–中（冲突集中在 Layout/pages） | 无（已脱离） |
| 依赖复杂度 | 中 | 中 | 中 |
| 静态部署兼容 | 是 | 是 | 是 |

**推荐 B。** 理由：

1. 内容处理、搜索、RSS、sitemap、KaTeX、代码高亮、灯箱、i18n 这些成熟能力原样保留，不重造。
2. 视觉层全部放进 `src/theme/` 与重写的 `src/layouts|pages|components/ui`，上游文件改动可枚举、可 diff。
3. 上游仍有安全补丁价值（MIT、5150★），通过 `git remote upstream` + 季度 merge 能吸收；A 路线会把这个能力毁掉。
4. C 路线在 Astro 7 上更现代，但要重写 Pagefind 集成、TOC、归档、RSS、i18n，工作量约为 B 的 2–3 倍，且没有现成收益。

**B 的代价与边界**：接受 Fork 分叉；设“上游边界清单”，清单外的文件不得修改；每季度做一次 upstream merge 演练。若 Fuwari 连续 12 个月无提交或 Astro 5 停止安全维护，则触发退出条件，转入 C（迁移成本已在架构上预留：内容与插件均与框架解耦）。

---

## 3. 目录结构

```
~/sites/yu2i-next/                 # 独立开发目录，绝不覆盖线上 yu2i
├─ astro.config.mjs               # Fuwari 原配置 + effects 相关 vite 配置
├─ package.json / pnpm-lock.yaml
├─ src/
│  ├─ config.ts                   # Fuwari 站点配置（改成本站，唯一入口）
│  ├─ config/effects.ts           # ★ 特效与性能配置（类型化、构建期校验）
│  ├─ theme/                      # ★ 设计系统：只放视觉，不放业务
│  │  ├─ tokens.css               # 颜色/字号/间距/圆角/阴影/动效变量
│  │  ├─ base.css                 # reset、排版、焦点环
│  │  ├─ components.css           # 卡片、按钮、玻璃、标签、导航
│  │  ├─ pages.css                # 页面级布局
│  │  └─ themes/{day.css,night.css}
│  ├─ layouts/
│  │  ├─ BaseLayout.astro         # 重写：语义结构 + 特效挂载
│  │  └─ PostLayout.astro         # 重写：阅读页
│  ├─ components/
│  │  ├─ ui/                      # 通用：Button/Card/Chip/GlassPanel/Avatar
│  │  ├─ blog/                    # PostCard/TOC/ArchiveList/TagCloud/Pagination
│  │  ├─ site/                    # Navbar/Footer/Sidebar/SearchPanel
│  │  └─ effects/                 # EffectsRoot/BackgroundLayer/Live2DPanel/HeroCanvas
│  ├─ effects/                    # 纯 TS，不 import .astro
│  │  ├─ background/{sakura.ts,stars.ts,glow.ts,parallax.ts}
│  │  ├─ scroll/{reveal.ts,progress.ts}
│  │  ├─ cursor/{glow.ts,trail.ts,magnetic.ts}
│  │  ├─ three/{hero-scene.ts,fallback.ts}
│  │  └─ live2d/{stage.ts,model.ts,dialog.ts}
│  ├─ pages/                      # 重写视觉，路由保持 Fuwari 体系
│  │  ├─ index.astro
│  │  ├─ posts/[...slug].astro
│  │  ├─ archive.astro
│  │  ├─ about.astro
│  │  ├─ friends.astro
│  │  ├─ projects.astro
│  │  ├─ search.astro
│  │  ├─ notes/…  lab/…
│  │  └─ 404.astro
│  ├─ content/{posts,spec}/…      # 迁移后的文章与页面数据
│  ├─ plugins/                    # 上游 remark/rehype 插件（不改）
│  ├─ utils/                      # 上游工具（不改）
│  └─ i18n/                       # 上游多语言（增补中文文案）
├─ public/
│  ├─ fonts/                      # 本地 woff2
│  ├─ live2d/{core/,models/}      # 授权确认后才放
│  └─ textures/
├─ scripts/verify-build.mjs       # 预算校验、外链检查、产物清单
├─ docs/                          # 本套规划文档
└─ dist/                          # 构建产物（预览 2779 使用）
```

### 上游边界清单（不得随意改）

`src/plugins/**`、`src/utils/**`、`src/content/config.ts`、`src/i18n/**`、`src/types/**`、`astro.config.mjs` 的 `markdown` 段、`package.json` 的框架版本字段。

允许改：`src/config.ts`（站点信息）、`src/layouts/**`、`src/pages/**`、`src/components/**`、`src/styles/**`（新增）、`public/**`。

---

## 4. 模块关系

```
config.ts (站点信息)
   └─ config/effects.ts (特效开关/性能档)
        ├─ components/effects/EffectsRoot.astro  ← 唯一挂载点
        │     └─ effects/*.ts  (mount(ctx))
        ├─ theme/tokens.css  ← 视觉变量，effects 读取 CSS 变量取色
        └─ layouts/BaseLayout.astro（插入 <EffectsRoot/>）
```

依赖方向单向：`pages → layouts → components → effects → core(utils)`。`effects/*` 不依赖 Svelte、不依赖 Swup API，只依赖传入的 `ctx`。

---

## 5. 页面渲染流程

1. 构建期：Content Collections 读取 Markdown → remark/rehype 插件（阅读时间、slug、KaTeX、警告块、GitHub 卡片）→ Astro 输出 HTML。
2. 构建后：`pagefind --site dist` 生成搜索索引。
3. 运行期：静态 HTML 先渲染（SEO 与无 JS 可读）→ Swup 接管站内跳转 → `page:enter` 后按配置动态 import 特效模块。
4. 特效失败（import 报错、WebGL 不可用、reduced-motion）：静默降级到 CSS/静态层，不阻塞阅读。

---

## 6. Swup 生命周期与特效挂载

Fuwari 的 `Layout.astro` 现有钩子（实测）：

- `visit:start`：页面切换开始（可在此暂停/销毁页面级特效）
- `content:replace`：新内容替换完成 → 重建 OverlayScrollbars
- `page:view`：新页面可见 → 适合重新初始化页面级组件
- `visit:end`：切换结束

特效层只订阅两个语义事件：

| 事件 | 时机 | 动作 |
|---|---|---|
| `page:leave`（映射 `visit:start`） | 离开旧页 | 逆序 dispose 页面级模块（Canvas、Three、Live2D 不销毁的全局背景除外） |
| `page:enter`（映射 `page:view`） | 新页可见 | 按 `effectsConfig` 与页面标记 mount |

**全局 vs 页面级**：背景 Canvas 放在 Swup 容器之外，跨页常驻；Live2D、Three hero 放页面容器内，随页面销毁。

**避免重复初始化**：`EffectsRoot` 维护 `Map<id, cleanup>`；`mount` 前先 `dispose(id)`；`page:leave` 全量清空（除 `persistent: true`）。

**滚动**：保留 OverlayScrollbars（Fuwari 在 `body` 上初始化）+ Swup 的 `smoothScrolling`。**不引入 Lenis**：OverlayScrollbars 接管 `body` 滚动容器后，Lenis 的 `window` 滚动劫持会与它互相覆盖，锚点与返回位置最先坏。

---

## 7. 统一配置

```ts
export const effectsConfig = {
  quality: "auto",                    // auto | high | medium | low | off
  respectReducedMotion: true,
  pauseWhenHidden: true,
  background: {
    sakura:   { enabled: true, count: 22, speed: 0.55, opacity: 0.7 },
    stars:    { enabled: true, count: 600, twinkle: true },
    glow:     { enabled: true, opacity: 0.35 },
    parallax: { enabled: true, strength: 0.3 },
  },
  scroll: { reveal: true, progress: true },
  cursor: { glow: true, trail: true, magnetic: true, maxTrail: 20 },
  three:  { enabled: false, stars: 6000, planet: true },   // 阶段五开启
  live2d: { enabled: false, model: "placeholder", scale: 0.9, dialog: true },
  transitions: { fadeMs: 180 },
};
```

构建期用一个小校验器检查枚举与范围，非法配置直接 build 失败。运行期不再做二次校验。

---

## 8. 性能预算与降级

| 项 | 预算 | 测试条件 |
|---|---|---|
| 首屏 JS（Fuwari 基线 + 特效核心） | ≤ 140 KB gzip | 首页冷缓存，Lighthouse mobile |
| 背景/滚动/光标模块合计 | ≤ 25 KB gzip | 同上 |
| Three chunk（仅首页） | ≤ 130 KB gzip（three 本体实测 89.6 KB） | 动态 import 后 |
| Live2D chunk（桌面、idle 后） | ≤ 300 KB gzip（pixi8 + engine + core + 模型） | 交互后加载 |
| LCP | ≤ 2.5 s | Moto G Power 模拟、Slow 4G |
| CLS | < 0.05 | 同上 |
| INP | ≤ 200 ms | 同上 |
| 动画帧率 | ≥ 50 fps 桌面 / ≥ 30 fps 移动 | 中端设备实测，非承诺所有设备 |

降级链：`high → medium → low → off`。触发条件：`hardwareConcurrency ≤ 4`、`deviceMemory ≤ 4`、`saveData`、连续 3 s FPS < 45、`prefers-reduced-motion`。

---

## 9. 安全架构

- 纯静态产物（HTML/CSS/JS/字体/图片/模型），无 Node 常驻、无数据库、无 API。
- CSP 目标：
  ```
  default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline';
  script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:;
  object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  ```
  `wasm-unsafe-eval` 是 Pagefind 的硬需求；上线前必须在预览环境实测搜索，不得“先改再想”。
  `'unsafe-inline'` 的取舍：Astro 可能输出内联脚本；静态站无用户输入，风险低于动态站，但仍列为待收敛项（后续可用 hash 替代）。
- 所有第三方资源本地化：字体、图标、模型、纹理。无 Google Fonts、无 CDN 脚本、无统计。
- 依赖：固定版本 + 锁文件 + `pnpm audit`；只使用 npm 官方包与有明确许可证的仓库。
- 响应头由静态服务器统一加：`nosniff`、`Referrer-Policy`、`Permissions-Policy`、`X-Frame-Options`（或 CSP `frame-ancestors`）、HSTS（HTTPS 可用后）。

---

## 10. 升级与兼容策略

1. **版本冻结**：Astro 5.13.10、Tailwind 3.4.19、Svelte 5.39 在 B 路线内不升级；升级作为独立任务，带回归清单。
2. **上游同步**：`git remote add upstream https://github.com/saicaca/fuwari.git`；每季度 `git fetch upstream && git merge upstream/master`，冲突预期集中在 `Layout`/`pages`；合并后跑构建与视觉回归。
3. **退出条件**：Fuwari 停更 12 个月，或 Astro 5 结束安全维护 → 启动 C 路线（内容与插件已解耦，迁移只需替换渲染层）。
4. **依赖新增门槛**：gzip 体积、许可证、最近提交、是否有替代原生方案，四项都写进 PR 说明。

---

## 11. Live2D 架构（可选模块）

- 渲染：PixiJS 8 + `untitled-pixi-live2d-engine` 1.4.0（MIT，2026-09 维护，支持 Cubism 2–5）。
- Core：`live2dcubismcore.min.js` 本地托管（来自官方 SDK，受 Live2D Proprietary Software License 约束，需保留版权声明）。
- 模型：授权确认后再引入；优先官方 sample 或明确允许的模型，不使用来源不明 CDN。
- 加载：`requestIdleCallback` + `IntersectionObserver`；移动端默认折叠；`enabled: false` 时零请求。
- 释放：`app.destroy(true, {children:true, texture:true})`，模型与纹理一并释放；路由离开即销毁。
- 无模型回退：静态立绘 WebP + CSS 呼吸动画，功能按钮仍可用（显示/隐藏、台词）。

---

## 12. Three.js 架构（可选模块）

- 仅首页 hero；`enabled: false` 时零请求。
- 动态 `import("three")` + 只导入必要类；场景：`Points` 星场（≤6000）+ 低模 `IcosahedronGeometry` 星球 + 轻量 shader 星环。
- 渲染：`renderer.setPixelRatio(Math.min(dpr, 1.5))`、`setAnimationLoop`、页面隐藏时 `cancelAnimationFrame`。
- 降级：WebGL 检测失败 → 静态星空 WebP/CSS 渐变，不报错。
- 与 tsParticles 二选一：同一屏不同时跑两套全屏粒子。

---

## 13. 工程与测试

- `pnpm build` = `astro build && pagefind --site dist`。
- `scripts/verify-build.mjs`：检查产物大小预算、`dist` 内无源码、无外部 http 请求、每个页面有 title/description/canonical。
- 视觉回归：Playwright 截图（首页/列表/文章/404，桌面 + 移动，明暗两套），存 `tests/screenshots/`。
- Lighthouse CI 手动跑：性能、SEO、无障碍 ≥ 90（条件见第 8 节）。
- 链接检查：构建后遍历 `dist` 内所有 href，站内 200，旧 URL 301。
