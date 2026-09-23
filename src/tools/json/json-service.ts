import JSON5 from 'json5';

export type JsonStats = {
  topLevelType: string;
  items: number;
  maxDepth: number;
  unsafeIntegers: boolean;
};

export type JsonResult = { value: unknown; output: string; stats: JsonStats };

const unsafeIntegerPattern = /(^|[^\w.])-?\d{16,}(?=\s*[,}\]])/;

function splitKeyValuePairs(input: string): string[] {
  const pairs: string[] = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let depth = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"' || char === '\'') {
      quote = quote === char ? '' : quote || char;
      continue;
    }
    if (quote) continue;
    if (char === '{' || char === '[' || char === '(') depth += 1;
    if (char === '}' || char === ']' || char === ')') depth -= 1;
    if (depth === 0 && (char === '\n' || char === ',' || char === ';')) {
      const pair = input.slice(start, index).trim();
      if (pair) pairs.push(pair);
      start = index + 1;
    }
  }
  const tail = input.slice(start).trim();
  if (tail) pairs.push(tail);
  return pairs;
}

function parseKeyValueInput(input: string): Record<string, unknown> {
  if (/^[{[]/.test(input.trim())) throw new Error('不是无外层括号的 KV 结构');
  const pairs = splitKeyValuePairs(input);
  if (!pairs.length) throw new Error('未找到 KV 数据');
  const result = Object.create(null) as Record<string, unknown>;
  pairs.forEach((pair) => {
    const match = pair.match(/^(.+?)\s*[:=]\s*(.*)$/s);
    if (!match) throw new Error(`无法识别 KV 项：${pair}`);
    let key = match[1].trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith('\'') && key.endsWith('\''))) {
      key = JSON5.parse(key) as string;
    }
    if (!key || /[{}\[\]]/.test(key)) throw new Error(`KV 键无效：${key || pair}`);
    const rawValue = match[2].trim();
    if (!rawValue) {
      result[key] = '';
      return;
    }
    try {
      result[key] = JSON5.parse(rawValue) as unknown;
    } catch {
      result[key] = rawValue;
    }
  });
  return result;
}

function parseJsonInputDirect(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    try {
      return JSON5.parse(input) as unknown;
    } catch {
      return parseKeyValueInput(input);
    }
  }
}

function looksStructured(input: string): boolean {
  const value = input.trim();
  return /^[{[]/.test(value) || /(^|[\n,;])\s*[^:=\n,;]+\s*[:=]/.test(value);
}

function parseJsonInput(input: string): unknown {
  try {
    const value = parseJsonInputDirect(input);
    if (typeof value === 'string' && looksStructured(value)) {
      return parseJsonInputDirect(value);
    }
    return value;
  } catch (error) {
    const unescaped = unescapeJsonString(input);
    if (unescaped === input || !looksStructured(unescaped)) throw error;
    return parseJsonInputDirect(unescaped);
  }
}

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
    value = parseJsonInput(input);
  } catch {
    throw new Error('JSON 或 KV 格式无效，请检查键值分隔符、引号、逗号或括号');
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
  let escaped = false;
  let quoted = '';
  for (const char of input) {
    if (char === '\n') {
      quoted += '\\n';
      escaped = false;
      continue;
    }
    if (char === '\r') {
      quoted += '\\r';
      escaped = false;
      continue;
    }
    if (char === '\t') {
      quoted += '\\t';
      escaped = false;
      continue;
    }
    if (char === '"' && !escaped) quoted += '\\';
    quoted += char;
    escaped = char === '\\' ? !escaped : false;
  }
  try {
    return JSON.parse(`"${quoted}"`) as string;
  } catch {
    throw new Error('转义字符串无效');
  }
}
