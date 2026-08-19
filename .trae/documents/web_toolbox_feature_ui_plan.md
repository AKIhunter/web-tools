# Web Toolbox 功能与 UI 优化实施计划

## Summary

本计划面向当前 `web-toolbox` 项目，目标是以产品经理视角梳理已有功能，参考市面常见浏览器工具站能力补充高频功能，并优化 UI 交互与视觉体验。

核心决策：

- 保留当前项目的颜色搭配与浅深色主题 token，不重做品牌色。
- 保持“隐私优先、本地处理、无账号、无后端”的产品定位。
- 优先补充纯前端、高频、低权限、可测试的开发者工具。
- 优化首页、搜索、工具页、移动端导航和状态反馈，让产品更符合人类使用习惯。
- 若进入视觉交付，应以现有项目改版对比页方式呈现，并保证 `.design` 画布资产有效。

## Current State Analysis

### 项目定位

当前项目是一个本地浏览器工具站，使用 Vite、Vanilla TypeScript 与原生 CSS 实现。项目 README 中强调：

- 输入数据在浏览器本地处理。
- 不需要账号。
- 不上传数据。
- 默认无广告、无历史记录。

这个定位应继续保留，后续新增功能不应引入账号体系、后端依赖、默认联网请求或云端同步能力。

### 现有功能

现有工具注册集中在 `src/app/tool-registry.ts`，当前包含 10 个工具：

- JSON 工具：校验、格式化、压缩、转义、键排序。
- URL 编解码：URI 组件、完整 URL、查询参数。
- Unicode 工具：Unicode 转义与 UTF-8 字节。
- Base64 文本：UTF-8 文本与 Base64URL 往返。
- Base64 文件：文件与 Data URL 本地转换。
- 安全摘要：SHA-256、SHA-384、SHA-512。
- HMAC 签名：HMAC-SHA-256 签名与验证。
- AES-GCM 加解密：PBKDF2 + AES-256-GCM 版本化密文。
- 时间戳转换：秒、毫秒、本地时间与 UTC。
- 图片压缩：缩放并导出 JPEG、PNG 或 WebP。

### 现有页面结构

主要应用结构位于：

- `src/app/app-shell.ts`：应用壳、首页、侧边栏、搜索入口和主题切换。
- `src/app/router.ts`：hash 路由。
- `src/app/tool-pages.ts`：工具页面组合与渲染入口。
- `src/components/workbench.ts`：双栏输入输出工作台组件。
- `src/components/file-drop.ts`：文件选择与拖拽组件。
- `src/components/notice.ts`：提示组件。

当前工具页复用 `createWorkbench`，基础效率高，但状态层级、结果摘要、参数区、错误提示和移动端操作体验仍可增强。

### 现有视觉基础

颜色 token 位于 `src/styles/tokens.css`，当前配色简洁、干净，用户明确表示喜欢，应完整保留。

关键浅色 token：

- `--page: #f5f5f7`
- `--surface: #fbfbfd`
- `--surface-secondary: #f0f0f2`
- `--text: #1d1d1f`
- `--text-secondary: #6e6e73`
- `--border: #d2d2d7`
- `--accent: #0071e3`
- `--success: #248a3d`
- `--warning: #b25000`
- `--error: #d70015`

深色模式也已具备，后续必须同步保证可读性与对比度。

### 参考设计方向

参考设计系统适合作为组件结构与交互状态参考，而不是直接覆盖当前项目颜色。可借鉴的模式包括：

- 卡片、按钮、表单、标签、菜单、Tabs、Alert、Progress、Skeleton。
- 更明确的层级密度。
- 更稳定的 focus、hover、disabled、error、success 状态。
- 更清晰的信息分组与操作按钮层级。

### 当前主要不足

- 工具数量偏少，尚未覆盖开发者工具站常见高频能力。
- 工具分类较粗，继续扩展后容易混乱。
- 首页更像工具列表，缺少工作台感、推荐工具、收藏、最近使用等高频入口。
- 搜索只做简单字符串包含匹配，缺少别名、排序、键盘选择、空状态建议。
- 工具详情页信息结构偏基础，参数区、结果区、状态提示可以更专业。
- 移动端已有侧边栏抽屉，但遮罩、焦点管理、搜索层级和工具页操作顺序仍可优化。
- 当前未发现 `.design` 画布文件；若进入视觉产物实施，需要先建立或补齐设计画布。

## Proposed Changes

### 1. 产品边界与功能优先级

#### 涉及文件

- `README.md`
- `src/app/tool-registry.ts`
- `src/app/tool-pages.ts`
- `src/tools/**`
- `tests/**`

#### What

