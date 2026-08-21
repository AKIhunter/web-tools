import { describe, expect, it } from 'vitest';
import { formatJwtReport, parseJwt } from '../src/tools/jwt/jwt-service';

const token = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IldlYiBUb29sYm94IiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQxMDI0NDQ4MDB9',
  'signature',
].join('.');

describe('JWT service', () => {
  it('解析 JWT header、payload 和注册时间字段', () => {
    const decoded = parseJwt(`Bearer ${token}`, 1_700_000_000_000);
    expect(decoded.algorithm).toBe('HS256');
    expect(decoded.type).toBe('JWT');
    expect(decoded.payload.sub).toBe('1234567890');
    expect(decoded.issuedAt).toBe('2023-11-14T22:13:20.000Z');
    expect(decoded.expiresAt).toBe('2100-01-01T00:00:00.000Z');
    expect(decoded.isExpired).toBe(false);
  });

  it('输出报告时明确不验证签名', () => {
    expect(formatJwtReport(parseJwt(token))).toContain('"verified": false');
  });

  it('拒绝无效 JWT', () => {
    expect(() => parseJwt('abc.def')).toThrow('header.payload.signature');
    expect(() => parseJwt('abc.def.ghi')).toThrow('JWT 分段不是有效的 UTF-8 JSON');
    expect(() => parseJwt('@@@.def.ghi')).toThrow('非法 Base64URL 字符');
  });
});
