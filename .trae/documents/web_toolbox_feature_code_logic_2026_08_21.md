# Web Toolbox 功能代码逻辑说明

## 总体架构

项目采用 Vite + Vanilla TypeScript + 原生 CSS。运行时不依赖后端，所有工具输入都在浏览器本地处理。PDF/图片 OCR 使用随站点部署的 `pdfjs-dist`、`tesseract.js`、WASM 和中英文语言数据资源，不上传用户文件或识别文本。

核心代码分层：

- `src/app/tool-plugin.ts`：定义 `ToolPlugin` 接口，每个工具插件都包含 `definition` 元数据和 `render()` 页面渲染函数。
- `src/app/plugins.ts`：统一导入并导出插件数组，是平台发现工具的唯一聚合入口。
- `src/app/tool-registry.ts`：从插件数组生成工具注册表、分类和搜索结果，不硬编码具体工具逻辑。
- `src/app/tool-pages.ts`：根据 hash route 找到对应插件并调用 `render()`。
- `src/components/workbench.ts`：通用输入、输出、执行、复制、清空、示例加载工作台。
- `src/tools/<tool>/`：每类工具自己的插件页面和纯逻辑 service。
- `tests/`：每个 service 对应单元测试，覆盖正常转换和错误输入。

新增工具时的固定流程：

1. 在 `src/tools/<tool>/` 下创建 `*-service.ts`，只放可测试的纯逻辑。
2. 在同目录创建 `*-plugin.ts`，只负责 DOM 控件、参数读取和调用 service。
3. 在 `src/app/plugins.ts` 中加入插件。
4. 在 `tests/` 中补 service 测试。
5. 更新 `README.md` 功能清单。
6. 若工具需要静态运行资源，放入 `public/` 并在 README 中说明隐私和部署边界。

## JSON 工具

代码入口：

- `src/tools/json/json-plugin.ts`
- `src/tools/json/json-service.ts`
- `src/tools/json/json-highlight-service.ts`
- `src/tools/json/json-diff-service.ts`

逻辑说明：

- `json-service.ts` 负责 JSON 校验、格式化、压缩、键排序、转义、反转义和结构统计。
- `json-highlight-service.ts` 将格式化后的 JSON 分成 key、string、number、boolean、null、punctuation 等 token，页面按 token class 高亮。
- `json-diff-service.ts` 负责双 JSON 格式化和逐行差异计算，页面展示左右两列、行号、行级差异和片段差异。
- `json-plugin.ts` 组合单 JSON 工作台和双 JSON 对比页面，页面只处理控件状态和渲染。

测试入口：

- `tests/json-service.test.ts`
- `tests/json-highlight-service.test.ts`
- `tests/json-diff-service.test.ts`

## URL 编解码

代码入口：

- `src/tools/codec/codec-plugin.ts`
- `src/tools/codec/url-service.ts`

逻辑说明：

- 支持 URI 组件编码、解码。
- 支持完整 URL 解析，将协议、主机、路径、查询参数、hash 等字段输出为结构化 JSON。
- 支持查询参数解析为键值数组，也支持从 JSON 键值数组反向生成查询字符串。
- 插件页面通过模式下拉框选择具体处理逻辑，并复用 `createWorkbench` 自动处理输入。

测试入口：

- `tests/codec-service.test.ts`

## Unicode 工具

代码入口：

- `src/tools/codec/codec-plugin.ts`
- `src/tools/codec/unicode-service.ts`

逻辑说明：

- Unicode 转义模式会把文本转为 `\uXXXX` 形式。
- Unicode 反转义模式会把转义序列还原为普通文本。
- UTF-8 十六进制模式用 `TextEncoder` 得到真实字节，再输出 hex 字节序列。

测试入口：

- `tests/codec-service.test.ts`

## JWT 解析器

代码入口：

- `src/tools/jwt/jwt-plugin.ts`
- `src/tools/jwt/jwt-service.ts`

