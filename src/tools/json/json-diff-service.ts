export type JsonLineDiff = {
  lineNumber: number;
  left: string;
  right: string;
  lineDifferent: boolean;
  leftRange?: [number, number];
  rightRange?: [number, number];
};

function parseJson(input: string, label: string): unknown {
  if (!input.trim()) throw new Error(`请输入${label} JSON 内容`);
  if (input.length > 2_000_000) throw new Error(`${label} JSON 文本超过 2 MB 限制`);
  try {
    return JSON.parse(input);
  } catch {
    throw new Error(`${label} JSON 格式无效，请检查引号、逗号或括号`);
  }
}

function diffRange(left: string, right: string): [[number, number] | undefined, [number, number] | undefined] {
  if (left === right) return [undefined, undefined];
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start += 1;

  let leftEnd = left.length;
  let rightEnd = right.length;
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
    leftEnd -= 1;
    rightEnd -= 1;
  }

  return [
    leftEnd > start ? [start, leftEnd] : undefined,
    rightEnd > start ? [start, rightEnd] : undefined,
  ];
}

export function formatJsonForCompare(input: string, label: string): string {
  return JSON.stringify(parseJson(input, label), null, 2);
}

export function compareFormattedJson(leftInput: string, rightInput: string): JsonLineDiff[] {
  const leftLines = formatJsonForCompare(leftInput, '左侧').split('\n');
  const rightLines = formatJsonForCompare(rightInput, '右侧').split('\n');
  const total = Math.max(leftLines.length, rightLines.length);

  return Array.from({ length: total }, (_, index) => {
    const left = leftLines[index] ?? '';
    const right = rightLines[index] ?? '';
    const lineDifferent = left !== right;
    const [leftRange, rightRange] = lineDifferent ? diffRange(left, right) : [undefined, undefined];
    return {
      lineNumber: index + 1,
      left,
      right,
      lineDifferent,
      leftRange,
      rightRange,
    };
  });
}
