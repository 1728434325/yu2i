# Live2D 看板娘：配置、替换与限制

> 当前状态：**页面使用紫铃（纯 JS Web Component，用户提供的 moudle.zip）**；Live2D 管线（Haru 模型 + Pixi + Cubism Core）已完整实现但**暂停**，资源移到 `vendor/live2d/`，等换成正式模型时再切回。
> 切换方法：把 `vendor/live2d/*` 移回 `public/live2d/`，在 `BaseLayout.astro` 把 `<ZilingMascot />` 换回 `<Live2DWidget />`，并把 `src/config/live2d.ts` 的 `modelPath` 指向模型。
> 紫铃为纯 JS、本地 PNG、无网络请求；Live2D 部分仍保留全部代码与文档，后续切换不需要重写。

> 原始记录（Live2D 接入）：已接入 **Live2D 官方示例模型 Haru**（`public/live2d/models/Haru/`），Cubism Core 5.1.0 本地托管。
> 模型来源：`Live2D/CubismWebSamples`（官方仓库）。依据 Live2D《无偿提供素材使用授权协议》与《示例数据利用条件》，一般用户/年营收 <1000 万日元的实体可商用或非商用使用，需保留著作权标示；角色设计不得修改。本站已在关于页标注。
> `modelPath` 置空时自动回到静态立绘，不创建 WebGL 上下文、不加载 Pixi。

---

## 1. 现在的实现

| 层 | 文件 | 职责 |
|---|---|---|
| 配置 | `src/config/live2d.ts` | 唯一开关与参数入口 |
| 组件 | `src/components/Live2DWidget.astro` | 挂载点、气泡、显隐按钮；`transition:persist` 跨页常驻 |
| 渲染 | `src/live2d/renderer.ts` | Cubism Core 注入、Pixi 6 + `pixi-live2d-display` 加载、透明画布、缩放与布局 |
| 控制 | `src/live2d/controller.ts` | 点击/悬停/切页/待机、鼠标视线、显隐、资源释放（单例） |
| 台词 | `src/live2d/lines.ts` | 本地台词库与早晚问候 |
| 气泡 | `src/live2d/speech.ts` | 逐字出现、自动消失、冷却 |
| 样式 | `src/styles/live2d.css` | 左下角布局、透明 Canvas、命中区、移动端与减弱动效 |

技术栈：Astro 7.4.8、无 Swup（用原生 ClientRouter）、PixiJS **6.5.10**、`pixi-live2d-display` **0.4.0**（MIT）。选 Pixi 6 是因为该库只兼容 6.x；Pixi 8 需要另一套引擎（如 `untitled-pixi-live2d-engine`），未采用。

---

## 2. 如何导入自己的模型

### 2.1 目录规范

```
public/live2d/
├─ core/
│  └─ live2dcubismcore.min.js        # 官方 Cubism Core（从 Cubism SDK for Web 提取）
└─ models/
   └─ <name>/
      ├─ <name>.model3.json
      ├─ <name>.moc3
      ├─ textures/*.png
      ├─ motions/*.motion3.json
      └─ expressions/*.exp3.json
```

### 2.2 步骤

1. 把模型按上面的结构放好，确认 `.model3.json` 里的相对路径与实际文件一致。
2. 从 Live2D 官方 Cubism SDK for Web 中取出 `live2dcubismcore.min.js`，放到 `public/live2d/core/`。
3. 改 `src/config/live2d.ts`：

```ts
modelPath: "/live2d/models/<name>/<name>.model3.json",
```

4. `pnpm build`，刷新页面。加载成功时 `#live2d` 的 `data-mode` 会变成 `live2d`，Canvas 显示、静态立绘隐藏。
5. 只想看代码路径、没有模型时，保持 `modelPath: ""` 即可。

### 2.3 授权（必须自己确认）

