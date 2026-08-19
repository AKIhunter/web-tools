import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64, decodeBase64Text, encodeBase64Text } from '../src/tools/base64/base64-service';

describe('Base64 service', () => {
  it.each(['', '中文', 'emoji 😀', '\u0000binary'])('UTF-8 文本往返：%s', (value) => {
    expect(decodeBase64Text(encodeBase64Text(value))).toBe(value);
    expect(decodeBase64Text(encodeBase64Text(value, true))).toBe(value);
  });

  it('支持缺失填充和 URL-safe 字母表', () => {
    const bytes = Uint8Array.from([251, 255, 0]);
    expect(bytesToBase64(bytes, true)).toBe('-_8A');
    expect(base64ToBytes('-_8A')).toEqual(bytes);
    expect(decodeBase64Text('5Lit5paH')).toBe('中文');
  });

  it('拒绝非法字符、长度和非 UTF-8 内容', () => {
    expect(() => base64ToBytes('abc$')).toThrow();
    expect(() => base64ToBytes('a')).toThrow();
    expect(() => decodeBase64Text('/w==')).toThrow('UTF-8');
  });
});
