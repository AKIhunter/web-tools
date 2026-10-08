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

function parseJsonSequence(input: string): unknown[] | null {
  const values: unknown[] = [];
  const stack: string[] = [];
  let start = -1;
  let quote = '';
  let escaped = false;
  let comment: '' | 'line' | 'block' = '';
  let separatorPending = false;

  // 按顶层括号边界切分；字符串和注释中的括号不参与结构判断。
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (comment === 'line') {
      if (/[\r\n\u2028\u2029]/.test(char)) comment = '';
      continue;
    }
    if (comment === 'block') {
      if (char === '*' && next === '/') {
        comment = '';
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && (next === '/' || next === '*')) {
      comment = next === '/' ? 'line' : 'block';
      index += 1;
      continue;
    }
    if (start === -1) {
      if (/\s/.test(char)) continue;
      if ((char === ',' || char === ';') && values.length > 0 && !separatorPending) {
        separatorPending = true;
        continue;
      }
      if (char !== '{' && char !== '[') return null;
      start = index;
      separatorPending = false;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '{' || char === '[') stack.push(char);
    else if (char === '}' || char === ']') {
      if (stack.pop() !== (char === '}' ? '{' : '[')) return null;
      if (stack.length === 0) {
        const segment = input.slice(start, index + 1);
        try {
          values.push(JSON.parse(segment));
        } catch {
          try {
            values.push(JSON5.parse(segment) as unknown);
          } catch {
            return null;
          }
        }
        start = -1;
      }
    }
  }
  // 必须完整消费所有片段，不因前面有合法对象就忽略损坏的尾部。
  if (start !== -1 || comment === 'block' || separatorPending || values.length < 2) return null;
  return values;
}

function parseJsonInputDirect(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    try {
      return JSON5.parse(input) as unknown;
    } catch {
      const sequence = parseJsonSequence(input);
      if (sequence) return sequence;
      return parseKeyValueInput(input);
    }
  }
}

function looksStructured(input: string): boolean {
  const value = input.trim();
  return /^[{[]/.test(value) || /(^|[\n,;])\s*[^:=\n,;]+\s*[:=]/.test(value);
}

function normalizeEmbeddedJson(input: string, wrapArray = false): string | null {
  // 部分日志只丢失 request_body 的数组开括号，末尾的 ] 仍然存在。
  let candidate = wrapArray && !input.trimStart().startsWith('[') ? `[${input}` : input;
  for (let level = 0; level < 3; level += 1) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      try {
        const unescaped = unescapeJsonString(candidate);
        if (unescaped === candidate) return null;
        candidate = unescaped;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function repairTruncatedRequestResponseLog(input: string): Record<string, string> | null {
  const match = input.trim().match(/^(?<request>(?:\[\{|{\s*\\")[\s\S]*}\])"\s*,\s*"(?<responseKey>response_[^"]+)"\s*:\s*"(?<response>[\s\S]*)"\s*}$/);
  if (!match?.groups) return null;
  const request = normalizeEmbeddedJson(match.groups.request, true);
  const response = normalizeEmbeddedJson(match.groups.response);
  if (!request || !response) return null;
  const requestKey = match.groups.responseKey.replace(/^response_/, 'request_');
  return {
    [requestKey]: request,
    [match.groups.responseKey]: response,
  };
}

function parseJsonInput(input: string): unknown {
  let candidate = input;
  let lastError: unknown;
  for (let level = 0; level < 4; level += 1) {
    try {
      const value = parseJsonInputDirect(candidate);
      if (typeof value !== 'string' || !looksStructured(value)) return value;
      candidate = value;
    } catch (error) {
      lastError = error;
      const repaired = level === 0 ? repairTruncatedRequestResponseLog(candidate) : null;
      if (repaired) {
        return repaired;
      }
      const unescaped = unescapeJsonString(candidate);
      if (unescaped === candidate || !looksStructured(unescaped)) throw error;
      candidate = unescaped;
    }
  }
  try {
    return parseJsonInputDirect(candidate);
  } catch {
    throw lastError;
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