逻辑说明：

- `jwt-plugin.ts` 注册路由 `#/codec/jwt`，页面提供 JWT 输入、示例和解析结果输出。
- `jwt-service.ts` 先移除可选的 `Bearer ` 前缀，再按 `header.payload.signature` 拆分三段。
- Header 和 Payload 使用 Base64URL 解码，再按 JSON 对象解析。
- 常见时间声明 `iat`、`nbf`、`exp` 会转换为 ISO 时间。
- `exp` 会和当前时间比较，输出 `isExpired`。
- 工具只做本地解码，不做签名验证，输出中固定包含 `verified: false` 和说明文字，避免误导。

测试入口：

- `tests/jwt-service.test.ts`

## Base64 文本

代码入口：

- `src/tools/base64/base64-plugin.ts`
- `src/tools/base64/base64-service.ts`

逻辑说明：

- 文本编码时使用 `TextEncoder` 转 UTF-8 字节，再转 Base64 或 Base64URL。
- 文本解码时先校验 Base64 字符和填充，再用 `TextDecoder` 的 fatal 模式验证 UTF-8 合法性。
- 插件页面通过模式下拉框切换标准 Base64、Base64URL 和解码。

测试入口：

- `tests/base64-service.test.ts`

## Base64 文件

代码入口：

- `src/tools/base64/base64-plugin.ts`
- `src/tools/base64/base64-service.ts`

逻辑说明：

- 文件转 Data URL 使用浏览器 `FileReader.readAsDataURL()`，文件内容只在本地页面内存中处理。
- Data URL 下载会解析 mime 和字节内容，创建 Blob URL 后触发下载，并立即释放 Object URL。

测试入口：

- `tests/base64-service.test.ts`

## 安全摘要

代码入口：

- `src/tools/crypto/crypto-plugin.ts`
- `src/tools/crypto/crypto-service.ts`

逻辑说明：

- 使用浏览器 Web Crypto 的 `crypto.subtle.digest()` 计算 SHA-256、SHA-384、SHA-512。
- 输入文本先按 UTF-8 编码为字节。
- 输出为十六进制摘要。

测试入口：

- `tests/crypto-service.test.ts`

## HMAC 签名

代码入口：

- `src/tools/crypto/crypto-plugin.ts`
- `src/tools/crypto/crypto-service.ts`

逻辑说明：

- 通过 Web Crypto 导入用户输入的密钥。
- 使用 HMAC-SHA-256 对消息签名。
- 验证模式会重新计算签名，并与输入签名做一致性比较。

测试入口：

- `tests/crypto-service.test.ts`

## AES-GCM 加解密

代码入口：

- `src/tools/crypto/crypto-plugin.ts`
- `src/tools/crypto/crypto-service.ts`
- `src/tools/crypto/envelope.ts`

逻辑说明：

- 使用 PBKDF2 从口令派生 AES-256-GCM 密钥。
- 加密时生成随机 salt 和 iv，密文与参数一起封装成版本化 envelope。
- 解密时先解析 envelope，再用相同参数派生密钥并解密。
- 页面不保存口令，不做长期密钥管理。

测试入口：

- `tests/crypto-service.test.ts`

## UUID / ULID 生成器

代码入口：

- `src/tools/generator/generator-plugin.ts`
- `src/tools/generator/random-service.ts`

逻辑说明：

- UUID v4 优先使用 `crypto.randomUUID()`，不可用时用安全随机字节按 RFC 版本位和变体位组装。
- ULID 前 10 位为时间戳编码，后 16 位为 Crockford Base32 随机串。
- 页面支持批量生成 UUID、ULID 或两者组合。

测试入口：

- `tests/generator-service.test.ts`

## 随机 Token / 密码

代码入口：

- `src/tools/generator/generator-plugin.ts`
- `src/tools/generator/random-service.ts`

逻辑说明：