将产品定位明确为“本地优先的开发者工具工作台”，新增功能按三档推进：

第一优先级：

- UUID / ULID 生成器。
- 随机 Token / 密码生成器。
- JWT 解析器。
- 文本 Diff。
- JSON Diff。
- 正则测试器。
- 大小写 / 命名转换。
- 颜色转换器。

第二优先级：

- Markdown 转 HTML。
- YAML / TOML / XML / CSV 与 JSON 转换。
- SQL 格式化。
- Cron 表达式解释器。
- QR Code 生成器。
- User-Agent 解析器。
- MIME 类型查询。
- HTTP 状态码查询。

暂不优先：

- 在线 API 测试器。
- 账号同步 / 云端历史。
- 服务器连通性 / IP 查询。
- 摄像头录制。
- PDF 签名验证。
- 长期密钥管理类工具。

#### Why

第一优先级功能与现有 JSON、编码、加密、时间、图片能力相邻，均可本地完成，用户价值高且实现风险低。暂不优先功能会引入网络、账号、权限或安全误用风险，不符合当前产品定位。

#### How

- 在 `src/app/tool-registry.ts` 增加新工具路由和元数据。
- 在 `src/tools/` 下按分类新增 service。
- 在 `src/app/tool-pages.ts` 接入页面渲染。
- 在 `tests/` 中为每个 service 增加单元测试。
- 在 `README.md` 更新功能清单、隐私说明和使用边界。

### 2. 工具注册表模型升级

#### 涉及文件

- `src/app/tool-registry.ts`
- `src/app/app-shell.ts`
- `src/app/tool-pages.ts`

#### What

扩展 `ToolDefinition`，支持更丰富的产品展示和搜索能力：

```ts
export type ToolDefinition = {
  route: string;
  category: string;
  title: string;
  description: string;
  keywords: string[];
  aliases?: string[];
  icon?: string;
  tags?: string[];
  privacyLevel?: 'local-only' | 'local-file' | 'crypto-sensitive';
  featured?: boolean;
  experimental?: boolean;
};
```

#### Why

当前注册表只支持基础展示。扩展字段可以支撑首页推荐、工具标签、隐私标识、搜索别名、实验功能标记和图标化浏览。

#### How

- 保持现有字段向后兼容。
- 新增字段全部可选，避免一次性大规模修改。
- 首页和搜索逐步读取 `aliases`、`tags`、`featured`、`privacyLevel`。
- 新增工具默认补齐 `aliases` 和 `tags`，提高搜索命中率。

### 3. 信息架构重组

#### 涉及文件

- `src/app/tool-registry.ts`
- `src/app/app-shell.ts`
- `src/styles/layout.css`
- `src/styles/components.css`

#### What

将当前 6 类扩展为 8 类：

- 数据格式。
- 编码解码。
- 加密与安全。
- 文本处理。
- 生成器。
- 时间与日期。
- 图片与颜色。
- 开发辅助。

#### Why

当前分类能容纳 10 个工具，但扩展到 20 个以上后会变得拥挤。新的分类更贴近用户任务心智，也便于首页卡片和侧边栏分组展示。

#### How

- 将 JSON、JSON Diff、格式转换归入“数据格式”。
- 将 URL、Unicode、Base64、JWT 归入“编码解码”。
- 将 Hash、HMAC、AES、密码/Token 生成归入“加密与安全”。
- 将 Diff、正则、大小写转换归入“文本处理”。
- 将 UUID、ULID、QR Code 归入“生成器”。
- 将时间戳、Cron 归入“时间与日期”。
- 将图片压缩、颜色转换归入“图片与颜色”。
- 将 MIME、HTTP 状态码、User-Agent 归入“开发辅助”。

### 4. 首页体验升级

#### 涉及文件

- `src/app/app-shell.ts`
- `src/styles/layout.css`
- `src/styles/components.css`
- 后续视觉交付对应 `.design` 页面节点

#### What

将首页从“工具列表”升级为“工具工作台”：

- 保留隐私优先 Hero。
- 增加推荐工具区域。
- 增加最近使用区域。
- 增加收藏工具区域。
- 增加分类总览卡片。
- 工具卡片展示标签、隐私标识、是否支持文件、快捷能力。
- 搜索空结果展示建议入口。

#### Why

用户访问工具站通常目标明确，需要更快找到工具；推荐、收藏、最近使用可以减少重复查找。分类卡片有助于快速理解产品能力边界。

#### How

- 在 `app-shell.ts` 拆分首页渲染函数，避免单个函数过长。
- 在本地存储中保存最近使用和收藏状态。
- 不保存用户输入内容，只保存工具 route 和时间戳。
- 在 `components.css` 增加 `.tool-card`、`.tag`、`.privacy-badge`、`.empty-state`。
- 在 `layout.css` 优化首页 grid、响应式列数和移动端间距。

