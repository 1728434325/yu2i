# yu2i 站点改造分析（Fuwari 直接替换版）

> 决策已定：**直接改现有目录**、**路由沿用 Fuwari 的 Swup**（你的新规格里写明“优先检查 Fuwari 是否已有相关实现”，已有的是 Swup）、**Live2D 不接 AI**。
> 本文件只做分析与方案，不改代码。确认后从阶段三开始。

---

## 一、现有 Fuwari 功能与依赖分析

### 1.1 Fuwari 本体（实测）

| 项 | 值 |
|---|---|
| 仓库 | `saicaca/fuwari`，MIT，5150★ / 1273 fork |
| 分支 | `master`（无 `main`），无 release，以 commit 为基线 |
| 最后提交 | 2025-12-11（依赖补丁） |
| Astro | **5.13.10**（精确锁定） |
| Tailwind | 3.4.19 + `@astrojs/tailwind@6` |
| 路由 | **Swup**（`@swup/astro@1.7`），容器 `main` / `#toc`，`cache`、`preload`、`smoothScrolling` 全开 |
| 滚动 | **OverlayScrollbars 2.12**（自定义滚动条，初始化在 `Layout.astro`） |
| 现有动画 | `fade-in-up`（300ms，`transition.css`）、若干 `transition-*`、代码块 `pulsate` |
| 内容系统 | Content Collections + Markdown/MDX 扩展（KaTeX、Expressive Code、GitHub 卡片、警告块） |
| 搜索 | Pagefind 1.4，构建后生成索引 |
| 其它 | RSS、sitemap、i18n、主题色 hue 选择、深浅色、PhotoSwipe 灯箱、TOC、阅读时间 |

### 1.2 现有站点（要被替换的部分）

| 项 | 值 |
|---|---|
| 页面 | 13 个 HTML（3 篇文章 + 首页/关于/现在/搜索/统计/笔记/实验×2/友邻） |
| 体积 | 1.1 MB（含图片与 `logs`、`tools`） |
| 服务 | `server.py`，PID 3894431，`0.0.0.0:2778` |
| 定时 | `@reboot` 拉起、5 分钟健康检查、10 分钟统计、每天 4:30 建索引、每小时邻居任务 |
| 安全头 | 已有 CSP（`script-src 'self' 'unsafe-inline'`）、`nosniff`、`frame-ancestors 'none'` 等 |
| Git | 有仓库，最近提交 `6daa319` |

### 1.3 直接替换的真实含义

不是“把文件丢进去”，而是：

1. 现有页面先快照到 `legacy/`，保证随时能回滚；
2. Astro 工程建在同一目录，构建产物进 `dist/`；
3. 上线时把 `server.py` 的服务根从仓库根切到 `dist/`（一行常量），旧站仍可一条命令切回；
4. 旧 URL 用 301 映射到新 URL，保住外链和搜索收录。

---

## 二、推荐技术栈与必要性

**结论：v1 只装 2 个运行时依赖，其余全部用原生实现。**

| 技术 | 必要性 | 结论 |
|---|---|---|
| CSS Animation / WAAPI | 必需 | **用**：渐入、悬浮、转场、光晕 |
| Canvas 2D | 必需 | **自绘**樱花/星点/光标拖尾（比 tsParticles 小两个数量级） |
| IntersectionObserver | 必需 | **用**：渐入与懒加载，替代 GSAP ScrollTrigger |
| Swup（Fuwari 自带） | 必需 | **保留**，不引 ClientRouter |
| OverlayScrollbars（自带） | 必需 | **保留**，不与 Lenis 抢滚动 |
| Lenis | **不建议** | Fuwari 已有 Swup `smoothScrolling` + OverlayScrollbars，再加 Lenis 是第三个滚动所有者 |
| GSAP | 可选，v1 不装 | 只有“时间线编排”才值得；hero 入场用 WAAPI 足够 |
| tsParticles | 可选，v1 不装 | 樱花/星空自绘即可；需要复杂粒子行为时再引 |
| Three.js | 可选，阶段五 | 首页 3D 单独 chunk，WebGL 检测 + 静态回退 |
| Live2D（Pixi 6 + pixi-live2d-display） | 可选，阶段五 | 先壳后模型；无 AI；Cubism Core 与模型授权先行确认 |
| Astro ClientRouter | **不采用** | 与 Swup 互斥，Fuwari 的过渡/预取/`updateHead` 全挂在 Swup |

许可证备注：GSAP 是“免费使用”而非 OSI 开源；Live2D 的 `live2d-widget` 是 GPL-3.0 **不采用**；`pixi-live2d-display` MIT 但只兼容 Pixi 6。

---

## 三、目录与文件改动

