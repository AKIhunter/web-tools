export type JwtDecoded = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  algorithm?: string;
  type?: string;
  issuedAt?: string;
  notBefore?: string;
  expiresAt?: string;
  isExpired?: boolean;
};

function decodeBase64UrlText(input: string): string {
  // JWT 使用未填充的 Base64URL，需要先还原成浏览器 atob 可识别的标准 Base64。
  if (!/^[A-Za-z0-9_-]*$/.test(input)) throw new Error('JWT 分段包含非法 Base64URL 字符');
  const standard = input.replaceAll('-', '+').replaceAll('_', '/');
  if (standard.length % 4 === 1) throw new Error('JWT Base64URL 长度无效');
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, '=');
  try {
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('JWT 分段不是有效的 UTF-8 JSON');
  }
}

function decodeJsonSegment(input: string, name: string): Record<string, unknown> {
  const text = decodeBase64UrlText(input);
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new Error(`JWT ${name} 不是有效的 JSON 对象`);
  }
}

function formatUnixSeconds(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
}

export function parseJwt(input: string, now = Date.now()): JwtDecoded {
  // 这里只做本地解码，不接收密钥，也不尝试验证 signature 是否可信。
  const token = input.trim().replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part, index) => index < 2 && !part)) {
    throw new Error('请输入包含 header.payload.signature 的 JWT');
  }
  const header = decodeJsonSegment(parts[0], 'Header');
  const payload = decodeJsonSegment(parts[1], 'Payload');
  const expiresAt = formatUnixSeconds(payload.exp);
  return {
    header,
    payload,
    signature: parts[2],
    algorithm: typeof header.alg === 'string' ? header.alg : undefined,
    type: typeof header.typ === 'string' ? header.typ : undefined,
    issuedAt: formatUnixSeconds(payload.iat),
    notBefore: formatUnixSeconds(payload.nbf),
    expiresAt,
    isExpired: typeof payload.exp === 'number' ? payload.exp * 1000 <= now : undefined,
  };
}

export function formatJwtReport(decoded: JwtDecoded): string {
  return JSON.stringify(
    {
      summary: {
        algorithm: decoded.algorithm ?? '未知',
        type: decoded.type ?? '未知',
        signatureLength: decoded.signature.length,
        issuedAt: decoded.issuedAt,
        notBefore: decoded.notBefore,
        expiresAt: decoded.expiresAt,
        isExpired: decoded.isExpired,
        // 避免把“能解码”误读成“签名已通过验证”。
        verified: false,
        note: '仅本地解码 JWT 内容，不验证签名可信度',
      },
      header: decoded.header,
      payload: decoded.payload,
    },
    null,
    2,
  );
}
