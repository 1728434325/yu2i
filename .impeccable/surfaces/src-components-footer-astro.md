---
version: 1
slug: "src-components-footer-astro"
primary_target: "src/components/Footer.astro"
related_targets: ["src/components/Wardrobe.astro","src/styles/reading-companions.css","src/pages/about.astro"]
---

# 页面中的羽川与换装

这是对现有物语主题的局部扩展，保留文章、入口、配色、字体、日夜形态及可拖拽像素角色。

## Direction contract

THESIS: 角色借用页面已有的标题线、入口横线和文章返回线休息；移除页尾独立的站立立绘台。

OWN-WORLD: 继承暖纸、墨黑、朱红、细横线及自托管明朝体。新增透明趴伏插画，日间眼镜黑发、夜间白发猫耳，均使用得体的完整服装。

STORY: 阅读保持主线；首页、文章和归档可遇见线上的小角色，关于页可打开衣橱选择六套衣装、观察日夜变化、暂停自动播放。

FIRST VIEWPORT: 首页首屏不变。文章与归档标题右侧出现小幅插画，靠在标题底线上；衣橱位于关于正文之后，一张主图配六个服装按钮，桌面左右排列、手机上下排列。

FORM: 既有页面的代码实现扩展，无新视觉世界、无概念抽签。衣橱为有明确操作的插画展示，不把十二张图重复摆在页尾。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 动效约定

- 焦点：换装用一次短促的横向扫描线和图像遮罩切帧，延续物语画面语言。
- 连续性：主题切换保留当前衣装；Astro 页面切换释放旧的计时器与监听。
- 反馈：衣装选择、上一套、下一套、自动播放状态均可见，可用键盘操作。
- 预算：不增加运行时依赖；8 秒一换，仅在衣橱可见、页面活跃且未悬停或聚焦时播放。减少动态效果时改为手动静态选择。

## 记录

素材提示词、导出路径及最终检查结果已记录在 `docs/reading-companions-assets.json` 和 `docs/reading-companions.md`。

## 维护完成记录（2026-11-11）

已完成本契约的局部实现：角色依附首页「最近」、文章/归档标题、文章返回线及衣橱标题线；独立页尾立绘台和 `PawDivider` 挂载已移除，关于页衣橱复用六套日夜衣装。动效、键盘、资源导出及来源记录见 `docs/reading-companions.md` 与 `docs/reading-companions-assets.json`。

已对照 `src/styles/global.css`、`src/styles/cinema.css` 及最终组件核对，保留既有配色、字体、页面层级与像素角色。此次为既有页面扩展，按 `new-work.md` 的扩展例外保留原视觉系统，未新增 `DESIGN.md` 或 `.impeccable/design.json`；上方 Direction contract 原文未改写。

独立收尾评审为 `ship`，无实质修复项，见 `logs/reading-companions/finish-review.md`。最终构建、类型检查、18 个页面组合及 21 项交互断言通过，脚本错误与失败请求均为 0；证据及修正后的截图依据见维护文档与 `logs/reading-companions/review.json`。
