export type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type ColorReport = {
  hex: string;
  hex8?: string;
  rgb: string;
  hsl: string;
  rgba: RgbaColor;
};

function clampByte(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 255) throw new Error('RGB 通道必须在 0 到 255 之间');
  return Math.round(value);
}

function parseAlpha(value: string | undefined): number {
  if (value === undefined || value === '') return 1;
  const alpha = Number(value);
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new Error('Alpha 必须在 0 到 1 之间');
  return alpha;
}

function parseHex(input: string): RgbaColor | undefined {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(input);
  if (!match) return undefined;
  // CSS 简写色值按通道展开，例如 #0af 等价于 #00aaff。
  const raw = match[1];
  const expanded = raw.length <= 4 ? Array.from(raw, (char) => char + char).join('') : raw;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a: Number(a.toFixed(3)) };
}

function parseRgb(input: string): RgbaColor | undefined {
  const match = /^rgba?\(([^)]+)\)$/i.exec(input);
  if (!match) return undefined;
  const parts = match[1].split(/[\s,\/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) throw new Error('RGB 格式应为 rgb(r, g, b) 或 rgba(r, g, b, a)');
  return {
    r: clampByte(Number(parts[0])),
    g: clampByte(Number(parts[1])),
    b: clampByte(Number(parts[2])),
    a: parseAlpha(parts[3]),
  };
}

function parseHsl(input: string): RgbaColor | undefined {
  const match = /^hsla?\(([^)]+)\)$/i.exec(input);
  if (!match) return undefined;
  const parts = match[1].split(/[\s,\/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) throw new Error('HSL 格式应为 hsl(h, s%, l%) 或 hsla(h, s%, l%, a)');
  const h = Number(parts[0]);
  const s = Number(parts[1].replace('%', ''));
  const l = Number(parts[2].replace('%', ''));
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l) || s < 0 || s > 100 || l < 0 || l > 100) {
    throw new Error('HSL 数值无效');
  }
  const hue = ((h % 360) + 360) % 360;
  const saturation = s / 100;
  const lightness = l / 100;
  // 按 CSS HSL 到 RGB 的标准 chroma/second/matchValue 流程换算。
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const matchValue = lightness - chroma / 2;
  const [r1, g1, b1] = hue < 60 ? [chroma, second, 0]
    : hue < 120 ? [second, chroma, 0]
      : hue < 180 ? [0, chroma, second]
        : hue < 240 ? [0, second, chroma]
          : hue < 300 ? [second, 0, chroma]
            : [chroma, 0, second];
  return {
    r: clampByte((r1 + matchValue) * 255),
    g: clampByte((g1 + matchValue) * 255),
    b: clampByte((b1 + matchValue) * 255),
    a: parseAlpha(parts[3]),
  };
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function rgbToHsl({ r, g, b }: RgbaColor): [number, number, number] {
  // 输出面向开发者复制使用，H/S/L 统一四舍五入到整数。
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, Math.round(lightness * 100)];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = max === red
    ? 60 * (((green - blue) / delta) % 6)
    : max === green
      ? 60 * ((blue - red) / delta + 2)
      : 60 * ((red - green) / delta + 4);
  return [Math.round((hue + 360) % 360), Math.round(saturation * 100), Math.round(lightness * 100)];
}

export function parseColor(input: string): RgbaColor {
  const value = input.trim();
  if (!value) throw new Error('请输入颜色值');
  const color = parseHex(value) ?? parseRgb(value) ?? parseHsl(value);
  if (!color) throw new Error('支持 HEX、RGB/RGBA、HSL/HSLA 颜色格式');
  return color;
}

export function formatColorReport(input: string): string {
  const color = parseColor(input);
  const hex = `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`;
  const alphaByte = toHexByte(Math.round(color.a * 255));
  const [h, s, l] = rgbToHsl(color);
  const report: ColorReport = {
    hex,
    hex8: color.a < 1 ? `${hex}${alphaByte}` : undefined,
    rgb: color.a < 1 ? `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})` : `rgb(${color.r}, ${color.g}, ${color.b})`,
    hsl: color.a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${color.a})` : `hsl(${h}, ${s}%, ${l}%)`,
    rgba: color,
  };
  return JSON.stringify(report, null, 2);
}
