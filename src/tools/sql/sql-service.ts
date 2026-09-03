export type SqlDialect = 'auto' | 'mysql' | 'clickhouse' | 'doris' | 'postgresql' | 'redis';

export type SqlToolMode = 'format' | 'dsl';

export type SqlTokenKind =
  | 'keyword'
  | 'function'
  | 'identifier'
  | 'string'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'comment'
  | 'variable'
  | 'whitespace';

export type SqlToken = {
  kind: SqlTokenKind;
  value: string;
};

const SQL_KEYWORDS = new Set([
  'ADD', 'AFTER', 'ALTER', 'AND', 'ANTI', 'ANY', 'ARRAY', 'AS', 'ASC', 'BETWEEN', 'BY', 'CASE',
  'CAST', 'CLUSTER', 'CODEC', 'COLLATE', 'COLUMN', 'CREATE', 'CROSS', 'DATABASE', 'DELETE',
  'DESC', 'DESCRIBE', 'DICTGET', 'DISTINCT', 'DISTRIBUTED', 'DROP', 'ELSE', 'END', 'ENGINE',
  'EXISTS', 'FINAL', 'FROM', 'FULL', 'GLOBAL', 'GRANT', 'GROUP', 'HAVING', 'IF', 'ILIKE',
  'IN', 'INNER', 'INSERT', 'INTERSECT', 'INTO', 'IS', 'JOIN', 'KEY', 'LEFT', 'LIKE', 'LIMIT',
  'MATERIALIZED', 'NOT', 'NULL', 'OFFSET', 'ON', 'OPTIMIZE', 'OR', 'ORDER', 'OUTER',
  'OVER', 'PARTITION', 'PREWHERE', 'PRIMARY', 'QUALIFY', 'RENAME', 'REPLACE', 'RETURNING',
  'RIGHT', 'SAMPLE', 'SELECT', 'SEMI', 'SET', 'SETTINGS', 'SHOW', 'TABLE', 'THEN', 'TO',
  'TRUNCATE', 'UNION', 'UPDATE', 'USING', 'VALUES', 'VIEW', 'WHEN', 'WHERE', 'WINDOW', 'WITH',
]);

const SQL_FUNCTIONS = new Set([
  'ABS', 'ANY_VALUE', 'ARGMAX', 'ARGMIN', 'AVG', 'BITMAP_UNION', 'CAST', 'COALESCE', 'CONCAT',
  'COUNT', 'COUNTIF', 'DATE_TRUNC', 'DICTGET', 'EXTRACT', 'GROUP_CONCAT', 'IFNULL', 'JSON_EXTRACT',
  'JSON_EXTRACT_STRING', 'MAX', 'MIN', 'NVL', 'QUANTILE', 'ROUND', 'SPLITBYSTRING', 'STRING_AGG',
  'SUM', 'SUMIF', 'TO_DATE', 'TO_DATETIME', 'TOINT64', 'TOSTRING', 'UNIQ', 'UNIQEXACT',
]);

const CLAUSE_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'PREWHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SETTINGS', 'QUALIFY', 'WINDOW', 'UNION', 'UNION ALL', 'INTERSECT', 'WITH', 'INSERT INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE',
]);

const BREAK_KEYWORDS = new Set([
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'GLOBAL JOIN', 'GLOBAL LEFT JOIN', 'ON', 'AND', 'OR',
  'WHEN', 'THEN', 'ELSE',
]);

