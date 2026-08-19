const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

function secureCrypto(): Crypto {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
    throw new Error('当前环境不支持安全随机数生成');
  }
  return globalThis.crypto;
}

function randomBytes(length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0) throw new Error('长度必须是非负整数');
  const bytes = new Uint8Array(length);
  secureCrypto().getRandomValues(bytes);
  return bytes;
}

function randomIndex(max: number): number {
  if (max <= 0 || max > 256) throw new Error('字符集大小无效');
  const limit = 256 - (256 % max);
  let value = 0;
  do {
    value = randomBytes(1)[0];
  } while (value >= limit);
  return value % max;
}

function randomFromAlphabet(length: number, alphabet: string): string {
  if (!Number.isInteger(length) || length < 1) throw new Error('长度必须大于 0');
  if (!alphabet) throw new Error('字符集不能为空');
  return Array.from({ length }, () => alphabet[randomIndex(alphabet.length)]).join('');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function encodeTime(time: number): string {
  if (!Number.isFinite(time) || time < 0 || time > 0xffffffffffff) throw new Error('ULID 时间超出范围');
  let value = Math.floor(time);
  let output = '';
  for (let index = 0; index < 10; index += 1) {
    output = CROCKFORD[value % 32] + output;
    value = Math.floor(value / 32);
  }
  return output;
}

export function generateUuidV4(): string {
  const cryptoApi = secureCrypto();
  if (typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function generateUlid(time = Date.now()): string {
  return encodeTime(time) + randomFromAlphabet(16, CROCKFORD);
}

export type TokenFormat = 'base64url' | 'hex' | 'numeric';

export function generateToken(length: number, format: TokenFormat): string {
  if (!Number.isInteger(length) || length < 1) throw new Error('长度必须大于 0');
  if (format === 'numeric') return randomFromAlphabet(length, DIGITS);
  if (format === 'hex') return bytesToHex(randomBytes(Math.ceil(length / 2))).slice(0, length);
  if (format === 'base64url') return bytesToBase64Url(randomBytes(Math.ceil((length * 3) / 4))).slice(0, length);
  throw new Error('不支持的 Token 格式');
}

export type PasswordOptions = {
  length: number;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
};

export function generatePassword(options: PasswordOptions): string {
  if (!Number.isInteger(options.length) || options.length < 1) throw new Error('长度必须大于 0');
  const groups = [
    options.lowercase === false ? '' : LOWER,
    options.uppercase === false ? '' : UPPER,
    options.digits === false ? '' : DIGITS,
    options.symbols ? SYMBOLS : '',
  ].filter(Boolean);
  if (!groups.length) throw new Error('至少选择一种字符类型');
  if (options.length < groups.length) throw new Error('长度不能小于已选择的字符类型数量');
  const alphabet = groups.join('');
  const chars = groups.map((group) => group[randomIndex(group.length)]);
  while (chars.length < options.length) chars.push(alphabet[randomIndex(alphabet.length)]);
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join('');
}
