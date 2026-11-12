# 贴图与透明图标更新

更新说明：下表的页尾 2/2/1/1 分配是上一轮实现的历史记录。当前已移除独立页尾立绘台，十二张衣装在关于页衣橱中按六套日夜配对使用；当前分布与维护方式见 [reading-companions.md](./reading-companions.md)。以下保留原始素材及验证历史。

本地预览：<http://localhost:2778/>。

用户所说的 `tem` 素材实际保存在 `tmp/`。原始文件保留，生成的透明处理版本及新猫咪图集放在 `design/variety/`，网站使用 `public/images/hanekawa/collection/` 的 WebP。

## 页面分配

| 位置 | 素材 |
| --- | --- |
| 首页页尾 | 校服、休闲装，两张 |
| 关于页尾 | 和服、夏装，两张 |
| 文章列表及正文页尾 | 礼服，一张 |
| 归档页尾 | 武术装，一张 |
| 精选文章、在做的事、最近 | 不同表情的大头照 |
| 首页标题 | 提供的日夜动态头像，减少动态效果时显示静态首帧 |

人物随日夜主题切换。新生成的六种猫咪为坐姿、蜷睡、伸懒腰、洗脸、行走、侧躺，分别用于卡片、按钮、分隔线及首页底部入口。入口猫咪独立定位并按原比例缩放，卡片不再拉伸整张猫咪边框。

`favicon.ico` 移除了原图四角的黑色画布，保留猫、书、月亮及原来的圆角图案。ICO 包含 16、24、32、48、64、128、256 七种 RGBA 尺寸，并同步导出 PNG 与 Apple 图标；图标链接及切图目录使用内容版本以刷新缓存。

## 素材维护

完整生成提示词、输入输出及分配记录见 [artwork-variety-assets.json](./artwork-variety-assets.json)。

使用 Node 24 环境重新导出及构建：

```powershell
node scripts/build-artwork-variety.mjs
pnpm build
pnpm check
```

素材目录由 `src/data/artwork-assets.json` 记录，路由和形态映射位于 `src/data/artwork.ts`。切图会保留跨越拼图格线的鞋尖，并移除邻格碎片。

## 验证记录

- Astro 与 Pagefind 构建通过；Astro 检查 51 个文件，0 错误、0 警告，另有 13 条原有 deprecated-z 提示。
- 首页、关于、文章、归档 × 日夜 × 桌面/手机，共 16 组浏览器检查通过；32 项素材正常加载并保留透明通道。
- 页尾数量、图片比例、无横向溢出、入口链接、页面切换、减少动态效果及像素角色召回均通过，未记录浏览器脚本错误或失败请求。
- ICO 七个尺寸的四角 alpha 均为 0；桌面及手机截图完成目视确认。
- `git diff --check` 通过。
- 仓库原有的 `pnpm verify` 指向缺失的 `scripts/verify-build.mjs`，该命令未通过；上述实际构建及浏览器检查单独记录。

本地检查证据位于被 Git 忽略的 `logs/artwork-variety/`。
