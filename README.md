# yu2i.site

一个手写的个人博客，没有框架、没有构建步骤、没有外部依赖。

    /home/xyz/sites/yu2i
    ├── index.html            主页（个人介绍 + 总览）
    ├── about.html            关于（关于 / 现在 两个分标签）
    ├── now.html              现在
    ├── search.html           站内搜索（读 search-index.json）
    ├── stats.html            访问统计（由 tools/stats.py 生成，勿手改）
    ├── 404.html
    ├── notes/index.html      内容 / 笔记
    ├── lab/                  内容 / 实验：可交互的小工具
    │   ├── index.html
    │   └── port-check.html   端口排查单生成器
    ├── posts/                文章（每篇一个 HTML）
    ├── assets/site.css       全站样式（一套变量控制明暗）
    ├── assets/site.js        2 KB：主题切换、滚动状态、阅读进度
    ├── assets/portrait.jpg   主页形象（Seedream 生成，带合规标识）
    ├── assets/chibi.jpg      Q 版形象
    ├── assets/avatar.jpg     方形头像裁切
    ├── assets/og.png         1200×630 分享图（tools/og.html 渲染）
    ├── feed.xml              RSS
    ├── search-index.json     搜索索引（生成物）
    ├── server.py             静态服务器
    ├── tools/
    │   ├── build_index.py    重新生成 search-index.json
    │   ├── stats.py          从日志生成 stats.html
    │   ├── stats.tpl.html    stats.html 的模板
    │   ├── og.html           分享图源文件
    │   └── tunnel-up.sh      Cloudflare 隧道的创建与启动
    ├── logs/                 访问日志、服务输出（不对外提供）
    ├── robots.txt
    └── sitemap.xml

## 导航结构

主页只是入口和总览；真正的内容分两组，各带分标签：

- 内容 → 笔记 `/notes/` ｜ 实验 `/lab/`
- 关于 → 关于 `/about.html` ｜ 现在 `/now.html`

分标签用 `.subtabs`，当前页面对应项带 `aria-current="page"`。
新增页面时，记得把它挂进对应分标签，否则会被导航漏掉。

## 安全与隐私

站点对外只提供页面本身，以下是已经落地的边界：

- **不可达**：`/logs/`、`/tools/`、`/data/`、`server.py`、`README.md`，以及
  任何 `.py/.md/.sh/.yml/.tpl.html` 后缀——服务器的 `resolve()` 里直接 404，
  不靠 robots 当访问控制。
- **响应头**：CSP（只允许同源脚本/样式，禁 object、禁 frame、禁表单提交）、
  `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、
  `Permissions-Policy`、`Cross-Origin-Opener-Policy`。`Server` 头不再暴露
  Python 版本。
- **不进索引**：`/stats.html`、`/search.html`、`/neighbors/` 都带
  `noindex` 且 robots 里 Disallow；sitemap 只列正文页。
- **日志**：`logs/access.log` 记录 IP 用于统计，超过 5 MB 自动 gzip 归档
  （`access.log.1.gz`），不直接删除；统计页只展示聚合值，不展示 IP。
- **以后**：域名备案下来、切到 `https://yu2i.site` 后，从 about / now 页
  里去掉 `175.178.200.224` 字样，只保留域名。

## 每小时任务

crontab 之外，另有一个 Hermes 定时任务（每小时）做两件事：

1. 跑 `tools/neighbor_pick.py --max 2`：从博客大联盟、开往的公开接口取候选，
   验证可达与中文内容，最多新增 2 个友邻，写入 `data/neighbors.json`，
   再渲染 `/neighbors/`。
2. 从抓到的样本里记 **一条可验证的灵感** 到 `data/inspiration.md`，
   不摘抄原文、不复制图片。

它**不会**改 HTML/CSS/JS，只动数据和生成页。灵感攒着，等人来做。

## 动效

原则：动效只用来说明“东西从哪来、到哪去”，不做无目的的循环。

