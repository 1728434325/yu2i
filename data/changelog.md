# 优化记录

每次自动改动一条，倒序在前。回滚点写 commit，出问题 `git revert <commit>`。

---

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