- **模型**：每个模型有自己的使用条款。官方 sample 模型也不是无条件可商用；来源不明的模型不要用。
- **Cubism Core**：专有许可，个人与年营收 < 1000 万日元的实体免发布许可；允许随站点分发，但要保留版权声明，禁止反向工程。
- **引擎**：`pixi-live2d-display` 与 PixiJS 均为 MIT。

本站**没有**下载任何模型；`live2d-widget`（GPL-3.0）也没有引入。

---

## 3. 透明 Canvas 的处理

- Pixi Application 用 `backgroundAlpha: 0`，没有任何背景填充。
- Canvas CSS `background: transparent`，不包可见的矩形容器底色。
- 没有用 `opacity` 模拟透明；透明度只作用于气泡淡入。
- `resolution` 上限 2，`autoDensity` 打开，避免高分屏发灰。
- `premultipliedAlpha` 使用 Pixi 默认值，纹理按 Pixi 的 alpha 规则混合。
- Canvas `pointer-events: none`，永远不接收点击；交互由独立的命中区负责。

---

## 4. 点击穿透与命中区

- Canvas 只作为渲染层，`pointer-events: none`。
- 命中区 `.live2d__hit` 覆盖角色实际边界（模型加载后按 `getBounds()` 更新，没有模型时是静态立绘的范围），约 279×351，位于左下角。
- 命中区之外（包括 Canvas 的透明角落）点击直接落到页面。
- 限制：这是**矩形命中区**，不是逐像素命中。角色张开手臂的空隙仍会算作命中；要做到像素级，需要在 Pointer 事件里读 WebGL 像素或使用模型的 hit areas，代价更高。触屏上矩形命中区同样生效，收益是手指不需要精确。
- 移动端默认不启用模型（`mobileEnabled: false`）；静态回退仍可点击互动。

---

## 5. 配置项（全部生效）

| 字段 | 作用 |
|---|---|
| `enabled` | 总开关；false 时组件不初始化 |
| `modelPath` | 模型入口；空字符串 = 静态回退 |
| `corePath` | Cubism Core 地址，本地托管 |
| `position` | `bottom-left` / `bottom-right` |
| `desktopScale` / `mobileScale` | 模型缩放 |
| `offsetX` / `offsetY` | 相对左下角的偏移 |
| `desktopWidth` / `mobileWidth` | Canvas 宽度（高度按 1.35 比例） |
| `enableMouseTracking` | 鼠标视线跟随（模型支持时） |
| `enableClickInteraction` | 点击台词与动作 |
| `enableSpeech` | 气泡总开关 |
| `enableIdleAnimation` | 待机台词 |
| `mobileEnabled` | 移动端是否启用模型 |
| `respectReducedMotion` | 减弱动效时关闭逐字动画 |
| `idleAfterMs` | 无操作多久进入安静待机 |
| `speechCooldownMs` | 两次气泡之间的最小间隔 |

隐藏偏好存 `localStorage` 的 `yu2i-live2d-hidden`；`Esc` 也可隐藏。

---

## 6. 台词、动作、表情怎么加

- **台词**：改 `src/live2d/lines.ts` 里对应数组（`welcome` / `click` / `hover` / `article` / `page` / `idle` / `morning` / `afternoon` / `evening`）。早晚问候按本地小时切换。
- **动作**：`controller.ts` 里点击时尝试 `model.motion("TapBody", 0)`；换成你模型里真实存在的 group 名即可。模型没有该组时会被 try/catch 吞掉，不报错。
- **表情**：可以在 `lines.ts` 旁边维护台词到表情的映射，调用 `model.expression(id)`；同样要先确认模型里存在对应表情。

---

## 7. 生命周期与性能

- 组件在 `BaseLayout` 中，带 `transition:persist`，ClientRouter 切页时 DOM 不被替换。
- 控制器是模块级单例：切页不会重复 `new`、不会重复注册监听、不会重复加载纹理。
- `pagehide` 时 `destroy()`：停 ticker、移除监听、`app.destroy` 释放纹理与 WebGL 上下文。
- 页面隐藏时 `ticker.stop()`，回来再 `start()`。
- 只有配置了 `modelPath` 才动态 import Pixi 与模型；空配置时**零 WebGL、零 Pixi 请求**。
- 模型加载失败（404、Core 缺失、模型格式不支持）→ catch 后回到静态回退，博客不受影响。

