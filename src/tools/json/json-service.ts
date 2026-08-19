export type JsonStats = {
  topLevelType: string;
  items: number;
  maxDepth: number;
  unsafeIntegers: boolean;
};

export type JsonResult = { value: unknown; output: string; stats: JsonStats };

const unsafeIntegerPattern = /(^|[^\w.])-?\d{16,}(?=\s*[,}\]])/;

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function depth(value: unknown, level = 0): number {
  if (level > 200) return level;
  if (Array.isArray(value)) return value.reduce((max, item) => Math.max(max, depth(item, level + 1)), level);
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((max, item) => Math.max(max, depth(item, level + 1)), level);
  }
  return level;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]));
  }
  return value;
}

export function processJson(input: string, indent: 0 | 2 | 4 | '\t' = 2, sorted = false): JsonResult {
  if (!input.trim()) throw new Error('请输入 JSON 内容');
  if (input.length > 2_000_000) throw new Error('文本超过 2 MB 限制');
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new Error('JSON 格式无效，请检查引号、逗号或括号');
  }
  const outputValue = sorted ? sortKeys(value) : value;
  const items = Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 1;
  return {
    value,
    output: JSON.stringify(outputValue, null, indent),
    stats: {
      topLevelType: typeOf(value),
      items,
      maxDepth: input.length < 500_000 ? depth(value) : -1,
      unsafeIntegers: unsafeIntegerPattern.test(input),
    },
  };
}

export function escapeJsonString(input: string): string {
  return JSON.stringify(input).slice(1, -1);
}

export function unescapeJsonString(input: string): string {
  try {
    return JSON.parse(`"${input}"`) as string;
  } catch {
    throw new Error('转义字符串无效');
  }
}
