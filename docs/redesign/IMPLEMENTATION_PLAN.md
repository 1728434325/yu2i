# IMPLEMENTATION_PLAN.md — 分阶段实施计划

> 前置条件：本套文档经批准。所有阶段在 `~/sites/yu2i-next` 独立目录进行，线上 `~/sites/yu2i`（2778）不动。
> 每阶段结束必须给出：构建结果、验收命令输出、截图（桌面/移动、明/暗）。

---

## 阶段 0 · 冻结与快照（0.5 天）

**目标**：把「可回滚」这件事先做完，再谈改造。

任务：
1. `~/sites/yu2i` 打 tar 快照到 `~/backups/yu2i-$(date).tar.gz`（含 assets、posts、tools、data、server.py）。
2. Git 打 tag `pre-redesign-2026-11`，确认工作区干净（当前 `stats.html` 有未提交改动，先提交或 stash）。
3. 导出当前 URL 清单（13 个 HTML）与站内链接检查结果，存 `docs/redesign/url-inventory.txt`。
4. **暂停**每小时邻居任务（它会写 `data/` 并可能改旧 HTML），记录恢复命令。
5. 记录线上基线：`curl -s -o /dev/null -w '%{http_code} %{time_total}' http://127.0.0.1:2778/`。

修改文件：无（只读 + 快照 + cron 暂停）。
依赖：无。
验收：
- tar 可解压、大小与源目录一致；
- `git tag` 存在、`git status` 干净；
- 邻居任务暂停有记录；
- 2778 仍返回 200。

风险：cron 暂停后忘记恢复 → 在 `docs/redesign/ROLLBACK.md` 写恢复命令。
回滚：解压 tar 即可。

---

## 阶段 1 · 新工程与基线（1 天）

**目标**：Fuwari 在独立目录跑起来，构建通过，2779 可预览。

任务：
1. `git clone --depth 1 https://github.com/saicaca/fuwari ~/sites/yu2i-next`，移除 `.git`，重新 `git init`，首提交为「upstream baseline」。
2. `pnpm install`（锁文件入库），`pnpm build`。
3. 改 `src/config.ts`：站点名、副标题、语言 `zh_CN`、导航、个人资料、`astro.config.mjs` 的 `site`。
4. `pnpm preview --port 2779` 或 `python3 -m http.server 2779 --directory dist`，确认 2779 可访问。
5. 记录基线数字：`dist` 体积、JS/CSS 数量与 gzip 大小、构建耗时。

修改文件：`src/config.ts`、`astro.config.mjs`。
依赖：pnpm、Node。
验收：
- `pnpm build` 0 error；
- 2779 首页 200，无 console error；
- 2778 不受影响；
- 基线数字写入 `docs/redesign/BASELINE.md`。

风险：Node 26 与 Astro 5 组合异常 → 切 Node 22 LTS 复现。
回滚：删 `yu2i-next` 即可，线上无影响。

---

## 阶段 2 · 设计系统落地（1.5 天）

**目标**：颜色、字体、间距、组件全部 token 化，先做静态页面骨架。

任务：
1. 新建 `src/theme/tokens.css`、`base.css`、`components.css`、`themes/{day,night}.css`，接入 `Layout`。
2. 字体：标题 Noto Serif SC（woff2 自托管，preload 一个字重）；正文系统栈；等宽沿用 JetBrains Mono。
3. 通用组件：Button / Card / Chip / GlassPanel / SectionHeader / Avatar / Pagination。
4. 建立 z-index、圆角、阴影、动效 token；写 `docs/redesign/TOKENS.md`（可选）。
5. 明暗切换沿用 `setting-utils`，验证两套主题对比度。

修改文件：`src/styles/**`（新增）、`src/components/ui/**`、`Layout.astro`（只改 class 与引入）。
依赖：阶段 1。
验收：
- 两套主题截图；
- 对比度实测：正文 ≥ 7:1、次要 ≥ 4.5:1；
- `pnpm build` 通过；
- 组件 Story 页（`/lab/kitchen-sink` 临时页）可看全部状态。

风险：Tailwind 3 与自定义 CSS 冲突 → 优先 CSS 变量，Tailwind 只做布局工具类。
回滚：删除 `src/theme/**` 与 `ui/**`，恢复 Layout 引入。

