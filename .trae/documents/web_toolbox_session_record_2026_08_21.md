# Web Toolbox 会话记录

## 项目路径

`/Users/bytedance/Desktop/trae/web-toolbox`

## 仓库与部署

- GitHub 仓库：`https://github.com/AKIhunter/web-tools.git`
- Cloudflare 访问地址在 README 中记录为：`https://web-tools.851911696.workers.dev/#/json`
- Wrangler 配置文件：`wrangler.jsonc`
- `package.json` 中已有部署脚本：`npm run deploy`
- `vite.config.ts` 已配置 `base: './'`，用于避免本地静态打开 `dist/index.html` 时 CSS/JS 资源路径错误。

## 已完成的主要功能

### JSON 工具

- 保留原有 JSON 校验、格式化、压缩、键排序、字符串转义和去转义能力。
- JSON 格式化结果使用下方高亮结果窗展示。
- JSON key 与 value 使用不同颜色，key 更醒目。
- 新增“双 JSON 对比”模式：
  - 支持输入两个原始 JSON。
  - 自动格式化后以左右两列展示。
  - 每行带序号。
  - `对比行高亮`：同序号行不同则添加红色波浪线。
  - `对比内容高亮`：同一行内不同片段添加红色波浪线。
  - 移动端自动改为上下排列。

相关文件：

- `src/tools/json/json-plugin.ts`
- `src/tools/json/json-service.ts`
- `src/tools/json/json-highlight-service.ts`
- `src/tools/json/json-diff-service.ts`
- `tests/json-service.test.ts`
- `tests/json-highlight-service.test.ts`
- `tests/json-diff-service.test.ts`

### SQL 格式化工具

- 新增 `SQL 格式化` 工具。
- 路由：`#/dev/sql`
- 分类：`数据库SQL辅助`
- 支持：
  - 自动识别
  - MySQL
  - ClickHouse
  - Doris
  - PostgreSQL
  - Redis 命令
- 支持格式化后结构高亮：
  - SQL 关键字
  - 函数
  - 字符串
  - 数字
  - 注释
  - 操作符
  - 变量

相关文件：

- `src/tools/sql/sql-plugin.ts`
- `src/tools/sql/sql-service.ts`
- `tests/sql-service.test.ts`

### 左侧目录折叠

- 桌面端左侧目录固定在浏览器可见区域左侧。
- 目录和内容之间有折叠按钮。
- 点击按钮可以隐藏/显示目录。
- 目录隐藏后按钮仍固定在最左侧可见。
- 移动端继续使用顶部菜单抽屉。

相关文件：

- `src/app/app-shell.ts`
- `src/styles/layout.css`

## 插件化重构

目标：让平台成为聚合工具的容器，每个工具作为独立插件维护，降低互相影响。

已完成：

- 新增插件类型文件：`src/app/tool-plugin.ts`
- 新增插件聚合文件：`src/app/plugins.ts`
- `tool-registry.ts` 现在从插件自动生成工具列表：

```ts
export const tools: ToolDefinition[] = plugins.map((plugin) => plugin.definition);
```

- `tool-pages.ts` 现在只负责按 route 找插件并渲染：

```ts
export function renderToolPage(route: string): PageResult {
  return plugins.find((plugin) => plugin.definition.route === route)?.render() ?? { element: document.createElement('div') };
}
```

已迁移为 `ToolPlugin` 的工具：

- `src/tools/json/json-plugin.ts`
- `src/tools/sql/sql-plugin.ts`
- `src/tools/generator/generator-plugin.ts`
- `src/tools/codec/codec-plugin.ts`
- `src/tools/base64/base64-plugin.ts`
- `src/tools/crypto/crypto-plugin.ts`
- `src/tools/timestamp/timestamp-plugin.ts`
- `src/tools/image/image-plugin.ts`

## 当前验证命令

执行目录必须是：

```bash
cd /Users/bytedance/Desktop/trae/web-toolbox
```

验证命令：

```bash
npm run typecheck
npm test
npm run build
```

最近一次验证结果：

- `npm run typecheck` 通过。
- `npm test` 通过。
- 11 个测试文件通过。
- 42 个测试通过。
- `npm run build` 通过。

## Git 注意事项

不要在 `/Users/bytedance/Desktop/trae` 根目录执行 npm 命令；那里没有 `package.json`。

提交前建议检查：

```bash
git status --short --branch
git diff --stat
```

提交推荐流程：

```bash
git add .
git commit -m "refactor: 所有工具插件化"
git fetch origin
git rebase origin/main
git push origin main
```

如果 `git push` 出现 `fetch first`，说明远端有新提交，需要先执行：

```bash
git fetch origin
git rebase origin/main
git push origin main
```

## 忽略文件

以下内容不应提交：

- `dist/`
- `node_modules/`

它们应由 `.gitignore` 忽略。

## 后续建议

- 若继续新增工具，只需要新增对应目录下的 `*-plugin.ts` 并加入 `src/app/plugins.ts`。
- 平台层应继续只负责：
  - 导航
  - 搜索
  - 主题
  - 收藏
  - 最近使用
  - 插件聚合
- 单个工具的页面、业务逻辑、测试应尽量放在自己的 `src/tools/<tool>/` 目录中。