### 5. 工具页模板升级

#### 涉及文件

- `src/components/workbench.ts`
- `src/components/notice.ts`
- `src/app/tool-pages.ts`
- `src/styles/components.css`
- `src/styles/layout.css`
- 后续视觉交付对应 `.design` 页面节点

#### What

在现有 `createWorkbench` 基础上升级标准工具页结构：

- 工具页顶部增加能力说明卡。
- 参数区支持分组、选项说明和分段控制。
- 输出区增加结果摘要、详情面板和结构化状态。
- 操作按钮分为主按钮、次按钮、文本按钮。
- Notice 升级为 Alert 风格，区分成功、错误、警告、处理中。

#### Why

当前工具页已经可用，但更偏“表单 + 按钮”。当新增 Diff、JWT、颜色、正则等工具后，页面需要更丰富的参数说明、结果摘要和错误处理。

#### How

- 保持 `createWorkbench` 兼容现有工具。
- 新增可选配置，例如 `description`、`tips`、`actions`、`resultSummary`。
- 对复杂工具新增专用模板，而不是让所有工具都塞入双栏结构。
- 对所有 notice 使用 `role="status"` 或 `role="alert"`，保持可访问性。

### 6. 搜索体验优化

#### 涉及文件

- `src/app/tool-registry.ts`
- `src/app/app-shell.ts`
- `src/styles/components.css`

#### What

将简单搜索升级为更像启动器的搜索体验：

- 支持 `aliases` 匹配。
- 标题命中优先于描述和关键词命中。
- 展示分类标签和简短描述。
- 支持键盘上下选择、Enter 打开、Esc 关闭。
- 空结果展示“可能想找”的工具和建议新增项。

#### Why

工具变多后，搜索会成为主入口。排序和键盘操作可以明显提升效率。

#### How

- 将 `searchTools(query)` 改为返回带 score 的排序结果。
- 保留原函数兼容调用方，或新增 `rankTools(query)`。
- 搜索浮层使用可访问列表结构。
- 空结果不显示空白，而是显示建议和当前分类入口。

### 7. 移动端交互优化

#### 涉及文件

- `src/app/app-shell.ts`
- `src/styles/layout.css`
- `src/styles/components.css`

#### What

优化小屏幕导航与工具页操作：

- 侧边栏打开时增加遮罩。
- 点击遮罩关闭侧边栏。
- 打开侧边栏后焦点进入导航。
- 关闭后焦点回到菜单按钮。
- 搜索结果不遮挡菜单和主题按钮。
- 双栏编辑器在移动端按“输入、参数、主操作、输出、次操作”顺序排列。

#### Why

当前已经具备移动端侧边栏，但焦点与遮罩不足会降低可用性。工具页在窄屏中更容易出现操作按钮不易触达的问题。

#### How

- 在 `app-shell.ts` 增加遮罩节点和焦点恢复逻辑。
- 在 CSS 中增加 `.sidebar-backdrop`、移动端按钮组断点。
- 保持无框架实现，避免引入额外依赖。

### 8. 视觉系统增强但保留配色

#### 涉及文件

- `src/styles/tokens.css`
- `src/styles/components.css`
- `src/styles/layout.css`

#### What

保留现有颜色 token，补充语义化空间、圆角、阴影、控件高度、字体层级 token：

- `--space-1` 到 `--space-8`
- `--radius-sm`、`--radius-md`、`--radius-lg`
- `--shadow-sm`、`--shadow-md`
- `--control-height-sm`、`--control-height-md`
- `--font-size-sm`、`--font-size-md`、`--font-size-lg`

#### Why

当前配色好，但组件一致性还有提升空间。新增语义 token 可增强 UI 统一性，同时不改变用户喜欢的颜色风格。

#### How

- 不覆盖现有颜色变量。
- 新 token 只服务布局、密度、圆角和状态表达。
- 所有新增组件样式使用 token，不硬编码大量散落数值。

### 9. 新功能实施模板

#### 涉及文件

- `src/tools/{category}/{tool}-service.ts`
- `tests/{tool}-service.test.ts`
- `src/app/tool-pages.ts`
- `src/app/tool-registry.ts`

#### What

每个新增工具统一遵循：

- 纯逻辑 service。
- 页面渲染函数。
- 工具注册。
- 单元测试。
- 输入限制。
- 错误信息。
- 示例数据。
- README 更新。

#### Why

当前项目已有清晰的 service + tests 结构，继续沿用可降低维护成本。

