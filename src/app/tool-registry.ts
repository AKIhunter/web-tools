import type { ToolDefinition } from './tool-plugin';
import { plugins } from './plugins';
export type { ToolDefinition } from './tool-plugin';

export const tools: ToolDefinition[] = plugins.map((plugin) => plugin.definition);

export const categories = ['数据格式', '编码解码', '加密与安全', '文本处理', '生成器', '时间与日期', '图片与颜色', '数据库SQL辅助'];

export function findTool(hash: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.route === hash);
}

export function searchTools(query: string): ToolDefinition[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return tools;
  const score = (tool: ToolDefinition) => {
    const title = tool.title.toLocaleLowerCase();
    const fields = [tool.description, tool.category, ...tool.keywords, ...(tool.aliases ?? []), ...(tool.tags ?? [])].join(' ').toLocaleLowerCase();
    if (title === needle) return 100;
    if (title.includes(needle)) return 80;
    if ((tool.aliases ?? []).some((alias) => alias.toLocaleLowerCase().includes(needle))) return 70;
    if ((tool.tags ?? []).some((tag) => tag.toLocaleLowerCase().includes(needle))) return 60;
    if (fields.includes(needle)) return 40;
    return 0;
  };
  return tools
    .map((tool) => ({ tool, score: score(tool) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(Boolean(b.tool.featured)) - Number(Boolean(a.tool.featured)) || a.tool.title.localeCompare(b.tool.title, 'zh-Hans-CN'))
    .map((item) => item.tool);
}