---

## 8. 已验证 / 未验证

**已验证（CDP + 服务端日志）**

- `data-mode=fallback`，Canvas `display:none`、背景 `rgba(0,0,0,0)`、`pointer-events:none`
- 点击命中区弹出气泡台词；切到 `/posts/` 后 `#live2d` 仍只有 1 个，未重复创建
- 隐藏后 `localStorage` 写入 `1`
- 控制台无 error；无模型时 `pixi` 零请求
- 故意配置不存在的模型路径：加载失败 → 回退，页面无异常，无 console error
- 接入 Haru 后：Core 5.1.0 初始化完成、moc3/两张纹理/idle 与 m15 动作全部 200、无回退告警

**未完成视觉验收（无头浏览器软件渲染会崩，需真实浏览器确认）**

- 真实模型的透明边缘、动作、表情、视线跟随
- 模型在移动端的性能与裁切
- 逐像素命中（当前是矩形命中区）

---

## 9. 已知限制

1. 没有模型就没有“真正的 Live2D”视觉；静态缩略图只是占位。
2. `pixi-live2d-display` 最后更新在 2024-08，只支持 Pixi 6；升级路径是 Pixi 8 + `untitled-pixi-live2d-engine`，需要重写 renderer。
3. 矩形命中区无法做到“只点角色像素才响应”。
4. 移动端默认关闭模型，只保留静态回退。
5. 视线跟随调用 `model.focus()`，不同模型/版本的可用性不一致，失败时静默降级。


---

## 10. 紫铃（当前使用的临时看板娘）

- 文件：`public/ziling/ziling.js` + `public/ziling/character-base.png`（1024×1536，带 alpha）
- 组件：`src/components/ZilingMascot.astro`，自定义元素 `<ziling-mascot>`，`transition:persist` 跨页常驻
- 能力：眨眼、视线跟随鼠标、待机台词、点击摸摸头、气泡、折叠/展开（`localStorage` 记忆）
- 透明：PNG 自带 alpha；组件内 Canvas/图片层不填背景，角色以外真正透明
- 点击穿透：宿主 `pointer-events: none`，只有按钮和命中区 `auto`
- 只在首页与 404 显示：阅读页（文章/关于/归档/搜索）不挂载，避免气泡遮正文
- 桌面端靠右下（`--ziling-left: calc(100vw - 280px)`），移动端保持左下，宽 144
- 来源：用户提供的 `moudle.zip`，本地资源，无外部依赖；未附带独立许可证文件，按用户自有素材处理

切换回 Live2D 时，以上三条命令即可，不需要改动页面其它部分。


## 11. 关于页头像

- 资源：`public/images/about-avatar.gif`（原 GIF 358×356 / 12 帧 / 820 KB → 优化为 240×240 / 12 帧 / 278 KB）
- 用法：`src/pages/about.astro` 顶部，`rounded-full` 裁圆，`object-fit: cover`
- 旧的无用 `avatar.jpg` 已移除


## 12. Q 版形象（当前使用）

- 资源：`public/images/chibi-mascot.webp`（512×551，带 alpha，41 KB）；源图由用户提供
- 处理：去掉原图烘焙的灰白棋盘格（按低饱和高亮背景做全局蒙版 + 中值/收边/羽化），深浅两套主题下都无白边
- 组件：`src/components/ChibiMascot.astro` + `src/styles/chibi.css`
- 行为：点击说台词、气泡淡入淡出、隐藏状态存 `localStorage`、`Esc` 关闭、`prefers-reduced-motion` 关闭弹跳
- 位置：桌面贴左下，只在首页出现；移动端隐藏（避免遮挡 Hero 图集）
