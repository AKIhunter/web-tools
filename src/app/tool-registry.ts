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

export const tools: ToolDefinition[] = [
  { route: '#/json', category: '数据格式', title: 'JSON 工具', description: '校验、格式化、压缩、转义与键排序', keywords: ['json', '格式化', '压缩', '校验'], aliases: ['json formatter', 'json beautifier'], icon: '{}', tags: ['结构化数据', '格式化'], privacyLevel: 'local-only', featured: true },
  { route: '#/codec/url', category: '编码解码', title: 'URL 编解码', description: 'URI 组件、完整 URL 与查询参数', keywords: ['url', 'encode', 'query'], aliases: ['url encode', 'url decode', 'percent encoding'], icon: '%', tags: ['URL', '查询参数'], privacyLevel: 'local-only', featured: true },
  { route: '#/codec/unicode', category: '编码解码', title: 'Unicode 工具', description: 'Unicode 转义与 UTF-8 字节', keywords: ['unicode', 'utf8', '转义'], aliases: ['unicode escape', 'utf-8 hex'], icon: 'U+', tags: ['字符集', '转义'], privacyLevel: 'local-only' },
  { route: '#/base64/text', category: '编码解码', title: 'Base64 文本', description: 'UTF-8 文本与 Base64URL 往返', keywords: ['base64', '文本', '编码'], aliases: ['base64url', 'b64'], icon: '64', tags: ['文本', 'Base64'], privacyLevel: 'local-only', featured: true },
  { route: '#/base64/file', category: '编码解码', title: 'Base64 文件', description: '文件与 Data URL 本地转换', keywords: ['base64', 'file', 'data url'], aliases: ['data uri', 'file to base64'], icon: 'B64', tags: ['文件', 'Data URL'], privacyLevel: 'local-file' },
  { route: '#/crypto/digest', category: '加密与安全', title: '安全摘要', description: 'SHA-256、SHA-384 与 SHA-512', keywords: ['sha', 'hash', '摘要'], aliases: ['hash', 'sha256', 'sha512'], icon: '#', tags: ['摘要', '校验'], privacyLevel: 'crypto-sensitive', featured: true },
  { route: '#/crypto/hmac', category: '加密与安全', title: 'HMAC 签名', description: 'HMAC-SHA-256 签名与验证', keywords: ['hmac', '签名', '验证'], aliases: ['message authentication code'], icon: '签', tags: ['签名', '验证'], privacyLevel: 'crypto-sensitive' },
  { route: '#/crypto/aes-gcm', category: '加密与安全', title: 'AES-GCM 加解密', description: 'PBKDF2 + AES-256-GCM 版本化密文', keywords: ['aes', '加密', '解密'], aliases: ['aes gcm', 'encrypt', 'decrypt'], icon: 'AES', tags: ['加密', '口令'], privacyLevel: 'crypto-sensitive' },
  { route: '#/generator/uuid', category: '生成器', title: 'UUID / ULID 生成器', description: '生成 UUID v4、ULID 与批量标识符', keywords: ['uuid', 'ulid', 'id', '生成'], aliases: ['guid', 'unique id', 'identifier'], icon: 'ID', tags: ['标识符', '批量'], privacyLevel: 'local-only', featured: true },
  { route: '#/generator/random', category: '生成器', title: '随机 Token / 密码', description: '生成随机 Token、十六进制串和可配置密码', keywords: ['token', 'password', '密码', '随机'], aliases: ['random token', 'password generator', 'secret'], icon: 'KEY', tags: ['随机', '密码', '密钥素材'], privacyLevel: 'crypto-sensitive', featured: true },
  { route: '#/timestamp', category: '时间与日期', title: '时间戳转换', description: '秒、毫秒、本地时间与 UTC', keywords: ['时间戳', 'timestamp', '日期'], aliases: ['unix time', 'epoch', 'date'], icon: 'T', tags: ['时间', '日期'], privacyLevel: 'local-only' },
  { route: '#/image/compress', category: '图片与颜色', title: '图片压缩', description: '缩放并导出 JPEG、PNG 或 WebP', keywords: ['图片', '压缩', 'webp', 'jpeg'], aliases: ['image compressor', 'resize image'], icon: 'IMG', tags: ['图片', '压缩'], privacyLevel: 'local-file' },
  { route: '#/dev/sql', category: '数据库SQL辅助', title: 'SQL 格式化', description: '格式化 MySQL、ClickHouse、Doris、PostgreSQL 与 Redis 命令并高亮结构', keywords: ['sql', 'mysql', 'clickhouse', 'doris', 'postgresql', 'redis', '格式化'], aliases: ['sql formatter', 'redis command', 'query formatter'], icon: 'SQL', tags: ['数据库', '格式化', '高亮'], privacyLevel: 'local-only', featured: true },
];

export const categories = ['数据格式', '编码解码', '加密与安全', '文本处理', '生成器', '时间与日期', '图片与颜色', '数据库SQL辅助', '开发辅助'];

export function findTool(hash: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.route === hash);
}

export function searchTools(query: string): ToolDefinition[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return tools;
  const score = (tool: ToolDefinition) => {
    const title = tool.title.toLocaleLowerCase();
    const fields = [tool.description, tool.category, ...tool.keywords, ...(tool.aliases ?? []), ...(tool.tags ?? [])].join(' ').toLocaleLowerCase();
    if (title === needle) return 100;
    if (title.includes(needle)) return 80;
    if ((tool.aliases ?? []).some((alias) => alias.toLocaleLowerCase().includes(needle))) return 70;
    if ((tool.tags ?? []).some((tag) => tag.toLocaleLowerCase().includes(needle))) return 60;
    if (fields.includes(needle)) return 40;
    return 0;
  };
  return tools
    .map((tool) => ({ tool, score: score(tool) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(Boolean(b.tool.featured)) - Number(Boolean(a.tool.featured)) || a.tool.title.localeCompare(b.tool.title, 'zh-Hans-CN'))
    .map((item) => item.tool);
}