#### How

以 UUID / ULID 生成器为首个新增工具示例：

- 新增 `src/tools/generator/uuid-service.ts`。
- 新增 `tests/uuid-service.test.ts`。
- 在 `tool-pages.ts` 新增 `createUuidToolPage()`。
- 在 `tool-registry.ts` 注册 `#/generator/uuid`。
- 在页面中支持生成数量、大小写、连字符、复制结果。

后续工具按相同模式扩展。

### 10. 设计画布交付策略

#### 涉及文件

- 项目后续新增的 `.design` 文件
- 对应 HTML 页面资源
- 对应 CSS 与图片资源

#### What

若进入 UI 视觉实施，应创建或补齐设计画布，并以对比页方式呈现：

- 当前首页基准页。
- 改版首页方案。
- 当前工具页基准页。
- 改版工具页模板。
- 新增工具模板。
- 移动端首页方案。
- 移动端工具页方案。
- 搜索展开、空状态、错误状态、处理中状态。

#### Why

当前未发现已有 `.design` 文件。为了保证设计结果可审阅、可对比、可验证，视觉产物不能只停留在代码文件中。

#### How

- 后续实施阶段先建立或定位 `.design` 项目。
- 不直接覆盖当前 UI，以新建对比页方式呈现改版。
- 每个画布页面关联存在的 HTML 或图片资源。
- 完成后运行设计工作区验证和完成就绪验证。

## Assumptions & Decisions

- 假设项目继续保持纯前端、本地运行，不新增后端。
- 假设用户希望保留当前蓝灰色调与浅深色主题。
- 假设新增功能优先服务开发者、产品和日常办公中的高频工具需求。
- 决定优先补充低依赖、纯函数、可测试的新工具。
- 决定不优先做需要联网、账号、云端同步或高权限的能力。
- 决定 UI 只升级组件结构、层级、交互状态和响应式体验，不重塑品牌色。
- 决定后续视觉改版默认做对比页，而不是直接覆盖现有页面。
- 决定新增工具逻辑必须放在 service 层，页面只负责交互和渲染。
- 决定最近使用和收藏只存工具 route，不存用户输入内容。

## Verification Steps

### 代码验证

后续实施完成后运行：

```bash
npm run typecheck
npm test
npm run build
```

验收条件：

- 原有 10 个工具功能不回退。
- 新增工具可通过对应 hash 路由访问。
- 新增 service 均有单元测试。
- 搜索能命中标题、关键词、别名和分类。
- 不支持路由仍能优雅回到首页或提示。
- 不新增未经说明的联网能力。

### UI 验证

手动检查：

- 浅色主题可读。
- 深色主题可读。
- 当前配色 token 未被替换。
- 首页工具卡片、推荐区、分类区在桌面端布局稳定。
- 移动端侧边栏可打开、关闭，并有遮罩。
- 搜索浮层不遮挡核心操作。
- 工具页输入、参数、执行、输出顺序符合移动端使用习惯。
- 错误、成功、警告、处理中状态清晰。

### 隐私与安全验证

检查：

- 新增工具默认不上传用户输入。
- 最近使用和收藏不保存用户输入内容。
- 加密、Token、密码类工具不做长期存储。
- 文件处理工具明确标注本地处理。
- 不添加默认外部请求。

### 设计画布验证

若实施 UI 视觉产物，需要验证：

- `.design` 文件存在且为有效 JSON。
- `data` 非空。
- 页面节点 ID 唯一。
- `devMetadata.htmlSrc` 指向存在的 HTML。
- 图片节点的 `imageSrc` 指向存在文件。
- 新增视觉页以对比页呈现。
- 设计工作区验证与完成就绪验证均通过。

## Recommended Execution Order

1. 先更新产品信息架构和工具注册表模型。
2. 再优化首页布局、搜索、收藏和最近使用。
3. 再升级标准工具页模板与状态反馈组件。
4. 再补充第一优先级新增工具。
5. 再补充第二优先级工具中无需额外依赖的部分。
6. 最后进行 `.design` 对比页和移动端状态补齐。

## First Implementation Slice

建议第一轮实施控制在可验证闭环内：

- 扩展 `ToolDefinition`。
- 重组分类。
- 首页增加推荐工具、最近使用、收藏入口。
- 搜索增加别名与排序。
- 工具页 notice 升级为 alert 状态。
- 新增 UUID / ULID 生成器。
- 新增随机 Token / 密码生成器。
- 更新 README。
- 补充对应测试。
- 保留所有现有颜色 token。

这个切片能快速验证信息架构、UI 组件升级和新增工具流程，不会一次性引入过多复杂功能。