```
~/sites/yu2i/
├─ legacy/                        # ★ 现有站点快照（回滚用，不参与构建）
│  ├─ index.html about.html … posts/ notes/ lab/ assets/ server.py.legacy
├─ astro.config.mjs               # Fuwari 原配置（site 改 yu2i.site，保留 swup）
├─ package.json  pnpm-lock.yaml
├─ tsconfig.json  biome.json
├─ src/
│  ├─ config.ts                   # Fuwari 站点/导航/资料配置（改成本站）
│  ├─ config/effects.ts           # ★ 特效唯一入口
│  ├─ effects/
│  │  ├─ core/{types,bus,perf,router,dispose}.ts
│  │  ├─ background/{sakura,starfield,pointer-parallax}.ts
│  │  ├─ scroll/{reveal,parallax,progress}.ts
│  │  ├─ cursor/{glow,trail,magnetic,tilt}.ts
│  │  ├─ three/{scene,fallback}.ts
│  │  └─ live2d/{panel,dialog}.ts
│  ├─ components/effects/{EffectsRoot,BackgroundLayer,Live2DPanel,HeroScene}.astro
│  ├─ layouts/{Layout,MainGridLayout}.astro   # 只加挂载点，不动原有逻辑
│  ├─ styles/effects.css
│  └─ content/{posts,spec}/…       # 由 legacy 文章迁移
├─ public/
│  ├─ live2d/{core,models}/        # 授权确认后再放
│  ├─ textures/
│  └─ legacy-assets/               # 旧站图片迁入
├─ dist/                          # 构建产物（server.py 新根）
├─ docs/{DESIGN.md, ANALYSIS.md}
├─ tools/                         # 现有脚本，迁移后改造/废弃
└─ server.py                      # 增加 ROOT 常量、301 映射表、wasm-unsafe-eval
```

**改动边界**：Fuwari 的 `content`、`components`、`pages`、`plugins` 一律不动；只在 `Layout.astro` 插入一个 `<EffectsRoot/>`，在 `MainGridLayout.astro` 的 Swup 容器外放背景层。

---

## 四、动画模块架构与统一配置

### 4.1 分层

```
config/effects.ts  →  core/bus  →  effects/*  →  components/effects/*.astro
       (开关)          (生命周期)     (纯 TS)        (挂载点)
```

- `core/perf.ts`：根据 `hardwareConcurrency`、`deviceMemory`、`saveData`、`WebGL` 能力、`prefers-reduced-motion` 定档（high/medium/low/off）。
- `core/router.ts`：把 Swup 的 `visit:start` / `page:view` 翻译成 `page:leave` / `page:enter`，特效层不直接依赖 Swup API。
- `core/dispose.ts`：收集 `AbortController`、rAF、`ResizeObserver`、`IntersectionObserver`、动画实例，逆序释放。
- 每个效果模块导出 `mount(ctx, el)`，`ctx` 提供 `signal`、`raf`、`quality`、`onCleanup`；`mount` 幂等，重复调用先销毁。

### 4.2 统一配置（草案）

```ts
export const effectsConfig = {
  quality: "auto",                 // auto | high | medium | low | off
  respectReducedMotion: true,
  background: {
    sakura:  { enabled: true, count: 24, speed: 0.6 },
    stars:   { enabled: true, count: 700 },
    glow:    { enabled: true, opacity: 0.35 },
    parallax:{ enabled: true, strength: 0.3 },
  },
  scroll:  { reveal: true, parallax: true, progress: true, lerp: null }, // 不用 Lenis
  cursor:  { glow: true, trail: true, magnetic: true, tilt: true, maxTrail: 24 },
  three:   { enabled: true, stars: 6000, planet: true, ring: true, fallback: "static" },
  live2d:  { enabled: false, model: "hiyori", scale: 0.9, dialog: true },
  transitions: { fadeMs: 180 },
};
```

`live2d.enabled` 默认 `false`：授权确认前不加载任何模型资源。

### 4.3 六类效果落点

| 效果 | 实现 | 降级 |
|---|---|---|
| 樱花 | Canvas 2D 自绘，`count` 按档位 | low → 12 片 / off → 静态渐变 |
| 星空 | Canvas 2D 或 Three 二选一，**不同时全屏跑** | 移动端只留 CSS 星点 |
| 光晕/昼夜 | CSS 变量 + `dark` class 联动 | 关灯时降透明度 |
| 平滑滚动 | 保留 Swup smooth + OverlayScrollbars，不引 Lenis | 原生滚动 |
| 渐入/视差/进度 | IntersectionObserver + transform + rAF | reduced-motion → 直接显示 |
| 鼠标特效 | pointer:fine 才启用，`pointerleave` 归位 | 触屏 no-op |
| 3D | Three 单独 chunk，首页才加载，`Points` + 低模星球 | 无 WebGL → 静态图 |
| Live2D | 独立 chunk，idle 后加载，`pixi.destroy()` 释放 | 移动端默认关 |
| 转场 | Swup `transition-swup-fade` 180ms | reduced-motion → 无动画 |

