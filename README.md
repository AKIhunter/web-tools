# Web Toolbox
已部署cloudflare：https://web-tools.851911696.workers.dev/#/json
一个使用 Vite、Vanilla TypeScript 与原生 CSS 构建的浏览器本地工具站。不包含后端、账号、埋点、广告或业务网络请求；PDF/图片 OCR 使用随站点部署的前端本地依赖和静态识别资源。

## 功能

- 首页：推荐工具、收藏、最近使用与分类总览；收藏和最近使用只保存工具路径，不保存输入内容
- 搜索：支持标题、描述、分类、关键词、别名与标签匹配，支持上下键、Enter 与 Esc
- 数据格式：JSON 校验、格式化、压缩、键排序、结构统计、key 高亮预览与双 JSON 对比
- 编码解码：URL 组件、完整 URL、查询参数、Unicode、UTF-8 字节、JWT 解析、Base64 文本、Base64URL、文件与 Data URL
- 加密与安全：SHA-256/384/512、HMAC-SHA-256、PBKDF2 + AES-256-GCM
- 生成器：纯前端 UUID v4、ULID、随机 Token、十六进制串、数字串与可配置密码
- 文本处理：camelCase、PascalCase、snake_case、kebab-case、CONSTANT_CASE、Title Case 与 dot.case 命名转换
- 时间与日期：5 条批量时间戳转换、秒/毫秒识别、日期时间转时间戳、全局时区联动、UTC ISO 与相对时间
- 图片与颜色：JPEG/PNG/WebP 图片加工，支持类型识别、输出格式自选、高质量/均衡/高性能处理方式、按像素或 75%/50%/30%/15% 调整尺寸、按文件大小比例或极限压缩、前后预览与下载，PNG/JPG/JPEG/WebP 图片抠图、画布缩放、中键平移与透明 PNG 导出，PDF/图片 OCR 文字识别，HEX、RGB/RGBA、HSL/HSLA 颜色转换
- 开发辅助：MySQL、ClickHouse、Doris、PostgreSQL 等 SQL 格式化、Redis 命令格式化、JSON 查询 DSL / Elasticsearch DSL 转 SQL，高亮展示关键字、函数和值

当前 18 个工具覆盖 8 个已开放分类；后续会继续按插件方式补齐 Diff、正则、格式转换等纯前端工具。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

质量验证：

```bash
npm run typecheck
npm test
npm run build
```

生产构建输出位于 `dist/`。项目使用 Hash 路由，可将该目录部署到任意 HTTPS 静态托管服务，不需要服务器 fallback。

## 浏览器与部署

支持当前稳定版 Chrome、Edge、Firefox 和 Safari。Web Crypto 在生产环境要求 HTTPS 安全上下文；图片工具要求 Canvas 和 `createImageBitmap`。PDF/图片 OCR 还要求 Web Worker、WebAssembly、Canvas 和较充足的浏览器内存。

建议静态服务器同时设置：

- `Content-Security-Policy: default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 隐私与安全边界

工具输入、口令和文件只驻留在当前页面内存，不写入 URL、日志或持久化存储，也不会上传。持久化数据仅包含主题枚举值、有限数量的收藏工具路径和最近使用工具路径；收藏与最近使用不会保存任何输入、输出、口令或文件内容。离开加密页面会清除口令引用，图片 Object URL 会在替换图片或离开页面时释放。图片抠图只在本地 Canvas 中处理，导出透明 PNG，不上传原图或结果图。OCR 会从本站同源静态路径加载 PDF.js、Tesseract.js core、WASM 和中英文语言数据，不上传 PDF、图片或识别文本。

本地处理不代表密钥托管、备份、合规审计或企业安全方案。AES 密文的安全性仍取决于口令强度和使用环境；请不要把浏览器工具当作长期密钥管理系统。图片重新编码通常会移除 EXIF/GPS 等元数据，且 PNG 输出不保证更小。
