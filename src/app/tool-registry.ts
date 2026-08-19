export type ToolDefinition = {
  route: string;
  category: string;
  title: string;
  description: string;
  keywords: string[];
};

export const tools: ToolDefinition[] = [
  { route: '#/json', category: 'JSON', title: 'JSON 工具', description: '校验、格式化、压缩、转义与键排序', keywords: ['json', '格式化', '压缩', '校验'] },
  { route: '#/codec/url', category: '编码解码', title: 'URL 编解码', description: 'URI 组件、完整 URL 与查询参数', keywords: ['url', 'encode', 'query'] },
  { route: '#/codec/unicode', category: '编码解码', title: 'Unicode 工具', description: 'Unicode 转义与 UTF-8 字节', keywords: ['unicode', 'utf8', '转义'] },
  { route: '#/base64/text', category: 'Base64', title: 'Base64 文本', description: 'UTF-8 文本与 Base64URL 往返', keywords: ['base64', '文本', '编码'] },
  { route: '#/base64/file', category: 'Base64', title: 'Base64 文件', description: '文件与 Data URL 本地转换', keywords: ['base64', 'file', 'data url'] },
  { route: '#/crypto/digest', category: '加解密', title: '安全摘要', description: 'SHA-256、SHA-384 与 SHA-512', keywords: ['sha', 'hash', '摘要'] },
  { route: '#/crypto/hmac', category: '加解密', title: 'HMAC 签名', description: 'HMAC-SHA-256 签名与验证', keywords: ['hmac', '签名', '验证'] },
  { route: '#/crypto/aes-gcm', category: '加解密', title: 'AES-GCM 加解密', description: 'PBKDF2 + AES-256-GCM 版本化密文', keywords: ['aes', '加密', '解密'] },
  { route: '#/timestamp', category: '时间戳', title: '时间戳转换', description: '秒、毫秒、本地时间与 UTC', keywords: ['时间戳', 'timestamp', '日期'] },
  { route: '#/image/compress', category: '图片压缩', title: '图片压缩', description: '缩放并导出 JPEG、PNG 或 WebP', keywords: ['图片', '压缩', 'webp', 'jpeg'] },
];

export const categories = ['JSON', '编码解码', 'Base64', '加解密', '时间戳', '图片压缩'];

export function findTool(hash: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.route === hash);
}

export function searchTools(query: string): ToolDefinition[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return tools;
  return tools.filter((tool) => [tool.title, tool.description, tool.category, ...tool.keywords].join(' ').toLocaleLowerCase().includes(needle));
}
