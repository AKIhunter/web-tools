export type JsonTokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'whitespace';

export type JsonToken = {
  kind: JsonTokenKind;
  value: string;
};

function readString(input: string, start: number): number {
  let index = start + 1;
  while (index < input.length) {
    const char = input[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '"') return index + 1;
    index += 1;
  }
  return input.length;
}

function isKey(input: string, afterString: number): boolean {
  let index = afterString;
  while (index < input.length && /\s/.test(input[index])) index += 1;
  return input[index] === ':';
}

function readNumber(input: string, start: number): number {
  const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(input.slice(start));
  return match ? start + match[0].length : start + 1;
}

export function tokenizeJsonForHighlight(input: string): JsonToken[] {
  const tokens: JsonToken[] = [];
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

    if (char === '"') {
      const end = readString(input, index);
      tokens.push({ kind: isKey(input, end) ? 'key' : 'string', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (char === '-' || /\d/.test(char)) {
      const end = readNumber(input, index);
      tokens.push({ kind: 'number', value: input.slice(index, end) });
      index = end;
      continue;
    }

    if (input.startsWith('true', index) || input.startsWith('false', index)) {
      const value = input.startsWith('true', index) ? 'true' : 'false';
      tokens.push({ kind: 'boolean', value });
      index += value.length;
      continue;
    }

    if (input.startsWith('null', index)) {
      tokens.push({ kind: 'null', value: 'null' });
      index += 4;
      continue;
    }

    tokens.push({ kind: 'punctuation', value: char });
    index += 1;
  }

  return tokens;
}
