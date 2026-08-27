import { describe, expect, it } from 'vitest';
import { clearSelectionPixels, clampTolerance, colorWithinTolerance, countSelected, createEllipseSelection, createMagicSelection, createRectSelection, cutoutOutputName } from '../src/tools/cutout/cutout-service';

function image(width: number, height: number, pixels: number[]): ImageData {
  return { width, height, data: new Uint8ClampedArray(pixels), colorSpace: 'srgb' } as ImageData;
}

function rgba(r: number, g: number, b: number, a = 255): number[] {
  return [r, g, b, a];
}

describe('Cutout service', () => {
  it('限制容差到 0 到 255', () => {
    expect(clampTolerance(-10)).toBe(0);
    expect(clampTolerance(30.4)).toBe(30);
    expect(clampTolerance(300)).toBe(255);
    expect(clampTolerance(Number.NaN)).toBe(30);
  });

  it('按 RGB 每通道差值判断颜色容差', () => {
    const data = new Uint8ClampedArray(rgba(100, 120, 140));
    expect(colorWithinTolerance(data, 0, [110, 130, 150], 10)).toBe(true);
    expect(colorWithinTolerance(data, 0, [111, 130, 150], 10)).toBe(false);
  });

  it('魔棒严格选中同色且连通的像素', () => {
    const source = image(3, 3, [
      ...rgba(10, 10, 10), ...rgba(10, 10, 10), ...rgba(200, 0, 0),
      ...rgba(10, 10, 10), ...rgba(20, 20, 20), ...rgba(200, 0, 0),
      ...rgba(200, 0, 0), ...rgba(200, 0, 0), ...rgba(10, 10, 10),
    ]);
    const mask = createMagicSelection(source, { x: 0, y: 0 }, 0);
    expect([...mask]).toEqual([1, 1, 0, 1, 0, 0, 0, 0, 0]);
    expect(countSelected(mask)).toBe(3);
  });

  it('魔棒较大容差选中相近连通区域', () => {
    const source = image(2, 2, [
      ...rgba(100, 100, 100), ...rgba(120, 110, 100),
      ...rgba(130, 130, 130), ...rgba(200, 200, 200),
    ]);
    expect([...createMagicSelection(source, { x: 0, y: 0 }, 30)]).toEqual([1, 1, 1, 0]);
  });

  it('魔棒不会选中非连通同色区域', () => {
    const source = image(3, 1, [
      ...rgba(50, 50, 50), ...rgba(200, 200, 200), ...rgba(50, 50, 50),
    ]);
    expect([...createMagicSelection(source, { x: 0, y: 0 }, 0)]).toEqual([1, 0, 0]);
  });

  it('矩形选区会裁剪边界并支持反向拖拽', () => {
    const mask = createRectSelection(4, 3, { x: 3, y: 2, width: -3, height: -2 });
    expect([...mask]).toEqual([
      1, 1, 1, 0,
      1, 1, 1, 0,
      0, 0, 0, 0,
    ]);
  });

  it('椭圆选区按外接矩形生成', () => {
    const mask = createEllipseSelection(5, 5, { cx: 2.5, cy: 2.5, rx: 1.5, ry: 1.5 });
    expect(countSelected(mask)).toBeGreaterThan(4);
    expect(mask[2 * 5 + 2]).toBe(1);
    expect(mask[0]).toBe(0);
  });

  it('删除选区时只把 alpha 置 0', () => {
    const source = image(2, 1, [...rgba(10, 20, 30), ...rgba(40, 50, 60)]);
    const output = clearSelectionPixels(source, new Uint8Array([1, 0]));
    expect([...output.data]).toEqual([...rgba(10, 20, 30, 0), ...rgba(40, 50, 60)]);
    expect(source.data[3]).toBe(255);
  });

  it('生成透明 PNG 文件名', () => {
    expect(cutoutOutputName('photo.jpg')).toBe('photo-cutout.png');
    expect(cutoutOutputName('avatar')).toBe('avatar-cutout.png');
    expect(cutoutOutputName('')).toBe('image-cutout.png');
  });
});