---

## 五、兼容性、安全与性能风险

| # | 风险 | 说明 | 处置 |
|---|---|---|---|
| 1 | **三重滚动冲突** | OverlayScrollbars（Fuwari 默认）+ Swup smoothScrolling + Lenis 会互相抢 `scrollTo`，锚点与返回位置错乱 | 不引 Lenis；保留前两者 |
| 2 | **Swup / ClientRouter 互斥** | 同时启用会双跳转、双份事件 | 只用 Swup |
| 3 | **Astro 版本漂移** | Fuwari 锁 5.13.10，npm 已 7.4.8 | 不改版本，锁文件入库 |
| 4 | **CSP 与 Pagefind** | Pagefind 需要 WebAssembly，`script-src` 若缺 `'wasm-unsafe-eval'` 搜索直接失败 | 上线前改 `server.py` CSP 并实测搜索 |
| 5 | **内联脚本** | Astro 可能产出内联脚本，现行 CSP 依赖 `'unsafe-inline'` | 保留 `'unsafe-inline'`（无后端、无用户输入，风险可控）；后续可换 hash |
| 6 | **URL 断链** | 旧站 `posts/x.html`，Fuwari 是 `posts/x/` | `server.py` 301 映射表，保留一年 |
| 7 | **内容迁移** | 3 篇文章 + 笔记/实验页要转 Markdown/Content Collections | 逐篇转，保留原文到 `legacy/` |
| 8 | **定时任务冲突** | 每小时邻居任务会写 `data/`、可能改旧 HTML | 迁移期暂停该任务，改造后再启 |
| 9 | **Live2D 许可** | Cubism Core 专有 + 模型条款；`live2d-widget` GPL | 默认关闭；授权书面确认后再开 |
| 10 | **Pixi 6 与 8 共存** | 8.22 与 `pixi-live2d-display` 不兼容 | 只允许 Live2D chunk 用 Pixi 6 |
| 11 | **首屏体积** | Three/Live2D 若进主 bundle 会翻倍 | 动态 import + 路由级门控 + 预算脚本 |
| 12 | **无 JS 阅读** | 特效失败不能影响正文 | 内容静态输出；canvas `aria-hidden`；降级层用 CSS |
| 13 | **Node 26** | Astro 5 官方矩阵是 18/20/22，本机 26 | 构建异常先切 Node 22 复现 |
| 14 | **供应链** | 依赖多、更新慢 | 固定版本、锁文件、`pnpm audit`、只用官方包 |

---

## 六、分阶段计划与验收标准

| 阶段 | 内容 | 验收（必须全过） |
|---|---|---|
| **一 审查** | 本文件 + DESIGN.md；Fuwari clone 到 `/tmp` 只读检查 | 依赖/版本/路由/动画清单与实测一致 |
| **二 选型** | 确认依赖清单（v1 仅 Three 可选，其余原生） | 你签字确认本方案 |
| **三 环境** | `legacy/` 快照；Fuwari 落到 `~/sites/yu2i`；改 `config.ts`；`pnpm install`；`pnpm build`；`astro preview` 跑 2779 | 构建 0 error；首页 200；旧站 2778 不受影响 |
| **四 轻量动画** | effects 内核 + 背景 + 光标 + 滚动 + 转场 | 全部开关可关；mount/dispose 计数相等；reduced-motion 全静；移动端无鼠标监听 |
| **五 高级效果** | Three（首页）+ Live2D 壳（默认关） | Three chunk 不进首屏；无 WebGL 回退正常；Live2D 关闭时零请求 |
| **六 安全性能** | CSP 加 `wasm-unsafe-eval` 后实测 Pagefind；`pnpm audit`；Lighthouse；内存快照 | 搜索可用；Perf/SEO/A11y ≥ 90；无 console error；无外部请求 |
| **七 构建部署** | `dist/` 切成 `server.py` 根；301 映射；缓存头；回滚演练 | 旧 URL 301 正确；构建产物脱离 Node 可被任意静态服务器托管；回滚 1 条命令 |

**时间估计**：阶段三～四约 1 天，阶段五 1 天（Live2D 视授权），阶段六～七半天。

**回滚方案**：`legacy/` + git tag + `server.py` 的 `ROOT` 常量，三条通道任选其一。

---

## 待你一句“开始”

确认后我按阶段三动手：先快照、再落 Fuwari、构建到 `dist/`、2779 预览，全程不碰 2778 的线上服务。任何一步构建失败，我会停下来报原因，不会拿线上站当试验田。
