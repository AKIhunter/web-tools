# Web Toolbox
已部署cloudflare：https://web-tools.851911696.workers.dev/#/json
一个使用 Vite、Vanilla TypeScript 与原生 CSS 构建的浏览器本地工具站。生产运行时零第三方依赖，不包含后端、账号、埋点、广告或业务网络请求。

## 功能

- JSON：校验、格式化、压缩、键排序与结构统计
- 编码解码：URL 组件、完整 URL、查询参数、Unicode 与 UTF-8 字节
- Base64：UTF-8 文本、Base64URL、文件与 Data URL
- 加解密：SHA-256/384/512、HMAC-SHA-256、PBKDF2 + AES-256-GCM
- 时间戳：秒/毫秒识别、本地时间、UTC ISO 与相对时间
- 图片压缩：JPEG/PNG/WebP 缩放、质量控制、前后预览与下载

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

支持当前稳定版 Chrome、Edge、Firefox 和 Safari。Web Crypto 在生产环境要求 HTTPS 安全上下文；图片工具要求 Canvas 和 `createImageBitmap`。

建议静态服务器同时设置：

- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 隐私与安全边界

工具输入、口令和文件只驻留在当前页面内存，不写入 URL、日志或持久化存储，也不会上传。唯一持久化数据是主题枚举值。离开加密页面会清除口令引用，图片 Object URL 会在替换图片或离开页面时释放。

本地处理不代表密钥托管、备份、合规审计或企业安全方案。AES 密文的安全性仍取决于口令强度和使用环境；请不要把浏览器工具当作长期密钥管理系统。图片重新编码通常会移除 EXIF/GPS 等元数据，且 PNG 输出不保证更小。
