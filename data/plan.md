# 优化计划

状态：`[ ]` 待做 · `[~]` 正在做 · `[x]` 完成 · `[!]` 放弃（附原因）

一项一行，写清楚：改什么、为什么、动哪个文件。任务每小时执行第一项未完成项。
不要在这里堆愿望，队列不超过 5 项；做完再补。

---

- [!] 文章页加面包屑——参考 减三和弦的博客，但本站只有两级（nav + 分标签已表达），面包屑重复“笔记/方法”，反而多一层噪声。已移除（commit 见 changelog）。教训：导航类改动先问“是否和现有层级重复”。
- [x] 文章页文末加「复制链接」——参考 51chifuns blog 的分享按钮。本站不引入第三方分享脚本，用原生复制（execCommand 兜底），按钮复用已有 .copy 样式，放文末笔记行与 footer 之间右对齐。改 posts/ 三篇、lab/port-check.html、assets/site.css、assets/site.js。
- [x] 文章页自动目录——参考 codeqihan的博客 文章页的 toc。compare_pick 报的 toc 信号其实是 autocomplete 误匹配，本站并没有目录。做法：site.js 检测 .prose 内 h2 ≥3 时生成 nav.toc（原生元素、无外链），滚动高亮当前小节；site.css 新增 10 行（左侧细线、等宽序号、移动端去序号）。不新增导航层级。
- [x] 文章页文末「回到顶部」——参考 longBlog（huowenlong.com）文章页的 data-back-to-top。本站不放浮动按钮（窄屏会挡正文），放在 .article__share 工具行、复制链接左侧：`↑ 回到顶部` 指向 #main，复用已有 smooth scroll（reduced-motion 下自动关闭）。改 posts/ 三篇、lab/port-check.html、assets/site.css。
- [x] 文章页脚注：正文行内 sup.fn-ref 编号 + 文末 ol.footnotes 注释（原生锚点、无脚本；:target 高亮落点），参考 gengyue's webpage 的 footnotes。不改导航层级。先用于 port-2778 的内核 sysctl 说明、static-first 的体积实测，并把该段漂移的数字改回实测值。改 posts/ 两篇 + assets/site.css。
- [!] 文章「系列/合集」索引——compare_pick 报 series 缺口（Est's Blog 有系列页）。本站只有 3 篇文章、主题各不相同，硬加系列 meta 等于给不存在的东西造目录，属于为对比而加噪声。等真的写到成组的文章（≥3 篇同主题）再说。
