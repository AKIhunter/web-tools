# Web Toolbox
已部署cloudflare：https://web-tools.851911696.workers.dev/#/json
一个使用 Vite、Vanilla TypeScript 与原生 CSS 构建的浏览器本地工具站。生产运行时零第三方依赖，不包含后端、账号、埋点、广告或业务网络请求。

## 功能

- 首页：推荐工具、收藏、最近使用与分类总览；收藏和最近使用只保存工具路径，不保存输入内容
- 搜索：支持标题、描述、分类、关键词、别名与标签匹配，支持上下键、Enter 与 Esc
- 数据格式：JSON 校验、格式化、压缩、键排序、结构统计、key 高亮预览与双 JSON 对比
- 编码解码：URL 组件、完整 URL、查询参数、Unicode、UTF-8 字节、Base64 文本、Base64URL、文件与 Data URL
- 加密与安全：SHA-256/384/512、HMAC-SHA-256、PBKDF2 + AES-256-GCM
- 生成器：纯前端 UUID v4、ULID、随机 Token、十六进制串、数字串与可配置密码
- 时间与日期：秒/毫秒识别、本地时间、UTC ISO 与相对时间
- 图片与颜色：JPEG/PNG/WebP 缩放、质量控制、前后预览与下载
- 开发辅助：MySQL、ClickHouse、Doris、PostgreSQL 等 SQL 格式化与 Redis 命令格式化，高亮展示关键字、函数和值

当前 13 个工具覆盖 7 个已开放分类；文本处理等分类会随后续纯前端工具逐步补齐。

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

工具输入、口令和文件只驻留在当前页面内存，不写入 URL、日志或持久化存储，也不会上传。持久化数据仅包含主题枚举值、有限数量的收藏工具路径和最近使用工具路径；收藏与最近使用不会保存任何输入、输出、口令或文件内容。离开加密页面会清除口令引用，图片 Object URL 会在替换图片或离开页面时释放。

本地处理不代表密钥托管、备份、合规审计或企业安全方案。AES 密文的安全性仍取决于口令强度和使用环境；请不要把浏览器工具当作长期密钥管理系统。图片重新编码通常会移除 EXIF/GPS 等元数据，且 PNG 输出不保证更小。
