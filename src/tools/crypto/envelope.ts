import { base64ToBytes } from '../base64/base64-service';

export type CryptoEnvelope = {
  version: 1;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

export function parseEnvelope(input: string): CryptoEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new Error('密文信封格式无效');
  }
  if (!value || typeof value !== 'object') throw new Error('密文信封格式无效');
  const item = value as Partial<CryptoEnvelope>;
  if (
    item.version !== 1 ||
    item.algorithm !== 'AES-256-GCM' ||
    item.kdf !== 'PBKDF2-SHA-256' ||
    !Number.isInteger(item.iterations) ||
    (item.iterations ?? 0) < 100_000 ||
    typeof item.salt !== 'string' ||
    typeof item.iv !== 'string' ||
    typeof item.ciphertext !== 'string'
  ) {
    throw new Error('不支持或不完整的密文信封');
  }
  if (base64ToBytes(item.salt).length !== 16 || base64ToBytes(item.iv).length !== 12) {
    throw new Error('密文信封参数无效');
  }
  base64ToBytes(item.ciphertext);
  return item as CryptoEnvelope;
}
