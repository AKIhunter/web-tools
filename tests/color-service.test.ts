import { describe, expect, it } from 'vitest';
import { formatColorReport, parseColor } from '../src/tools/color/color-service';

describe('Color service', () => {
  it('解析 HEX 简写和完整写法', () => {
    expect(parseColor('#0af')).toEqual({ r: 0, g: 170, b: 255, a: 1 });
    expect(parseColor('#0071e3')).toEqual({ r: 0, g: 113, b: 227, a: 1 });
    expect(parseColor('#0071e380')).toEqual({ r: 0, g: 113, b: 227, a: 0.502 });
  });

  it('解析 RGB/RGBA 和 HSL/HSLA', () => {
    expect(parseColor('rgb(0, 113, 227)')).toEqual({ r: 0, g: 113, b: 227, a: 1 });
    expect(parseColor('rgba(0, 113, 227, 0.5)')).toEqual({ r: 0, g: 113, b: 227, a: 0.5 });
    expect(parseColor('hsl(210, 100%, 45%)')).toEqual({ r: 0, g: 115, b: 230, a: 1 });
    expect(parseColor('hsla(210 100% 45% / 0.5)')).toEqual({ r: 0, g: 115, b: 230, a: 0.5 });
  });

  it('输出规范化颜色报告', () => {
    expect(formatColorReport('#0071e3')).toContain('"hex": "#0071e3"');
    expect(formatColorReport('rgba(0, 113, 227, 0.5)')).toContain('"hex8": "#0071e380"');
  });

  it('拒绝无效颜色', () => {
    expect(() => parseColor('rgb(300, 0, 0)')).toThrow('RGB 通道');
    expect(() => parseColor('not-a-color')).toThrow('支持 HEX');
  });
});