const REDIS_COMMANDS = new Set([
  'APPEND', 'AUTH', 'BITCOUNT', 'BITOP', 'BLPOP', 'BRPOP', 'CLIENT', 'CLUSTER', 'CONFIG', 'DBSIZE',
  'DECR', 'DEL', 'ECHO', 'EVAL', 'EXEC', 'EXISTS', 'EXPIRE', 'GET', 'HDEL', 'HEXISTS', 'HGET',
  'HGETALL', 'HINCRBY', 'HKEYS', 'HLEN', 'HMGET', 'HMSET', 'HSET', 'HVALS', 'INCR', 'INFO',
  'KEYS', 'LLEN', 'LPOP', 'LPUSH', 'LRANGE', 'MGET', 'MSET', 'MULTI', 'PING', 'PUBLISH', 'QUIT',
  'RENAME', 'SADD', 'SCAN', 'SELECT', 'SET', 'SETEX', 'SISMEMBER', 'SMEMBERS', 'SREM', 'TTL',
  'TYPE', 'XADD', 'XGROUP', 'XREAD', 'ZADD', 'ZRANGE', 'ZREM',
]);

const DSL_OPERATOR_MAP: Record<string, string> = {
  eq: '=',
  '=': '=',
  ne: '<>',
  neq: '<>',
  '!=': '<>',
  '<>': '<>',
  gt: '>',
  '>': '>',
  gte: '>=',
  '>=': '>=',
  lt: '<',
  '<': '<',
  lte: '<=',
  '<=': '<=',
  match: 'LIKE',
  like: 'LIKE',
};

function unit(indent: 2 | 4 | '\t'): string {
  return indent === '\t' ? '\t' : ' '.repeat(indent);
}

function readQuoted(input: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < input.length) {
    if (input[index] === '\\') {
      index += 2;
      continue;
    }
    if (input[index] === quote) {
      if ((quote === '\'' || quote === '"') && input[index + 1] === quote) {
        index += 2;
        continue;
      }
      return index + 1;
    }
    index += 1;
  }
  return input.length;
}

function readBracketIdentifier(input: string, start: number): number {
  const end = input.indexOf(']', start + 1);
  return end < 0 ? input.length : end + 1;
}

