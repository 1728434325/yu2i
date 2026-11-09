# 优化记录

每次自动改动一条，倒序在前。回滚点写 commit，出问题 `git revert <commit>`。

---

## 2026-11-10 02:21
- 对比：减三和弦的博客（blog.bdim.moe）
- 改动：文章页在 article__head 顶部加面包屑导航（首页 › 笔记/实验 › 标题），posts/ 三篇与 lab/port-check.html 各加 1 行，assets/site.css 新增 .crumbs 样式 26 行
- 验证：python3 tools/check_site.py 全项 PASS
- commit：f670ddc

