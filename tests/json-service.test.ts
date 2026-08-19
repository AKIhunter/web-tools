import { describe, expect, it } from 'vitest';
import { escapeJsonString, processJson, unescapeJsonString } from '../src/tools/json/json-service';

describe('JSON service', () => {
  it('格式化、压缩并统计嵌套结构', () => {
    const formatted = processJson('{"b":[1,{"c":"中文"}],"a":true}', 2, true);
    expect(formatted.output).toContain('"a": true');
    expect(formatted.output.indexOf('"a"')).toBeLessThan(formatted.output.indexOf('"b"'));
    expect(formatted.stats).toMatchObject({ topLevelType: 'object', items: 2, maxDepth: 3 });
    expect(processJson(formatted.output, 0).output).toBe('{"a":true,"b":[1,{"c":"中文"}]}');
  });

  it('拒绝空输入与非法 JSON', () => {
    expect(() => processJson('')).toThrow('请输入');
    expect(() => processJson('{"a":1,}')).toThrow('JSON 格式无效');
  });

  it('处理转义并提示超安全整数', () => {
    expect(unescapeJsonString(escapeJsonString('a\n"中"'))).toBe('a\n"中"');
    expect(processJson('{"id":9007199254740993}').stats.unsafeIntegers).toBe(true);
  });
});
