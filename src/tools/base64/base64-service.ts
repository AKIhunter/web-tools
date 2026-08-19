function bytesToBinary(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    result += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return result;
}

export function bytesToBase64(bytes: Uint8Array, urlSafe = false): string {
  const standard = btoa(bytesToBinary(bytes));
  return urlSafe ? standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '') : standard;
}

export function base64ToBytes(input: string): Uint8Array {
  const compact = input.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(compact) || /=/.test(compact.slice(0, -2))) {
    throw new Error('Base64 包含非法字符或填充');
  }
  const standard = compact.replace(/-/g, '+').replace(/_/g, '/');
  if (standard.length % 4 === 1) throw new Error('Base64 长度无效');
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, '=');
  try {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    throw new Error('Base64 内容无效');
  }
}

export function encodeBase64Text(input: string, urlSafe = false): string {
  return bytesToBase64(new TextEncoder().encode(input), urlSafe);
}

export function decodeBase64Text(input: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(input));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Base64')) throw error;
    throw new Error('解码结果不是有效的 UTF-8 文本');
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function parseDataUrl(input: string): { mime: string; bytes: Uint8Array } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(input);
  if (!match) throw new Error('Data URL 格式无效');
  const mime = match[1] || 'application/octet-stream';
  const bytes = match[2] ? base64ToBytes(match[3]) : new TextEncoder().encode(decodeURIComponent(match[3]));
  return { mime, bytes };
}
