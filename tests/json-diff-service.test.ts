import { describe, expect, it } from 'vitest';
import { compareFormattedJson, formatJsonForCompare } from '../src/tools/json/json-diff-service';

describe('JSON diff service', () => {
  it('格式化原始 JSON 后用于对比', () => {
    expect(formatJsonForCompare('{"b":2,"a":1}', '左侧')).toBe('{\n  "b": 2,\n  "a": 1\n}');
  });

  it('按格式化后的序号行对比差异', () => {
    const rows = compareFormattedJson('{"name":"工具箱","count":1}', '{"name":"工具箱","count":2}');
    expect(rows.map((row) => row.lineNumber)).toEqual([1, 2, 3, 4]);
    expect(rows[2]).toMatchObject({
      lineNumber: 3,
      left: '  "count": 1',
      right: '  "count": 2',
      lineDifferent: true,
    });
    expect(rows[2]?.leftRange).toEqual([11, 12]);
    expect(rows[2]?.rightRange).toEqual([11, 12]);
  });

  it('处理两侧行数不同的 JSON', () => {
    const rows = compareFormattedJson('{"a":1}', '{"a":1,"b":2}');
    expect(rows).toHaveLength(4);
    expect(rows.some((row) => row.left === '' && row.right)).toBe(true);
  });

  it('校验空输入和非法 JSON', () => {
    expect(() => compareFormattedJson('', '{}')).toThrow('请输入左侧 JSON 内容');
    expect(() => compareFormattedJson('{}', '{')).toThrow('右侧 JSON 格式无效');
  });
});
