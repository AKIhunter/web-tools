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

  it('拒绝空输入与无法识别的内容', () => {
    expect(() => processJson('')).toThrow('请输入');
    expect(() => processJson('这不是 JSON 或 KV')).toThrow('JSON 或 KV 格式无效');
  });

  it('兼容常见的宽松 JSON 格式', () => {
    const result = processJson(`{
      // 允许注释、未加引号的 key、单引号和尾逗号
      name: '工具箱',
      enabled: true,
    }`);
    expect(result.value).toEqual({ name: '工具箱', enabled: true });
    expect(result.output).toContain('"name": "工具箱"');
  });

  it('兼容无外层花括号的 KV 结构', () => {
    const result = processJson('name=工具箱\ncount: 2\nenabled=true\ntags=[\'本地\', \'JSON\']');
    expect(result.value).toEqual({
      name: '工具箱',
      count: 2,
      enabled: true,
      tags: ['本地', 'JSON'],
    });
  });

  it('处理转义并提示超安全整数', () => {
    expect(unescapeJsonString(escapeJsonString('a\n"中"'))).toBe('a\n"中"');
    expect(processJson('{"id":9007199254740993}').stats.unsafeIntegers).toBe(true);
  });
});