- 首屏：`data-hero` 元素用 CSS `animation` 进場，`--d` 由 JS 按组内顺序设 90ms 步进；
  `h1` 用 `.line-mask` 做逐行上推。
- 滚动：`data-anim` 用 CSS `animation-timeline: view()`（Chrome/Edge 支持），
  其余浏览器直接显示，**不靠 JS 把内容藏起来**。
- 微交互：条目箭头位移、标签下划线生长、图片悬停微放大、顶部阅读进度条（每页）。
- `prefers-reduced-motion: reduce` 时全部动画关闭，内容立即可见。
- 参考了 motionsites.ai 的分层 reveal 与指针联动，但只取节奏，没有搬视频、3D、玻璃拟态。

## 配图

`assets/portrait.jpg` / `chibi.jpg` / `avatar.jpg` 由 Seedream（`byted-ark-seedream-skill`）生成，
右下角带“AI 生成”标识——那是合规要求，不要裁掉。
凭据用法见 `~/.hermes/skills/media/byted-ark-seedream-skill/LOCAL-NOTES.md`。

## 运行

    cd /home/xyz/sites/yu2i
    python3 server.py          # 监听 0.0.0.0:2778

对外地址：<http://yu2i.site:2778>

服务器提供：干净 URL（`/notes` → `/notes/`，`/about` → `about.html`）、
gzip、缓存头、安全头、自定义 404，并把请求写进 `logs/access.log`。
`logs/`、`tools/`、`server.py` 本身不对外提供。日志优先记录
`CF-Connecting-IP`，因此走隧道后仍能看到真实访客 IP。

开机自启由用户级 crontab 负责：

    @reboot ... server.py
    */5  * * * * 健康检查，挂了就拉起
    */10 * * * * tools/stats.py  重新生成统计页
    30 4 * * *   tools/build_index.py  重建搜索索引

## 加一篇新文章

1. `cp posts/static-first.html posts/<slug>.html`，改标题、`canonical`、kicker、正文。
2. 在 `index.html`、`notes/index.html`、`sitemap.xml`、`feed.xml` 里加条目。
3. `python3 tools/build_index.py` 重建索引（或等凌晨的定时任务）。
4. 刷新页面看，没有构建步骤。

## Cloudflare 隧道（https 与裸域名）

不需要在腾讯云开放任何端口：隧道是**出站**连接到 Cloudflare，再把流量
转回本机 2778。

前提（用户操作）：域名已加入 Cloudflare，且 DNSPod 处的 NS 已改成
Cloudflare 给的两个地址，状态变 Active。

然后：

    ~/.local/bin/cloudflared tunnel login     # 打印网址，在浏览器授权 yu2i.site
    cd /home/xyz/sites/yu2i && tools/tunnel-up.sh

`tunnel-up.sh` 会创建名为 yu2i 的隧道、写 `~/.cloudflared/config.yml`、
把 `yu2i.site` 的 DNS 指到隧道，并在后台启动。之后把下面这行加进 crontab：

    @reboot cd /home/xyz/sites/yu2i && setsid nohup /home/xyz/.local/bin/cloudflared tunnel --config /home/xyz/.cloudflared/config.yml run yu2i >> logs/tunnel.out 2>&1 &

隧道通了之后，把全站的 `http://yu2i.site:2778` 换成 `https://yu2i.site`：

    grep -rl 'http://yu2i.site:2778' . --include='*.html' --include='*.xml' --include='*.json' \
      | xargs sed -i 's|http://yu2i.site:2778|https://yu2i.site|g'

## 已知边界

- 目前只走 HTTP（域名带 `:2778`）；TLS 依赖上面的 Cloudflare 隧道。
- 单进程、未做并发压测；个人博客量级足够。
- 文章是手写的，没有 Markdown 解析器；这样最不容易坏。
- 统计页只统计公网来源，本机健康检查与截图流量会被剔除。
