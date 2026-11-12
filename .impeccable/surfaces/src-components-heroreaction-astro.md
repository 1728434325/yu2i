---
version: 1
slug: "src-components-heroreaction-astro"
primary_target: "src/components/HeroReaction.astro"
related_targets: ["src/pages/index.astro","src/scripts/effects.ts","src/styles/reading-companions.css"]
---

# 标题表情、点击爪印与页尾入口

## Direction contract

THESIS: 修正标题挂件和页尾入口的组织方式，给明确的点击补上角色反馈。

OWN-WORLD: 沿用暖纸、墨黑、朱红、明朝体和透明角色，不更换既有视觉系统。

STORY: 标题右侧的羽川默认安静停留；点击播放一次表情。普通点击留下短暂猫爪印，底部说明与四个入口组成清楚的一组。

FIRST VIEWPORT: 标题与独立头像按钮组成同一行，头像贴近字形右上沿并保持正常比例；标题区域使用普通指针，避免角色鼠标与挂件重叠。桌面页尾说明与导航左右排列，手机上下排列。

FORM: 既有页面的局部代码扩展，不创建新视觉世界。日间使用用户新提供的六帧 GIF；夜间延续已有四帧素材，统一静止待机、单次点击播放。

FINISH: 完成真实单次播放、重复点击、主题与路由清理、触屏与键盘验证；桌面及手机截图复核，保留素材来源及本地证据。

## 动效约定

- 标题表情使用原 GIF 的帧顺序和时长，日间六帧共 1080ms，夜间四帧共 1440ms；每次点击从头播放一遍，结束回到静态首帧。
- 只在点击后加载帧图并启动绘制；离开页面、切换形态、页面隐藏或启用减少动态效果时回到静态。
- 点击爪印属于操作反馈，不拦截鼠标和触摸；拖拽不生成，数量有上限，自动淡出。减少动态效果时仅保留淡出反馈。

## 验证与维护

完成后记录。
