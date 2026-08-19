import { base64ToBytes, bytesToBase64 } from '../base64/base64-service';
import { parseEnvelope, type CryptoEnvelope } from './envelope';

const encoder = new TextEncoder();
export const PBKDF2_ITERATIONS = 310_000;

function requireCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error('当前环境不支持 Web Crypto');
  return globalThis.crypto.subtle;
}

function toHex(data: ArrayBuffer): string {
  return [...new Uint8Array(data)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return Uint8Array.from(data).buffer;
}

export async function digestText(input: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
  return toHex(await requireCrypto().digest(algorithm, encoder.encode(input)));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return requireCrypto().importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signHmac(input: string, secret: string): Promise<string> {
  const signature = await requireCrypto().sign('HMAC', await importHmacKey(secret), encoder.encode(input));
  return bytesToBase64(new Uint8Array(signature), true);
}

export async function verifyHmac(input: string, secret: string, signature: string): Promise<boolean> {
  return requireCrypto().verify('HMAC', await importHmacKey(secret), toArrayBuffer(base64ToBytes(signature)), encoder.encode(input));
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await requireCrypto().importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return requireCrypto().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plaintext: string, password: string): Promise<string> {
  if (!password) throw new Error('请输入口令');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const encrypted = await requireCrypto().encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  const envelope: CryptoEnvelope = {
    version: 1,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt, true),
    iv: bytesToBase64(iv, true),
    ciphertext: bytesToBase64(new Uint8Array(encrypted), true),
  };
  return JSON.stringify(envelope);
}

export async function decryptText(input: string, password: string): Promise<string> {
  if (!password) throw new Error('请输入口令');
  try {
    const envelope = parseEnvelope(input);
    const key = await deriveKey(password, base64ToBytes(envelope.salt), envelope.iterations);
    const decrypted = await requireCrypto().decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(envelope.iv)) },
      key,
      toArrayBuffer(base64ToBytes(envelope.ciphertext)),
    );
    return new TextDecoder('utf-8', { fatal: true }).decode(decrypted);
  } catch {
    throw new Error('解密失败：口令、密文或信封格式无效');
  }
}
