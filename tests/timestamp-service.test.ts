import { describe, expect, it } from 'vitest';
import { dateTimeToTimestamp, dateTimeToTimestampInTimeZone, formatInTimeZone, parseTimestamp, relativeTime, resolveTimeZone } from '../src/tools/timestamp/timestamp-service';

describe('Timestamp service', () => {
  it('处理零、负数、秒和毫秒', () => {
    expect(parseTimestamp('0').utc).toBe('1970-01-01T00:00:00.000Z');
    expect(parseTimestamp('-1').milliseconds).toBe(-1000);
    expect(parseTimestamp('1700000000').interpretedAs).toBe('seconds');
    expect(parseTimestamp('1700000000000').interpretedAs).toBe('milliseconds');
  });

  it('拒绝无效与超范围日期', () => {
    expect(() => parseTimestamp('not-a-number')).toThrow();
    expect(() => parseTimestamp('9e20', 'milliseconds')).toThrow();
    expect(() => dateTimeToTimestamp('invalid')).toThrow();
  });

  it('生成 UTC、本地与相对时间', () => {
    const result = parseTimestamp('1000', 'milliseconds', 0);
    expect(result.utc).toBe('1970-01-01T00:00:01.000Z');
    expect(result.local.length).toBeGreaterThan(0);
    expect(relativeTime(60_000, 0)).toContain('1');
  });

  it('按指定 UTC 偏移格式化结果', () => {
    expect(formatInTimeZone(0, 'utc+8')).toContain('1970-01-01 08:00:00.000');
    expect(formatInTimeZone(0, 'utc-5')).toContain('1969-12-31 19:00:00.000');
    expect(parseTimestamp('0', 'seconds', 0, 'utc+8').timeZoneLabel).toContain('UTC+8');
  });

  it('日期时间可按指定时区解释', () => {
    expect(dateTimeToTimestampInTimeZone('1970-01-01 08:00:00', 'utc+8').milliseconds).toBe(0);
    expect(dateTimeToTimestampInTimeZone('1970-01-01 00:00:00', 'utc').milliseconds).toBe(0);
    expect(resolveTimeZone('missing').value).toBe('local');
  });
});
