export function escapeUnicode(input: string): string {
  return [...input]
    .map((char) => {
      const point = char.codePointAt(0) ?? 0;
      if (point <= 0xffff) return `\\u${point.toString(16).padStart(4, '0')}`;
      const adjusted = point - 0x10000;
      const high = 0xd800 + (adjusted >> 10);
      const low = 0xdc00 + (adjusted & 0x3ff);
      return `\\u${high.toString(16)}\\u${low.toString(16)}`;
    })
    .join('');
}

export function unescapeUnicode(input: string): string {
  if (/\\u(?![0-9a-fA-F]{4})/.test(input)) throw new Error('Unicode 转义必须包含 4 位十六进制数字');
  return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
}

export function utf8Hex(input: string): string {
  return [...new TextEncoder().encode(input)].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
}
