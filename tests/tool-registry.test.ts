import { describe, expect, it } from 'vitest';
import { categories, findTool, searchTools, tools } from '../src/app/tool-registry';

describe('Tool registry', () => {
  it('所有 route 唯一且 category 已注册', () => {
    const routes = tools.map((tool) => tool.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(tools.every((tool) => categories.includes(tool.category))).toBe(true);
    expect(categories.every((category) => tools.some((tool) => tool.category === category))).toBe(true);
  });

  it('findTool 根据 route 返回工具定义', () => {
    expect(findTool('#/json')?.title).toBe('JSON 工具');
    expect(findTool('#/missing')).toBeUndefined();
  });

  it('搜索支持标题、alias、tag 与无结果', () => {
    expect(searchTools('json')[0]?.route).toBe('#/json');
    expect(searchTools('guid')[0]?.route).toBe('#/generator/uuid');
    expect(searchTools('随机')[0]?.route).toBe('#/generator/random');
    expect(searchTools('definitely-not-exists')).toEqual([]);
  });

  it('标题命中优先于普通字段命中', () => {
    const results = searchTools('Base64');
    expect(results[0]?.title).toBe('Base64 文本');
    expect(results.map((tool) => tool.route)).toContain('#/base64/file');
  });
});
