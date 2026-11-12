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

## 已实现的分布

| 位置 | 当前内容 |
| --- | --- |
| 首页「最近」标题线 | `rest` 趴伏角色；首页首屏及原有动态头像保留 |
| 文章列表标题线 | `lean` 托腮角色 |
| 归档标题线 | `rest` 趴伏角色 |
| 文章正文后的返回线 | `lean` 角色，返回文章与归档的链接保留 |
| 关于页正文之后 | 衣橱标题线上的 `lean` 角色，以及六套衣装的日夜配对，共十二张原有插画 |
| 页尾及首页底部入口 | 细横线配小猫；移除独立立绘台，`BaseLayout` 不再挂载 `PawDivider` |

衣装顺序为校服、私服、和服、夏装、礼服、练习服。主图每次显示一套，六个按钮负责选择衣装，日夜主题负责选择该套的形态。首页「换装」入口指向 `/about/#wardrobe`。

## 实现与维护

视觉依据仍为 `src/styles/global.css` 与其后加载的 `src/styles/cinema.css`；局部布局由最后加载的 `src/styles/reading-companions.css` 覆盖。新增区域沿用暖纸、墨色、朱红、细线和自托管 `Hanekawa Mincho`，未添加运行时依赖。衣橱在大于 639px 时左右排列，639px 及以下上下排列。

本次属于既有页面扩展。方向契约原文保留；其中 FINISH 的通用 `DESIGN.md` 项按 Impeccable `new-work.md` 的既有页面扩展规则处理，未新建全局 `DESIGN.md` 或 `.impeccable/design.json`。

| 文件 | 维护职责 |
| --- | --- |
| `src/components/RailCompanion.astro` | `lean` / `rest` 成对姿态，复用 `StickerArt` 的日夜图像渲染 |
| `src/components/SectionHeader.astro` | 可选 `companion` 参数，仅在指定标题旁插入角色 |
| `src/components/Wardrobe.astro` | 六套衣装、说明、按钮语义和状态反馈 |
| `src/scripts/wardrobe.ts` | 换装、自动播放、键盘、可见性和 Astro 生命周期 |
| `src/data/reading-art.ts` 与 `reading-art-assets.json` | 新姿态的日夜映射、导出尺寸及内容版本 URL |
| `src/data/artwork.ts` 与 `artwork-assets.json` | 继续提供原有十二张衣装和小猫，不复制衣装资源 |
| `src/components/Footer.astro` | 紧凑页尾、猫咪横线、RSS、站点地图及返回顶部 |

当前仍保留旧 `footer-art` 样式、`footerOutfits` / `dividerCats` 帮助函数及未挂载的 `PawDivider` 文件，作为遗留实现，不构成新页尾的布局依据。

## 交互与动效

- 换装前等待当前日夜图像 `decode()` 成功；失败时保留原图并通过状态区反馈。异步请求序号阻止快速连选时旧请求覆盖新选择。
- 切换使用 420ms 图像遮罩与 2px 扫描线，旧图以 130ms 淡出；减少动态效果时直接切换静态图。
- 自动播放每 8 秒前进一套。舞台被 `IntersectionObserver` 判为进入视区、页面活跃、用户开启自动播放且允许动态效果时才计时；鼠标悬停图像或衣装选区、聚焦衣橱控件时暂停，自动开关本身的焦点除外。
- 提供上一套、下一套和暂停/恢复按钮。衣装按钮支持 Tab、Enter、左右方向键、Home 和 End；选中状态通过 `aria-pressed` 表达，手动切换结果通过礼貌状态区播报。
- 减少动态效果时关闭呼吸、扫描和自动播放，自动开关显示「手动换装」并禁用；衣装选择和前后切换仍可用。未启用 JavaScript 时保留校服静态展示。
- 日夜切换保留当前衣装。衣装与自动播放意图保存在模块状态中，可跨 Astro 客户端导航保留；整页刷新恢复初始状态。
- 线上的小角色仅在被 `IntersectionObserver` 判为进入视区且页面活跃时运行 9 秒微幅呼吸；文章返回线上的角色保持静态。`astro:before-swap` 释放计时器、监听器、观察器及动画，`astro:page-load` 重新挂载，原有像素角色及召回入口保留。

## 素材与重新导出

完整原始提示词、参考输入及生成模式记录于 [reading-companions-assets.json](./reading-companions-assets.json)。使用内置 `image_gen` 生成日夜两张透明姿态图集，未记录可选择的具体底层模型名称。

- 原始图集：`design/reading/line-poses-day.png` 与 `line-poses-night.png`，各含 `lean` / `rest` 两个姿态；精确提示词保存在 PNG 的 `tEXt` 中。
- 网站资源：`public/images/hanekawa/reading/{day,night}-{lean,rest}.webp`，四张均有透明通道，总计 220,638 字节；每张相邻的 `.webp.json` 保存完整提示词与源图路径，使用工具支持的 sidecar 方式记录来源。
- 导出脚本按真实 alpha 连通轮廓分离姿态、去除孤立杂点、裁剪透明边缘并保留比例，不按固定拼图格线裁切。脚本保留源图、重写四张 WebP 及其来源 sidecar，并生成清单中的尺寸与 SHA-256 内容版本查询参数。
- 原有十二张衣装仍来自 `public/images/hanekawa/collection/`，其生成及切图历史见 [artwork-variety.md](./artwork-variety.md)。

在项目已安装的 Node 24 环境中执行：

```powershell
node scripts/build-reading-art.mjs
pnpm build
pnpm check
```

仅修改新姿态时无需重新生成原有衣装。替换图集时应同步保存实际提示词和 PNG 来源记录，再导出并核对四张图片的透明边缘、承托线接触位置、清单尺寸及来源 sidecar。

## 本地验证记录

以下记录来自最终构建、浏览器复验和独立收尾评审。

- 已读取的 `build.log` 显示 Astro 与 Pagefind 构建通过；`check.log` 显示 58 个文件、0 错误、0 警告、13 条原有 deprecated-z 提示。
- 最终功能检查覆盖首页、关于、文章列表、归档的日夜桌面 1440×1100 与手机 390×844，以及关于页日夜平板 717×734，共 18 个页面/主题/视口组合；21 项交互断言全部通过，包括十二种衣装形态、键盘、前后切换、实际 8 秒自动播放、暂停、离屏暂停、主题与导航保留、减少动态效果及像素角色召回。
- 三类视口均通过真实首页「换装」入口进入衣橱，确认锚点与标题可见。脚本错误、真实失败请求及最终路由取消请求均为 `[]`；首轮 3 条 HTML `ERR_ABORTED` 的记录单独保留在 `review-initial.json`，没有删去或冒充素材加载失败。
- `detector.json` 为 `[]`；来源扫描为 6 张光栅、0 项缺失，包含 2 张原始 PNG 和 4 张 WebP。
- 独立评审结论为 `ship`，无实质修复项。评审查看 4 张联系表和 21 张原始截图；3 张文章截图在等待 Astro 转场 1100ms、回到页首并稳定 250ms 后于原路径重拍，替代无效转场截图再完成完整评审。

证据位于被 Git 忽略的 `logs/reading-companions/`：`review.json`、`build.log`、`check.log`、`provenance.log`、`detector.json` 与 `finish-review.md`。以上为本地组件、交互与页面检查，不代表生产部署或全站端到端验证。
