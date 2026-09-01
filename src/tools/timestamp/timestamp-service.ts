export type TimestampUnit = 'auto' | 'seconds' | 'milliseconds';
export type TimeZoneOption = {
  value: string;
  label: string;
  offsetMinutes: number | 'local';
};

export type TimestampResult = {
  milliseconds: number;
  seconds: number;
  interpretedAs: Exclude<TimestampUnit, 'auto'>;
  local: string;
  utc: string;
  zoned: string;
  timeZoneLabel: string;
  relative: string;
};

export const DEFAULT_FIXED_TIME_ZONE = 'utc+8';

export const timeZoneOptions: TimeZoneOption[] = [
  { value: 'local', label: '浏览器本地时区', offsetMinutes: 'local' },
  { value: 'utc-12', label: 'UTC-12', offsetMinutes: -720 },
  { value: 'utc-8', label: 'UTC-8', offsetMinutes: -480 },
  { value: 'utc-5', label: 'UTC-5', offsetMinutes: -300 },
  { value: 'utc', label: 'UTC+0', offsetMinutes: 0 },
  { value: 'utc+1', label: 'UTC+1', offsetMinutes: 60 },
  { value: 'utc+8', label: 'UTC+8 北京/上海', offsetMinutes: 480 },
  { value: 'utc+9', label: 'UTC+9 东京/首尔', offsetMinutes: 540 },
  { value: 'utc+10', label: 'UTC+10', offsetMinutes: 600 },
];

export function relativeTime(milliseconds: number, now = Date.now()): string {
  const seconds = Math.round((milliseconds - now) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  if (absolute < 60) return formatter.format(seconds, 'second');
  if (absolute < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
  return formatter.format(Math.round(seconds / 86400), 'day');
}

export function resolveTimeZone(value: string): TimeZoneOption {
  return timeZoneOptions.find((option) => option.value === value) ?? timeZoneOptions[0];
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

export function formatInTimeZone(milliseconds: number, timeZoneValue: string): string {
  const timeZone = resolveTimeZone(timeZoneValue);
  const date = new Date(milliseconds);
  if (timeZone.offsetMinutes === 'local') return `${date.toLocaleString()} (${timeZone.label})`;
  const shifted = new Date(milliseconds + timeZone.offsetMinutes * 60_000);
  const value = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}.${pad(shifted.getUTCMilliseconds(), 3)}`;
  return `${value} (${timeZone.label})`;
}

export function parseTimestamp(input: string, unit: TimestampUnit = 'auto', now = Date.now(), timeZoneValue = 'local'): TimestampResult {
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
    zoned: formatInTimeZone(milliseconds, timeZoneValue),
    timeZoneLabel: resolveTimeZone(timeZoneValue).label,
    relative: relativeTime(milliseconds, now),
  };
}

export function dateTimeToTimestamp(localValue: string): { seconds: number; milliseconds: number } {
  const milliseconds = new Date(localValue).getTime();
  if (Number.isNaN(milliseconds)) throw new Error('日期时间无效');
  return { seconds: milliseconds / 1000, milliseconds };
}

export function dateTimeToTimestampInTimeZone(value: string, timeZoneValue: string): { seconds: number; milliseconds: number; interpretedIn: string } {
  const timeZone = resolveTimeZone(timeZoneValue);
  if (timeZone.offsetMinutes === 'local') return { ...dateTimeToTimestamp(value), interpretedIn: timeZone.label };
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?)?$/);
  if (!match) throw new Error('日期时间格式应为 YYYY-MM-DD HH:mm:ss');
  const [, year, month, day, hour = '0', minute = '0', second = '0', millisecond = '0'] = match;
  const milliseconds = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(millisecond.padEnd(3, '0'))) - timeZone.offsetMinutes * 60_000;
  if (Number.isNaN(milliseconds)) throw new Error('日期时间无效');
  return { seconds: milliseconds / 1000, milliseconds, interpretedIn: timeZone.label };
}