---

## 阶段 3 · 页面重写（3 天）

**目标**：首页、列表、详情、归档、关于、友链、项目、搜索、404 全部换成新视觉。

任务：
1. `BaseLayout.astro`（导航、页脚、skip link、SEO 元数据）。
2. 首页：Hero + 精选 + 项目 + 时间线 + 社交。
3. 列表：筛选 Chips + 网格 + 分页 + 空态。
4. 详情：封面 + 标题区 + 正文 + TOC + 上下篇 + 许可证 + 进度条。
5. 归档：年/月时间线。
6. 关于/项目/友链：按 DESIGN 第 8 节。
7. 搜索：Pagefind UI 重绘，键盘 `/` 聚焦。
8. 404：CSS 插画 + 三个入口。
9. 笔记/实验/现在：迁移并重绘。

修改文件：`src/layouts/**`、`src/pages/**`、`src/components/{blog,site}/**`。
依赖：阶段 2。
验收：
- 9 类页面全部 200；
- 移动端无横向滚动；
- 无 JS 时正文、导航、归档可读（`curl` + ` lynx -dump` 抽查）；
- 站内链接 0 死链；
- 视觉稿与实现截图对照通过。

风险：重写页面时误删上游数据逻辑 → 只改模板，不改 `utils/content-utils` 数据函数。
回滚：按页面粒度回退 commit。

---

## 阶段 4 · 轻量动效（2 天）

**目标**：背景、滚动、光标、转场四组效果上线，可独立关闭。

任务：
1. `src/config/effects.ts` + 构建期校验。
2. `EffectsRoot.astro`：唯一挂载点，动态 import。
3. 背景：樱花（Canvas 2D，≤22 片）、星点（≤600）、光晕、指针视差。
4. 滚动：IntersectionObserver 渐入、阅读进度（rAF 节流）。
5. 光标：光晕、拖尾（≤20 点）、磁吸按钮（≤8px）、卡片 tilt（≤6°）。
6. 转场：Swup 淡入淡出 180ms。
7. 生命周期：`page:leave` 全量 dispose（全局背景除外）；`mount` 幂等。
8. `prefers-reduced-motion` 与低性能降级接入 `perf` 模块。

修改文件：`src/effects/**`、`src/components/effects/**`、`Layout.astro`（插一个标签）。
依赖：阶段 3（页面容器存在）。
验收：
- 每个效果单独开关，关掉后页面无残留；
- 连续切换 20 次页面，Canvas 数量不增长、事件监听数不增长（Performance 面板 + 自写计数）；
- 移动端无 pointermove 监听；
- reduced-motion 下无位移；
- 帧率 ≥ 50 fps（桌面中端）。

风险：Swup 缓存导致重复初始化 → `Map<id, cleanup>` + 幂等 mount。
回滚：`effectsConfig` 全部 `enabled:false`，功能立即消失，无需回退代码。

---

## 阶段 5 · Three.js（可选，1 天）

**目标**：首页 hero 星球/星环，默认关闭，开启后不影响首屏。

任务：
1. `effects/three/hero-scene.ts`：动态 `import("three")`，星场 ≤6000 点 + 低模星球 + 星环。
2. WebGL 检测与静态回退（WebP/CSS 渐变）。
3. `renderer.setPixelRatio(min(dpr,1.5))`；`visibilitychange` 暂停；离开页面 dispose。
4. 与背景 Canvas 二选一策略：Three 开启时关闭星空 Canvas。

修改文件：`src/effects/three/**`、`HeroCanvas.astro`、`effectsConfig`。
依赖：阶段 4。
验收：
- Three chunk 不进首屏（Network 面板确认）；
- 无 WebGL 环境回退正常；
- 内存：连续进出首页 10 次，GPU 资源不增长；
- 关闭配置后零请求。

风险：GPU 内存泄漏 → 每次 dispose geometry/material/texture + `forceContextLoss()`。
回滚：`three.enabled=false`。

---

## 阶段 6 · Live2D（可选，1–2 天，视授权）

**目标**：看板娘上线；默认关闭；无模型时有静态回退。

