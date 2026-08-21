export type CaseMode = 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'title' | 'dot';

function splitWords(input: string): string[] {
  // 先把 camel/Pascal 边界拆开，再统一按字母数字片段分词，兼容空格、下划线和连字符输入。
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .match(/[\p{L}\p{N}]+/gu)
    ?.map((word) => word.toLocaleLowerCase())
    ?? [];
}

function capitalize(word: string): string {
  return word ? word[0].toLocaleUpperCase() + word.slice(1) : '';
}

export function convertCase(input: string, mode: CaseMode): string {
  const words = splitWords(input);
  if (!words.length) return '';
  if (mode === 'camel') return words[0] + words.slice(1).map(capitalize).join('');
  if (mode === 'pascal') return words.map(capitalize).join('');
  if (mode === 'snake') return words.join('_');
  if (mode === 'kebab') return words.join('-');
  if (mode === 'constant') return words.join('_').toLocaleUpperCase();
  if (mode === 'title') return words.map(capitalize).join(' ');
  if (mode === 'dot') return words.join('.');
  throw new Error('不支持的命名格式');
}

export function convertCaseAll(input: string): Record<CaseMode, string> {
  return {
    camel: convertCase(input, 'camel'),
    pascal: convertCase(input, 'pascal'),
    snake: convertCase(input, 'snake'),
    kebab: convertCase(input, 'kebab'),
    constant: convertCase(input, 'constant'),
    title: convertCase(input, 'title'),
    dot: convertCase(input, 'dot'),
  };
}
