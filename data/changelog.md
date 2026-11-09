# 优化记录

每次自动改动一条，倒序在前。回滚点写 commit，出问题 `git revert <commit>`。

---

## 2026-11-10 05:20
- 对比：longBlog（huowenlong.com）
- 发现：compare_pick 报 gaps=[]（本站 9 个信号已全具备）；对方文章页另有 data-back-to-top 按钮
- 判断：不照搬浮动按钮（窄屏会遮正文），改成文末工具行里的文字链接；只做回看动作，不与 nav/分标签重复
- 改动：posts/ 三篇 + lab/port-check.html 各加 1 行 a.to-top → #main；site.css +13/-1（.article__share 加 align-items 与 gap，新增 .to-top）
- 验证：check_site PASS；本地 2778 curl 200 且链接与样式已下发
- commit：4ec9964


## 2026-11-10 04:20
- 对比：codeqihan的博客（www.codeqihan.com）
- 发现：compare_pick 报 gaps=[breadcrumbs]（已否决项）；核对时发现自家的 toc 信号是 autocomplete 误匹配，三篇长文其实没有目录
- 判断：目录只列正文 h2、不重复 nav 与分标签，属新增信息而非层级噪声
- 改动：site.js +43 行（.prose 内 h2 ≥3 时插入 nav.toc，滚动高亮 is-active）；site.css +10 行（左侧细线、等宽序号、移动端去序号）
- 验证：check_site PASS（html/css/js/内链/无三方资源全项）
- commit：f801f67


## 2026-11-10 03:20
- 对比：51chifuns blog（51chifun.cc.cd）
- 判断：对方文章页有整组分享按钮；本站不上第三方脚本，只取“复制本文链接”一个动作，http 下用 execCommand 兜底
- 改动：posts/ 三篇与 lab/port-check.html 各在文末笔记行后加 .article__share + .copy 按钮；site.css +9 行；site.js +29 行
- 验证：check_site PASS（含内部链接、无第三方资源）
- commit：9619447

## 2026-11-10 02:40 · 回滚面包屑
- 对比：减三和弦的博客（blog.bdim.moe）
- 判断：面包屑与「笔记/实验」分标签、kicker 的分类重复；本站只有两级，不需要第三层
- 改动：移除 4 个页面里的 .crumbs 与 site.css 中的 26 行样式
- 验证：check_site PASS
- 记录：计划项标 [!]，规则写入任务提示

## 2026-11-10 02:21
- 对比：减三和弦的博客（blog.bdim.moe）
- 改动：文章页在 article__head 顶部加面包屑导航（首页 › 笔记/实验 › 标题），posts/ 三篇与 lab/port-check.html 各加 1 行，assets/site.css 新增 .crumbs 样式 26 行
- 验证：python3 tools/check_site.py 全项 PASS
- commit：f670ddc

