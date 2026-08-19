import { describe, expect, it } from 'vitest';
import { decodeUrlComponent, encodeUrlComponent, parseFormQuery, parseUrl } from '../src/tools/codec/url-service';
import { escapeUnicode, unescapeUnicode, utf8Hex } from '../src/tools/codec/unicode-service';

describe('URL service', () => {
  it('往返 URI 组件并拒绝非法序列', () => {
    const value = '中文 + / ?';
    expect(decodeUrlComponent(encodeUrlComponent(value))).toBe(value);
    expect(() => decodeUrlComponent('%E0%A4%A')).toThrow();
  });

  it('保留重复查询键并区分加号语义', () => {
    expect(parseFormQuery('q=a+b&q=%2B')).toEqual([['q', 'a b'], ['q', '+']]);
    expect(parseUrl('https://example.com/a?q=1#x').parameters).toEqual([['q', '1']]);
  });
});

describe('Unicode service', () => {
  it('正确处理中文和代理对', () => {
    const escaped = escapeUnicode('中😀');
    expect(escaped).toBe('\\u4e2d\\ud83d\\ude00');
    expect(unescapeUnicode(escaped)).toBe('中😀');
    expect(utf8Hex('😀')).toBe('f0 9f 98 80');
  });
});