- Token 支持 Base64URL、十六进制和纯数字格式。
- 所有随机值来自 `crypto.getRandomValues()`。
- 密码生成支持小写、大写、数字、符号字符组。
- 密码会先保证每个已选择字符组至少出现一次，再用 Fisher-Yates 思路打散顺序。

测试入口：

- `tests/generator-service.test.ts`

## 命名转换

代码入口：

- `src/tools/text/text-plugin.ts`
- `src/tools/text/case-service.ts`

逻辑说明：

- `case-service.ts` 先识别 camel/Pascal 边界，再按 Unicode 字母和数字切分词。
- 所有词统一转为小写基础词，再按目标模式拼接。
- 支持单个目标格式，也支持一次输出全部格式。
- `text-plugin.ts` 注册路由 `#/text/case`，提供格式下拉框和工作台。

测试入口：

- `tests/case-service.test.ts`

## 时间戳转换

代码入口：

- `src/tools/timestamp/timestamp-plugin.ts`
- `src/tools/timestamp/timestamp-service.ts`

逻辑说明：

- 页面使用紧凑批量布局，一次提供 5 条输入和 5 条对应结果。
- 全局输入类型支持自动识别、秒、毫秒和日期时间转时间戳。
- 全局时区下拉框控制所有勾选“跟随全局时区”的结果展示。
- 每条结果都有“跟随全局时区”开关；关闭后该行固定使用 UTC+8 展示，不再受全局时区变化影响。
- 自动识别秒级或毫秒级 Unix 时间戳，并输出时区时间、UTC ISO、本地时间、秒、毫秒、识别单位和相对当前时间。
- 日期时间模式会按当前行的生效时区解释输入，并转换为秒/毫秒时间戳。
- 页面提供“填入当前时间”快捷按钮，优先填入第一条空输入。

测试入口：

- `tests/timestamp-service.test.ts`

## 图片压缩

代码入口：

- `src/tools/image/image-plugin.ts`
- `src/tools/image/image-service.ts`

逻辑说明：

- 图片读取后在浏览器 Canvas 中缩放和重新编码。
- 支持 JPEG、PNG、WebP 输出。
- 页面展示压缩前后预览和下载链接。
- Object URL 会在替换图片或离开页面时释放，避免内存泄漏。

测试入口：

- `tests/image-service.test.ts`

## 图片抠图

代码入口：

- `src/tools/cutout/cutout-plugin.ts`
- `src/tools/cutout/cutout-service.ts`

逻辑说明：

- `cutout-plugin.ts` 注册路由 `#/image/cutout`，提供 PNG/JPG/JPEG/WebP 上传、工具模式切换、容差调节、画布缩放、中键平移、删除选区、撤销和导出 PNG。
- 页面使用主 canvas 绘制当前图片，使用 overlay canvas 绘制半透明选区预览，透明区域通过棋盘格背景辅助观察。
- 魔棒模式点击图片色块后，`cutout-service.ts` 使用 4 向 flood fill 从点击点扩散，只选择与点击像素颜色接近且连通的区域。
- 魔棒容差范围为 0 到 255，默认 30；滑块和数字输入框同步，已有魔棒采样点时拖动滑块会实时刷新选区。
- 矩形模式根据拖拽起终点生成裁剪到图片边界内的矩形 mask。
- 圆形模式根据拖拽外接矩形生成椭圆 mask。
- 画布缩放只改变 canvas 的 CSS 展示尺寸，不改变底层 `ImageData` 像素；点击坐标通过 overlay canvas 的 `getBoundingClientRect()` 映射回真实像素。
- 鼠标中键按下时记录展示区滚动位置，移动时更新 `scrollLeft` 和 `scrollTop`；鼠标移出画布后仍通过 `window` 级 `mousemove` 持续平移，松开中键后结束拖拽。
- 删除选区时复制当前 `ImageData`，把选区 mask 对应像素的 alpha 改为 0，不改变 RGB 值。
- 删除前将当前图片状态压入撤销栈，最多保留 20 步；`Ctrl+Z` / `Command+Z` 和撤销按钮都可恢复上一步，`Ctrl/Command + 滚轮` 可缩放展示区图片，中键拖拽只改变视口查看位置。
- 导出时使用 `canvas.toBlob('image/png')` 生成透明 PNG，文件名追加 `-cutout.png`。

