import { describe, expect, it } from 'vitest';
import { generatePassword, generateToken, generateUlid, generateUuidV4 } from '../src/tools/generator/random-service';

describe('Generator service', () => {
  it('生成符合版本和变体位的 UUID v4', () => {
    expect(generateUuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('生成 26 位 ULID 且时间前缀随时间排序', () => {
    const first = generateUlid(0);
    const second = generateUlid(1);
    expect(first).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(first.slice(0, 10)).toBe('0000000000');
    expect(second.slice(0, 10)).toBe('0000000001');
    expect(() => generateUlid(-1)).toThrow('ULID 时间超出范围');
    expect(() => generateUlid(Number.POSITIVE_INFINITY)).toThrow('ULID 时间超出范围');
  });

  it('按格式生成指定长度 Token', () => {
    expect(generateToken(1, 'hex')).toHaveLength(1);
    expect(generateToken(32, 'hex')).toMatch(/^[0-9a-f]{32}$/);
    expect(generateToken(24, 'base64url')).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(generateToken(12, 'numeric')).toMatch(/^[0-9]{12}$/);
    expect(() => generateToken(0, 'hex')).toThrow('长度必须大于 0');
    expect(() => generateToken(8, 'unknown' as never)).toThrow('不支持的 Token 格式');
  });

  it('生成包含必选字符组的密码并校验约束', () => {
    const password = generatePassword({ length: 16, lowercase: true, uppercase: true, digits: true, symbols: true });
    expect(password).toHaveLength(16);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*()\-_=+\[\]{};:,.?]/);
    expect(() => generatePassword({ length: 1, lowercase: true, uppercase: true, digits: true })).toThrow();
    expect(() => generatePassword({ length: 8, lowercase: false, uppercase: false, digits: false, symbols: false })).toThrow('至少选择一种字符类型');
  });
});