function tokenize(input: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < input.length && /\s/.test(input[end])) end += 1;
      tokens.push({ kind: 'whitespace', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '-' && input[index + 1] === '-') {
      let end = index + 2;
      while (end < input.length && input[end] !== '\n' && input[end] !== '\r') end += 1;
      tokens.push({ kind: 'comment', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '#') {
      let end = index + 1;
      while (end < input.length && input[end] !== '\n' && input[end] !== '\r') end += 1;
      tokens.push({ kind: 'comment', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '/' && input[index + 1] === '*') {
      const end = input.indexOf('*/', index + 2);
      tokens.push({ kind: 'comment', value: input.slice(index, end < 0 ? input.length : end + 2) });
      index = end < 0 ? input.length : end + 2;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      const end = readQuoted(input, index, char);
      tokens.push({ kind: char === '`' ? 'identifier' : 'string', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '[') {
      const end = readBracketIdentifier(input, index);
      tokens.push({ kind: 'identifier', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '$' || char === '@' || char === ':') {
      let end = index + 1;
      while (end < input.length && /[A-Za-z0-9_.$]/.test(input[end])) end += 1;
      tokens.push({ kind: 'variable', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '-' || /\d/.test(char)) {
      const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(input.slice(index));
      if (match) {
        tokens.push({ kind: 'number', value: match[0] });
        index += match[0].length;
        continue;
      }
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[A-Za-z0-9_$]/.test(input[end])) end += 1;
      const raw = input.slice(index, end);
      const upper = raw.toUpperCase();
      const nextNonSpace = input.slice(end).match(/^\s*\(/);
      if (SQL_KEYWORDS.has(upper)) tokens.push({ kind: 'keyword', value: upper });
      else if (SQL_FUNCTIONS.has(upper) || nextNonSpace) tokens.push({ kind: 'function', value: SQL_FUNCTIONS.has(upper) ? upper : raw });
      else tokens.push({ kind: 'identifier', value: raw });
      index = end;
      continue;
    }

    const two = input.slice(index, index + 2);
    if (['<=', '>=', '<>', '!=', '||', '::', '->', '=>', '&&'].includes(two)) {
      tokens.push({ kind: 'operator', value: two });
      index += 2;
      continue;
    }

    tokens.push({ kind: '(),;.'.includes(char) ? 'punctuation' : 'operator', value: char });
    index += 1;
  }
  return tokens;
}

function compactTokens(input: string): SqlToken[] {
  return tokenize(input).filter((token) => token.kind !== 'whitespace');
}

function phraseAt(tokens: SqlToken[], index: number): string | undefined {
  const first = tokens[index];
  const second = tokens[index + 1];
  const third = tokens[index + 2];
  if (!first || first.kind !== 'keyword') return undefined;
  const two = second?.kind === 'keyword' ? `${first.value} ${second.value}` : undefined;
  const three = second?.kind === 'keyword' && third?.kind === 'keyword' ? `${first.value} ${second.value} ${third.value}` : undefined;
  if (three && (CLAUSE_KEYWORDS.has(three) || BREAK_KEYWORDS.has(three))) return three;
  if (two && (CLAUSE_KEYWORDS.has(two) || BREAK_KEYWORDS.has(two))) return two;
  return first.value;
}

function phraseLength(phrase: string): number {
  return phrase.split(' ').length;
}

function needsSpace(previous: string, current: string): boolean {
  if (!previous) return false;
  if (current === ',' || current === ';' || current === ')' || current === '.') return false;
  if (previous === '(' || previous === '.') return false;
  if (current === '(' && /^[A-Za-z_][\w$]*$/i.test(previous)) return false;
  if (['+', '-', '*', '/', '%', '=', '<', '>', '<=', '>=', '<>', '!=', '||', '::', '->', '=>'].includes(previous)) return true;
  if (['+', '-', '*', '/', '%', '=', '<', '>', '<=', '>=', '<>', '!=', '||', '::', '->', '=>'].includes(current)) return true;
  return true;
}

function formatSql(input: string, indent: 2 | 4 | '\t'): string {
  const tokens = compactTokens(input);
  const indentText = unit(indent);
  const lines: string[] = [];
  let line = '';
  let depth = 0;
  let lastValue = '';

  const pushLine = () => {
    const trimmed = line.trimEnd();
    if (trimmed) lines.push(trimmed);
    line = '';
    lastValue = '';
  };
  const startLine = (extra = 0) => {
    if (!line) line = indentText.repeat(Math.max(0, depth + extra));
  };
  const write = (value: string) => {
    startLine();
    if (needsSpace(lastValue, value)) line += ' ';
    line += value;
    lastValue = value;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const phrase = phraseAt(tokens, index);

    if (token.kind === 'comment') {
      pushLine();
      startLine();
      line += token.value;
      lastValue = token.value;
      pushLine();
      continue;
    }

    if (phrase && CLAUSE_KEYWORDS.has(phrase)) {
      pushLine();
      startLine(phrase === 'SELECT' || phrase === 'WITH' ? 0 : -1);
      line += phrase;
      lastValue = phrase;
      index += phraseLength(phrase) - 1;
      if (!['UNION', 'UNION ALL', 'INTERSECT'].includes(phrase)) {
        pushLine();
        depth = Math.max(1, depth);
      }
      continue;
    }

    if (phrase && BREAK_KEYWORDS.has(phrase)) {
      pushLine();
      startLine(phrase === 'AND' || phrase === 'OR' || phrase === 'ON' ? 1 : 0);
      line += phrase;
      lastValue = phrase;
      index += phraseLength(phrase) - 1;
      continue;
    }

    if (token.value === '(') {
      write(token.value);
      depth += 1;
      continue;
    }

    if (token.value === ')') {
      depth = Math.max(0, depth - 1);
      write(token.value);
      continue;
    }

    if (token.value === ',') {
      line += ',';
      lastValue = ',';
      pushLine();
      continue;
    }

    if (token.value === ';') {
      line += ';';
      lastValue = ';';
      pushLine();
      depth = 0;
      if (index < tokens.length - 1) lines.push('');
      continue;
    }

    write(token.value);
  }
  pushLine();
  return lines.join('\n').trim();
}

function formatRedis(input: string, indent: 2 | 4 | '\t'): string {
  const indentText = unit(indent);
  return input.trim().split(/\r?\n/).map((line) => {
    const parts = line.trim().match(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|\S+/g) ?? [];
    if (!parts.length) return '';
    const command = parts[0]?.toUpperCase() ?? '';
    if (parts.length <= 3) return [command, ...parts.slice(1)].join(' ');
    return [command, ...parts.slice(1).map((part) => `${indentText}${part}`)].join('\n');
  }).join('\n');
}

function isRedisInput(input: string): boolean {
  const first = input.trim().split(/\s+/)[0]?.toUpperCase();
  return Boolean(first && REDIS_COMMANDS.has(first) && !/\bSELECT\b[\s\S]*\bFROM\b/i.test(input));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sqlIdentifier(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`DSL 缺少有效的 ${label}`);
  const trimmed = value.trim();
  if (trimmed === '*') return trimmed;
  if (!/^[A-Za-z_][A-Za-z0-9_.$]*$/.test(trimmed)) throw new Error(`${label} 只能包含字母、数字、下划线、点号和 $`);
  return trimmed;
}

function sqlLiteral(value: unknown): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('DSL 中包含无效数字');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  throw new Error('DSL 条件值只支持字符串、数字、布尔值、null 或数组');
}

function wrapCondition(value: string): string {
  return value.includes(' AND ') || value.includes(' OR ') ? `(${value})` : value;
}

function joinConditions(items: unknown, operator: 'AND' | 'OR'): string {
  if (!Array.isArray(items)) throw new Error(`DSL ${operator} 条件必须是数组`);
  const parts = items.map((item) => buildWhereClause(item)).filter(Boolean).map(wrapCondition);
  return parts.join(` ${operator} `);
}

function buildFieldCondition(fieldName: string, condition: unknown): string {
  const field = sqlIdentifier(fieldName, '字段名');

  if (Array.isArray(condition)) {
    if (!condition.length) throw new Error(`字段 ${field} 的 IN 条件不能为空`);
    return `${field} IN (${condition.map(sqlLiteral).join(', ')})`;
  }

  if (!isPlainRecord(condition)) {
    return condition === null ? `${field} IS NULL` : `${field} = ${sqlLiteral(condition)}`;
  }

  const parts = Object.entries(condition).map(([operator, rawValue]) => {
    const normalized = operator.replace(/^\$/, '').toLowerCase();
    if (normalized === 'in') {
      if (!Array.isArray(rawValue) || !rawValue.length) throw new Error(`字段 ${field} 的 IN 条件不能为空`);
      return `${field} IN (${rawValue.map(sqlLiteral).join(', ')})`;
    }
    if (normalized === 'notin' || normalized === 'not_in') {
      if (!Array.isArray(rawValue) || !rawValue.length) throw new Error(`字段 ${field} 的 NOT IN 条件不能为空`);
      return `${field} NOT IN (${rawValue.map(sqlLiteral).join(', ')})`;
    }
    if (normalized === 'between') {
      if (!Array.isArray(rawValue) || rawValue.length !== 2) throw new Error(`字段 ${field} 的 BETWEEN 条件必须包含两个值`);
      return `${field} BETWEEN ${sqlLiteral(rawValue[0])} AND ${sqlLiteral(rawValue[1])}`;
    }
    if (normalized === 'isnull' || normalized === 'is_null') {
      return rawValue ? `${field} IS NULL` : `${field} IS NOT NULL`;
    }
    const sqlOperator = DSL_OPERATOR_MAP[normalized];
    if (!sqlOperator) throw new Error(`暂不支持 DSL 操作符：${operator}`);
    return `${field} ${sqlOperator} ${sqlLiteral(sqlOperator === 'LIKE' && typeof rawValue === 'string' && !/[%_]/.test(rawValue) ? `%${rawValue}%` : rawValue)}`;
  });
  return parts.join(' AND ');
}

function buildWhereClause(where: unknown): string {
  if (!where) return '';
  if (!isPlainRecord(where)) throw new Error('DSL where/query 必须是对象');

  const parts = Object.entries(where).map(([key, value]) => {
    if (key === '$and' || key.toLowerCase() === 'and') return wrapCondition(joinConditions(value, 'AND'));
    if (key === '$or' || key.toLowerCase() === 'or') return wrapCondition(joinConditions(value, 'OR'));
    if (key === '$not' || key.toLowerCase() === 'not') return `NOT ${wrapCondition(buildWhereClause(value))}`;
    return buildFieldCondition(key, value);
  }).filter(Boolean);

  return parts.join(' AND ');
}

function buildEsQueryClause(query: unknown): string {
  if (!query) return '';
  if (!isPlainRecord(query)) throw new Error('Elasticsearch DSL query 必须是对象');

  if (isPlainRecord(query.bool)) {
    const bool = query.bool;
    const parts: string[] = [];
    const toArray = (value: unknown) => Array.isArray(value) ? value : [value];
    const joinEsConditions = (value: unknown, operator: 'AND' | 'OR') => toArray(value).map((item) => buildEsQueryClause(item)).filter(Boolean).map(wrapCondition).join(` ${operator} `);
    if (bool.must) parts.push(joinEsConditions(bool.must, 'AND'));
    if (bool.filter) parts.push(joinEsConditions(bool.filter, 'AND'));
    if (bool.should) parts.push(joinEsConditions(bool.should, 'OR'));
    if (bool.must_not) parts.push(`NOT ${wrapCondition(joinEsConditions(bool.must_not, 'AND'))}`);
    return parts.filter(Boolean).map(wrapCondition).join(' AND ');
  }

  if (isPlainRecord(query.term)) {
    const [[field, value]] = Object.entries(query.term);
    return buildFieldCondition(field, value);
  }
  if (isPlainRecord(query.terms)) {
    const [[field, value]] = Object.entries(query.terms);
    return buildFieldCondition(field, Array.isArray(value) ? value : [value]);
  }
  if (isPlainRecord(query.range)) {
    const [[field, value]] = Object.entries(query.range);
    return buildFieldCondition(field, value);
  }
  if (isPlainRecord(query.match) || isPlainRecord(query.match_phrase)) {
    const source = isPlainRecord(query.match) ? query.match : query.match_phrase;
    if (!isPlainRecord(source)) throw new Error('Elasticsearch match DSL 必须是对象');
    const [[field, value]] = Object.entries(source);
    return buildFieldCondition(field, { like: value });
  }
  if (isPlainRecord(query.exists)) {
    return buildFieldCondition(String(query.exists.field ?? ''), { isNull: false });
  }
  if (isPlainRecord(query.prefix) || isPlainRecord(query.wildcard)) {
    const source = isPlainRecord(query.prefix) ? query.prefix : query.wildcard;
    if (!isPlainRecord(source)) throw new Error('Elasticsearch prefix/wildcard DSL 必须是对象');
    const [[field, value]] = Object.entries(source);
    return buildFieldCondition(field, { like: String(value).replace(/\*/g, '%') });
  }

  return buildWhereClause(query);
}

function selectList(dsl: Record<string, unknown>): string {
  const source = dsl.select ?? dsl.fields ?? dsl._source;
  if (!source || source === true) return '*';
  if (source === false) return '*';
  if (typeof source === 'string') return source === '*' ? '*' : sqlIdentifier(source, '查询字段');
  if (Array.isArray(source)) {
    if (!source.length) return '*';
    return source.map((item) => sqlIdentifier(item, '查询字段')).join(', ');
  }
  throw new Error('DSL select/_source 必须是字符串或数组');
}

function orderByClause(value: unknown): string {
  if (!value) return '';
  const entries = Array.isArray(value) ? value : [value];
  const parts = entries.map((entry) => {
    if (typeof entry === 'string') return sqlIdentifier(entry, '排序字段');
    if (!isPlainRecord(entry)) throw new Error('DSL orderBy/sort 必须是字符串、对象或数组');
    if ('field' in entry) {
      const direction = String(entry.direction ?? entry.order ?? 'ASC').toUpperCase();
      if (!['ASC', 'DESC'].includes(direction)) throw new Error('排序方向只支持 ASC 或 DESC');
      return `${sqlIdentifier(entry.field, '排序字段')} ${direction}`;
    }
    const [[field, config]] = Object.entries(entry);
    const direction = isPlainRecord(config) ? String(config.order ?? 'ASC').toUpperCase() : String(config ?? 'ASC').toUpperCase();
    if (!['ASC', 'DESC'].includes(direction)) throw new Error('排序方向只支持 ASC 或 DESC');
    return `${sqlIdentifier(field, '排序字段')} ${direction}`;
  });
  return parts.join(', ');
}

function positiveInteger(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`${label} 必须是非负整数`);
  return value;
}

export function dslToSql(input: string, indent: 2 | 4 | '\t' = 2): string {
  const value = input.trim();
  if (!value) throw new Error('请输入 JSON DSL');
  if (value.length > 1_000_000) throw new Error('文本超过 1 MB 限制');

  let dsl: unknown;
  try {
    dsl = JSON.parse(value);
  } catch {
    throw new Error('DSL 必须是合法 JSON');
  }
  if (!isPlainRecord(dsl)) throw new Error('DSL 根节点必须是对象');

  const tableSource = dsl.table ?? dsl.index ?? (typeof dsl.from === 'string' ? dsl.from : undefined);
  const table = sqlIdentifier(tableSource, 'table/from/index');
  const where = dsl.where ? buildWhereClause(dsl.where) : buildEsQueryClause(dsl.query);
  const orderBy = orderByClause(dsl.orderBy ?? dsl.sort);
  const limit = positiveInteger(dsl.limit ?? dsl.size, 'limit/size');
  const offset = positiveInteger(dsl.offset ?? (typeof dsl.from === 'number' ? dsl.from : undefined), 'offset/from');
  const lines = [`SELECT ${selectList(dsl)}`, `FROM ${table}`];
  if (where) lines.push(`WHERE ${where}`);
  if (orderBy) lines.push(`ORDER BY ${orderBy}`);
  if (limit !== undefined) lines.push(`LIMIT ${limit}`);
  if (offset !== undefined) lines.push(`OFFSET ${offset}`);

  return formatSql(`${lines.join(' ')};`, indent);
}

export function formatDatabaseText(input: string, dialect: SqlDialect = 'auto', indent: 2 | 4 | '\t' = 2): string {
  const value = input.trim();
  if (!value) throw new Error('请输入 SQL 或 Redis 命令');
  if (value.length > 1_000_000) throw new Error('文本超过 1 MB 限制');
  if (dialect === 'redis' || (dialect === 'auto' && isRedisInput(value))) return formatRedis(value, indent);
  return formatSql(value, indent);
}

export function tokenizeDatabaseForHighlight(input: string, dialect: SqlDialect = 'auto'): SqlToken[] {
  if (!input) return [];
  if (dialect === 'redis' || (dialect === 'auto' && isRedisInput(input))) {
    return tokenize(input).map((token) => {
      const upper = token.value.toUpperCase();
      if ((token.kind === 'identifier' || token.kind === 'function' || token.kind === 'keyword') && REDIS_COMMANDS.has(upper)) return { kind: 'keyword', value: upper };
      return token;
    });
  }
  return tokenize(input);
}
