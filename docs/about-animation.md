# 关于页动态头像与像素角色

白天头像直接恢复原来的 `public/images/about-avatar.gif`：240×240、12 帧，原文件保持不变。夜间头像由生成的 4×4 连续表情帧合成为 240×240、16 帧循环 GIF，文件为 `public/images/hanekawa/about-avatar-night.gif`。

像素角色已升级为全站浮动巡游角色：深发眼镜与白发猫耳两套形态各 44 帧，支持四向行走、拖动和更多动作。64×64 像素帧按 2 倍整数倍率显示，日夜切换沿用当前动作与位置。交互与新素材详情见 `docs/pixel-roaming.md`，关于页提供动作控制。

素材图由内置 image_gen 生成，该接口没有 image2.5 型号选择参数。提示词和素材对应关系在 `docs/about-animation-assets.json`；生成帧图保存在 `design/generated/`。导出时统一做最近邻缩放、二值透明度和轮廓连通清理，避免透明底杂点随角色一起闪动。

安装项目依赖后，使用 Node.js >=22.23.4 运行 `node scripts/build-about-animation.mjs` 可从已保存的帧图重新生成 GIF、静态封面与像素图集；再运行 `pnpm build` 更新站点。合成过程不再调用图像接口。图集与夜间 GIF 的帧信息在 `design/generated/about-animation-manifest.json`。

头像会在降低动态效果偏好下使用静态封面。像素角色在此偏好下默认暂停，用户仍可主动选择播放；浏览器标签隐藏或页面切换时会停止更新，恢复后继续工作。

实现入口：`src/components/AboutAvatar.astro`、`src/components/PixelCompanion.astro` 与 `src/scripts/pixel-companion.ts`。浏览器检查与截图保存在被 Git 忽略的 `logs/about-animation/`。

本地验证：`pnpm check` 与 `pnpm build` 通过。Chromium 在桌面与 390px 手机视口下验证了两套形态：GIF 连续帧变化、挥手换帧、走路位移、跳跃位移、暂停、暂停时切换形态，以及客户端切到文章和首页再返回后的播放；降低动态效果时头像使用静态封面、像素角色暂停。检查没有页面脚本错误、失败请求或横向溢出。结果见 `logs/about-animation/review.json`。
