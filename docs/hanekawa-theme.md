# 羽川翼日夜主题

本次按用户提供的三张羽川翼截图更新视觉：暖金逆光、朱红、墨黑、明确的明暗块面，以及带衬线的电影标题排版。参考入口为[伤物语官方角色页](https://www.kizumonogatari-movie.com/character.html)与[官方美国站](https://kizumonogatari-usa.com/)。夜间使用白发猫耳的黑羽川形态。

## 素材

- `design/generated/`：生成素材的原始透明 PNG。
- `public/images/hanekawa/`：网站实际使用的透明 WebP，保留 alpha。
- `docs/visual-assets.json`：每份图片的生成提示词与用途。
- 图片通过内置 image_gen 生成。该接口没有具体型号选择参数，因此未标记为已调用 image2.5。
- 标题字体为本地托管的 Noto Serif SC 字符子集，许可证在 `public/fonts/OFL.txt`。

日间头像、夜间头像、日间全身立绘、夜间全身立绘、猫咪卡片框、页尾黑白双猫，分别用于标题、鼠标指针、看板娘、首页、关于页、卡片、按钮与页尾。

左下角看板娘恢复原来的 Q 版上半身立绘：日间直接复用 `public/images/chibi-mascot.webp`，夜间使用同一张原图生成的白发猫耳版本。桌面恢复原来的左侧 16px、底部 8px 位置及最大 190px 的宽度；手机恢复 92px 的紧凑形象。两种主题下均支持点击对话、收起与展开。

## 配色与组件

日间使用暖纸色 `#f2eadb`、墨色 `#302922`、朱红 `#9e3528`。夜间使用深墨色 `#171615`、米白 `#f1e3ce`、暖朱红 `#f1a48b`。

`ThemedArt.astro` 负责两种形态的图片切换。`cinema.css` 负责主题、猫咪边框、按钮、标签、标题、阅读页、页尾和移动端布局。正文与现有内容入口保留。

## 页面切换与动画

主题切换使用 document 级事件代理，并在 `astro:before-swap` 中将当前主题写入新文档，避免按钮替换后失去绑定或换页闪回其他形态。

画布、光标、滚动观察器、看板娘监听与定时器归属当前页面的 AbortController。换页前清理，`astro:page-load` 后重建；离开或隐藏页面时停止，恢复可见或从浏览器缓存恢复时重新创建。降低动态效果偏好会停用粒子与跟随光标，正文始终可读。

搜索 UI 也按页面生命周期挂载，避免重复访问时累积初始化监听。

## 本地运行

项目要求 Node.js >= 22.23.4。本次使用本机已有的 Node.js 24 完成 `pnpm check` 与 `pnpm build`。

构建完成后在项目目录运行 `python server.py`，访问 `http://localhost:2778/`。静态服务器已补全 WebP 和 TTF 的 MIME 类型。

浏览器检查结果与日夜、桌面、手机截图保存在被 Git 忽略的 `logs/hanekawa-review/`。
