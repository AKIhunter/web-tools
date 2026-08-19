import { describe, expect, it } from 'vitest';
import { tokenizeJsonForHighlight } from '../src/tools/json/json-highlight-service';

describe('JSON highlight service', () => {
  it('区分对象 key 与字符串值', () => {
    const tokens = tokenizeJsonForHighlight('{"name":"工具箱"}');
    expect(tokens).toEqual([
      { kind: 'punctuation', value: '{' },
      { kind: 'key', value: '"name"' },
      { kind: 'punctuation', value: ':' },
      { kind: 'string', value: '"工具箱"' },
      { kind: 'punctuation', value: '}' },
    ]);
  });

  it('识别数字、布尔值、null、标点和空白', () => {
    const tokens = tokenizeJsonForHighlight('{\n  "count": 3,\n  "ok": true,\n  "none": null\n}');
    expect(tokens.map((token) => token.kind)).toContain('whitespace');
    expect(tokens).toContainEqual({ kind: 'number', value: '3' });
    expect(tokens).toContainEqual({ kind: 'boolean', value: 'true' });
    expect(tokens).toContainEqual({ kind: 'null', value: 'null' });
    expect(tokens.filter((token) => token.kind === 'key').map((token) => token.value)).toEqual(['"count"', '"ok"', '"none"']);
  });

  it('保留带转义引号的字符串并正确判断 key', () => {
    const tokens = tokenizeJsonForHighlight('{"a\\"b":"c\\"d"}');
    expect(tokens).toContainEqual({ kind: 'key', value: '"a\\"b"' });
    expect(tokens).toContainEqual({ kind: 'string', value: '"c\\"d"' });
  });
});
