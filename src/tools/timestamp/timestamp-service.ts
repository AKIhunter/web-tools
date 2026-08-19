export type TimestampUnit = 'auto' | 'seconds' | 'milliseconds';

export type TimestampResult = {
  milliseconds: number;
  seconds: number;
  interpretedAs: Exclude<TimestampUnit, 'auto'>;
  local: string;
  utc: string;
  relative: string;
};

export function relativeTime(milliseconds: number, now = Date.now()): string {
  const seconds = Math.round((milliseconds - now) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  if (absolute < 60) return formatter.format(seconds, 'second');
  if (absolute < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86400), 'day');
}

export function parseTimestamp(input: string, unit: TimestampUnit = 'auto', now = Date.now()): TimestampResult {
  if (!input.trim()) throw new Error('请输入时间戳');
  const number = Number(input);
  if (!Number.isFinite(number)) throw new Error('时间戳必须是有限数字');
  const interpretedAs = unit === 'auto' ? (Math.abs(number) < 100_000_000_000 ? 'seconds' : 'milliseconds') : unit;
  const milliseconds = interpretedAs === 'seconds' ? number * 1000 : number;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new Error('时间戳超出日期范围');
  return {
    milliseconds,
    seconds: milliseconds / 1000,
    interpretedAs,
    local: date.toLocaleString(),
    utc: date.toISOString(),
    relative: relativeTime(milliseconds, now),
  };
}

export function dateTimeToTimestamp(localValue: string): { seconds: number; milliseconds: number } {
  const milliseconds = new Date(localValue).getTime();
  if (Number.isNaN(milliseconds)) throw new Error('日期时间无效');
  return { seconds: milliseconds / 1000, milliseconds };
}
