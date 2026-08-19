import { describe, expect, it } from 'vitest';
import { decryptText, digestText, encryptText, signHmac, verifyHmac } from '../src/tools/crypto/crypto-service';
import { parseEnvelope } from '../src/tools/crypto/envelope';

describe('Crypto service', () => {
  it('匹配标准 SHA-256 与 HMAC 向量', async () => {
    expect(await digestText('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const signature = await signHmac('The quick brown fox jumps over the lazy dog', 'key');
    expect(signature).toBe('97yD9DBThCSxMpjmqm-xQ-9NWaFJRhdZl0edvC0aPNg');
    expect(await verifyHmac('The quick brown fox jumps over the lazy dog', 'key', signature)).toBe(true);
  });

  it('AES-GCM 往返且每次使用随机参数', async () => {
    const first = await encryptText('秘密', 'strong password');
    const second = await encryptText('秘密', 'strong password');
    expect(first).not.toBe(second);
    expect(await decryptText(first, 'strong password')).toBe('秘密');
    expect(parseEnvelope(first).version).toBe(1);
  }, 20_000);

  it('统一拒绝错误口令、篡改和未知版本', async () => {
    const encrypted = await encryptText('secret', 'correct');
    await expect(decryptText(encrypted, 'wrong')).rejects.toThrow('解密失败');
    const envelope = JSON.parse(encrypted) as Record<string, unknown>;
    envelope.version = 2;
    await expect(decryptText(JSON.stringify(envelope), 'correct')).rejects.toThrow('解密失败');
  }, 20_000);
});
