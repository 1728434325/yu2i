# MIGRATION_PLAN.md — 旧站迁移与上线方案

> 原则：线上 `~/sites/yu2i`（2778）在切换前不动；新站独立目录 `~/sites/yu2i-next`；先快照、再预览、后切换、必演练回滚。

---

## 1. 旧站资源清单（实测）

### 1.1 页面（13 个 HTML）

| 路径 | 类型 | 处理 |
|---|---|---|
| `/index.html` | 首页 | 重写为 Fuwari 首页 |
| `/about.html` | 关于 | 转 Markdown，`/about/` |
| `/now.html` | 现在 | 转 Markdown，`/now/` |
| `/posts/static-first.html` | 文章 | 转 Markdown |
| `/posts/port-2778.html` | 文章 | 转 Markdown |
| `/posts/toolkit.html` | 文章 | 转 Markdown |
| `/notes/index.html` | 笔记列表 | 重做为 `/notes/` |
| `/lab/index.html` | 实验列表 | 重做为 `/lab/` |
| `/lab/port-check.html` | 工具页 | 原样迁移（独立静态页 + JS） |
| `/neighbors/index.html` | 友邻 | 重做为 `/friends/` |
| `/search.html` | 站内搜索 | 替换为 Pagefind `/search/` |
| `/stats.html` | 访问统计 | **下线**（含 IP 聚合，隐私面） |
| `/404.html` | 404 | 重做 |

### 1.2 静态资源

- `assets/`：`og.png`、`portrait.jpg`、`chibi.jpg`、`avatar.jpg`、`site.css`、`site.js`
- 处理：图片迁入 `public/images/`（重命名、压缩为 WebP/AVIF，保留原图在 `legacy/`）；`site.css/site.js` 废弃，由新设计系统替代。

### 1.3 服务与脚本

| 项 | 现状 | 处理 |
|---|---|---|
| `server.py` | 178 行，`0.0.0.0:2778`，PID 3894431 | 保留，改 `ROOT` 常量 + 301 映射 + CSP |
| `tools/stats.py` | 每 10 分钟解析 `logs/access.log`，生成 `stats.html` | 停用（统计页下线）；日志保留本地 |
| `tools/build_index.py` | 每天 4:30 生成搜索索引 | 停用（Pagefind 接管） |
| `tools/neighbor_pick.py` 等 | 每小时抓公开目录 | **暂停**，迁移完成后再改造 |
| `data/` | neighbors.json、inspiration.md、changelog.md | 移到新站 `data/`（不参与构建）或保留旧目录 |

### 1.4 定时任务（crontab 实测）

```
@reboot           启动 server.py
*/5 * * * *       健康检查（失败则重启）
*/10 * * * *      stats.py
30 4 * * *        build_index.py
```
另有 Hermes 每小时「邻居与灵感」任务（写 `data/`）。

处理：
- `@reboot` 与健康检查：切换后改指向新站根目录，**保留**。
- `stats.py`、`build_index.py`：切换后注释掉。
- 邻居任务：阶段 0 暂停；阶段 8 改造为只写 `data/`、不碰站点文件后再恢复。

---

## 2. URL 映射与 301

| 旧 URL | 新 URL | 方式 |
|---|---|---|
| `/` | `/` | 直接 |
| `/index.html` | `/` | 301 |
| `/about.html` | `/about/` | 301 |
| `/now.html` | `/now/` | 301 |
| `/posts/static-first.html` | `/posts/static-first/` | 301 |
| `/posts/port-2778.html` | `/posts/port-2778/` | 301 |
| `/posts/toolkit.html` | `/posts/toolkit/` | 301 |
| `/notes/` | `/notes/` | 直接 |
| `/lab/` | `/lab/` | 直接 |
| `/lab/port-check.html` | `/lab/port-check/` | 301 |
| `/neighbors/` | `/friends/` | 301 |
| `/search.html` | `/search/` | 301 |
| `/stats.html` | `/` | 301（页面下线，回首页） |
| `/404.html` | `/404.html` | 保留 |

实现：`server.py` 里加 `REDIRECTS = { "/index.html": "/", ... }`，命中即 `301 + Location`，查询串原样保留。上线后用脚本遍历旧 URL 校验状态码与 `Location`。

**注意**：新站 `trailingSlash: always`，无斜杠访问会产生一次跳转；`server.py` 对目录请求返回 `index.html`，不额外 301，避免双跳。

---

## 3. 内容迁移