任务：
1. 依 `untitled-pixi-live2d-engine` + Pixi 8 做最小验证（加载官方 sample，测内存与帧率）。
2. Core 本地托管，保留版权声明；模型授权记录到 `docs/ASSETS_LICENSE.md`。
3. UI：显示/隐藏、台词气泡、点击动作、视线跟随、拖拽把手、Esc 关闭、`localStorage` 记忆。
4. 避让规则（导航/TOC/搜索面板/灯箱）。
5. 移动端折叠为圆形按钮；`enabled:false` 时零请求。

修改文件：`src/effects/live2d/**`、`Live2DPanel.astro`、`public/live2d/**`。
依赖：阶段 4、模型授权。
验收：
- 桌面/移动截图无重叠；
- 路由切换 10 次不重复创建（实例计数 = 1）；
- 隐藏后网络无模型请求；
- 无模型时静态回退可用。

风险：许可证/模型条款不清 → **不接**，只保留壳与静态回退。
回滚：`live2d.enabled=false` + 移除资源。

---

## 阶段 7 · 性能、安全、可访问性（1 天）

**目标**：达标，不靠感觉。

任务：
1. `scripts/verify-build.mjs`：产物预算、外部请求扫描、每页 title/description/canonical。
2. Lighthouse（移动，Slow 4G）：Performance / SEO / A11y ≥ 90。
3. `pnpm audit`；固定版本核对；锁文件确认。
4. CSP 在预览服务器上加 `'wasm-unsafe-eval'`，实测 Pagefind 搜索。
5. 键盘走查（Tab 顺序、skip link、Esc、焦点环）。
6. 内存：Performance 面板录制 20 次路由切换，堆增长 < 5 MB。

修改文件：`scripts/verify-build.mjs`、`server.preview.py`（预览用，不动线上）。
依赖：阶段 3–6。
验收：以上全部有截图/日志；不达标项列出原因与取舍。

风险：为分数牺牲视觉 → 明确“性能预算优先，视觉在预算内实现”。
回滚：无代码回滚，仅调参。

---

## 阶段 8 · 内容迁移、上线与回滚演练（1.5 天）

**目标**：切到 2778，旧 URL 可用，随时能退回。

任务：
1. 迁移 3 篇文章 + 笔记/实验/现在页到 Content Collections（见 MIGRATION_PLAN）。
2. 旧 URL 301 映射（`server.py` 映射表）。
3. 预览：2779 全站走查 + 移动端真机。
4. 切换：`server.py` 的 `ROOT` 指向 `dist`，重启（需你执行或批准）。
5. 回滚演练：切回旧目录，确认 200；再切回新站。
6. 恢复定时任务（改造后的版本）。

修改文件：`server.py`（ROOT + 301 + CSP）、`crontab`。
依赖：阶段 7。
验收：
- 旧 URL 301 到新地址，状态码与 Location 正确；
- 站内 0 死链；
- 搜索可用；
- 回滚演练记录在案；
- 2778 首页 200，LCP ≤ 2.5s。

风险：切换窗口期短暂 502 → 选择低流量时段，先起 2779 预热。
回滚：`ROOT` 改回 + 重启，1 分钟内完成。

---

## 总排期与依赖

```
P0 ── P1 ── P2 ── P3 ── P4 ── P5(可选) ── P6(可选) ── P7 ── P8
                     └─────── 可与 P5/P6 并行做 P7 的准备 ───────┘
```

预估：P0–P3 约 6 天，P4 2 天，P5/P6 各 1–2 天，P7 1 天，P8 1.5 天。总计 10–13 个工作日（不含模型授权等待）。

---

## 验收总表

| 项 | 标准 |
|---|---|
| 构建 | `pnpm build` 0 error，产物可被任意静态服务器托管 |
| 页面 | 9 类页面全部 200，移动端无横向滚动 |
| 无 JS | 正文、导航、归档、关于可读 |
| SEO | 每页 title/description/canonical/og；sitemap、RSS 正常 |
| 性能 | 移动 Lighthouse ≥ 90；首屏 JS ≤ 140 KB gzip；LCP ≤ 2.5s |
| 动效 | 全部可独立关闭；reduced-motion 全静；切页无泄漏 |
| 安全 | 无外部请求；CSP 实测通过（含 wasm）；`pnpm audit` 无高危 |
| 迁移 | 旧 URL 301；回滚演练成功 |
| 可维护 | 上游边界清单外的文件无改动；季度 merge 可执行 |