测试入口：

- `tests/cutout-service.test.ts`

## PDF / 图片 OCR

代码入口：

- `src/tools/ocr/ocr-plugin.ts`
- `src/tools/ocr/ocr-service.ts`
- `public/ocr/pdf.worker.min.mjs`
- `public/ocr/tesseract/worker.min.js`
- `public/ocr/tesseract-core/*`
- `public/ocr/tessdata/eng.traineddata.gz`
- `public/ocr/tessdata/chi_sim.traineddata.gz`

逻辑说明：

- `ocr-plugin.ts` 注册路由 `#/ocr`，提供 PDF/图片文件选择、识别进度、格式化文本输出、复制、清空和 TXT 下载。
- `ocr-service.ts` 负责文件类型判断、大小限制、PDF 页数限制、Canvas 像素限制和识别结果格式化。
- PDF 文件通过 `pdfjs-dist` 在浏览器中渲染为 Canvas，再逐页交给 Tesseract worker 识别。
- 图片文件通过 `createImageBitmap` 解码，必要时按最大像素限制缩放到 Canvas 后识别。
- OCR 默认语言为中文简体 + 英文，语言数据从本站 `public/ocr/tessdata/` 加载。
- Tesseract worker、core 和 wasm 也从本站 `public/ocr/` 加载，避免默认 CDN 请求。
- 输出按 Markdown 风格整理，包含文件标题、文件类型、页数和 `## 第 N 页` 分段。
- 页面切换或清空时会中止当前识别任务，并释放用于 TXT 下载的 Object URL。

测试入口：

- `tests/ocr-service.test.ts`

## 颜色转换器

代码入口：

- `src/tools/color/color-plugin.ts`
- `src/tools/color/color-service.ts`

逻辑说明：

- `color-service.ts` 支持解析 HEX 简写、HEX 完整写法、RGB/RGBA、HSL/HSLA。
- HEX 简写会先展开为完整通道值，例如 `#0af` 变成 `#00aaff`。
- HSL 转 RGB 使用 chroma、second、matchValue 的标准换算流程。
- RGB 转 HSL 后输出整数 H/S/L，便于复制到 CSS。
- Alpha 小于 1 时额外输出 `hex8`。
- `color-plugin.ts` 注册路由 `#/color`，直接复用工作台完成输入输出。

测试入口：

- `tests/color-service.test.ts`

## SQL 格式化

代码入口：

- `src/tools/sql/sql-plugin.ts`
- `src/tools/sql/sql-service.ts`

逻辑说明：

- 支持自动识别、MySQL、ClickHouse、Doris、PostgreSQL 和 Redis 命令。
- SQL 通过词法切分识别关键字、函数、字符串、数字、注释、操作符和变量。
- 格式化逻辑根据关键字和括号层级调整换行与缩进。
- Redis 命令按命令和参数分行展示。
- 页面输出格式化文本，同时生成高亮预览。

测试入口：

- `tests/sql-service.test.ts`

## 平台能力

代码入口：

- `src/app/app-shell.ts`
- `src/app/router.ts`
- `src/app/tool-registry.ts`
- `src/platform/clipboard.ts`
- `src/platform/object-url-store.ts`

逻辑说明：

- App Shell 负责首页、导航、搜索、主题、收藏和最近使用。
- Router 监听 hash 变化并触发页面重渲染。
- Tool Registry 根据插件元数据实现分类、查找和搜索排序。
- Clipboard 封装复制能力，复制失败时回退到选中文本。
- Object URL Store 统一管理 Blob URL 生命周期。