| 内容 | 目标 |
|---|---|
| 3 篇文章 | `src/content/posts/<slug>.md`，frontmatter：`title/published/description/tags/category/lang: zh_CN` |
| 关于、现在 | `src/content/spec/about.md`、`now.md` |
| 笔记 | `src/content/notes/*.md`（短条目）或合并为 `spec/notes.md` |
| 实验 | `src/pages/lab/index.astro` + `lab/port-check` 静态页 |
| 友邻 | 从 `data/neighbors.json` 生成 `src/pages/friends.astro` 的静态数据（构建期读取，不在前端抓取） |
| 图片 | 迁入 `public/images/`，压缩；删除原 `assets` 引用 |

要求：
- 原文逐字保留（除链接与图片路径），存 `legacy/` 做对照。
- 每篇迁移后对比旧页面正文纯文本长度，差异 > 5% 需人工复核。
- 文章 slug 与旧文件名一致，保证 301 目标存在。

---

## 4. 预览环境

- 目录：`~/sites/yu2i-next/dist`
- 端口：**2779**
- 预览服务器：`server.preview.py`（复制线上 `server.py` 的安全头逻辑，含正确 CSP；只读 `dist`）
- 访问：`http://127.0.0.1:2779/`，外部 `http://175.178.200.224:2779/`（需安全组允许 2779；若不开放，用本机截图 + `curl` 验收）
- 验收项：所有页面 200、旧 URL 301、Pagefind 搜索可用、CSP 无报错、移动端视图。

---

## 5. 发布流程

1. **冻结**：确认 2779 全部验收通过；记录 `dist` 校验和。
2. **备份**：再次打 tar（含 `dist` 与旧站）。
3. **切换**：`server.py` 的 `ROOT` 从旧目录改为 `../yu2i-next/dist`，加入 301 表与 CSP（`wasm-unsafe-eval`）。
4. **重启**：`kill` 旧进程后由 cron 健康检查拉起，或手动 `setsid python3 server.py &`。
5. **验证**：`curl` 检查首页、文章、旧 URL 301、搜索资源、静态资源 200。
6. **观察**：30 分钟内看 `logs/access.log` 的 5xx 与 404 峰值。
7. **恢复定时任务**：健康检查指向新根；邻居任务改造后启用。

---

## 6. 回滚流程（必须演练一次）

触发条件：切换后 30 分钟内出现不可接受的 5xx、页面空白、搜索不可用、CSS 丢失。

步骤：
1. `server.py` 的 `ROOT` 改回旧目录（单个常量）。
2. 重启进程（cron 5 分钟内自动拉起，或手动）。
3. 验证旧站首页 200、文章 200。
4. 记录事故原因与修复项，不带着问题上新站。

回滚目标：**≤ 5 分钟**恢复旧站。演练在阶段 8 执行，记录时间。

---

## 7. 域名与 SEO

- `astro.config.mjs` 的 `site`：当前用 `http://175.178.200.224:2778`；备案完成、Cloudflare Active 后切 `https://yu2i.site`。
- canonical、sitemap、RSS 全部由 `site` 派生，切换时一次改。
- 301 保留至少 12 个月；旧 URL 不删除。
- `robots.txt` 保留 sitemap 指向；新站不需要 `noindex` 页面（搜索页可 `noindex`）。

---

## 8. 迁移验收清单

- [ ] 13 个旧 URL 全部返回 200 或 301（无 404）。
- [ ] 3 篇文章正文与旧版一致（纯文本比对）。
- [ ] 图片全部本地化，无外链。
- [ ] 搜索可用（CSP 正确）。
- [ ] 移动端 360/390/414 宽无横向滚动。
- [ ] 无 JS 时正文可读。
- [ ] 定时任务清单更新并记录。
- [ ] 回滚演练完成，计时 ≤ 5 分钟。
- [ ] `git tag post-redesign-2026-11` 存在。

---

## 9. 迁移期的隐私与安全

- `logs/access.log` 含 IP，不上传到任何地方；`stats.html` 下线，避免公开聚合数据。
- `legacy/`、`data/`、`tools/`、`docs/` 不进入 `dist`；构建脚本检查产物中无 `server.py`、`.env`、`*.md` 源文件。
- 预览端口 2779 只用于验收，上线后关闭。
- Live2D 模型与 Core 的授权文件放 `docs/ASSETS_LICENSE.md`，与资源同目录留 `LICENSE.txt`。
