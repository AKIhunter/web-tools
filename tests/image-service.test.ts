import { describe, expect, it } from 'vitest';
import { calculateSize, LatestTask, optionsFromPixels, optionsFromPreset, outputName, presetLabel, qualityFromProcessing } from '../src/tools/image/image-service';

describe('Image service', () => {
  it('保持比例并默认禁止放大', () => {
    expect(calculateSize(4000, 2000, { maxWidth: 1000, maxHeight: 1000 })).toEqual({ width: 1000, height: 500 });
    expect(calculateSize(400, 200, { maxWidth: 1000, maxHeight: 1000 })).toEqual({ width: 400, height: 200 });
    expect(calculateSize(400, 200, { maxWidth: 1000, maxHeight: 1000, allowUpscale: true })).toEqual({ width: 1000, height: 500 });
  });

  it('生成对应格式文件名', () => {
    expect(outputName('photo.png', 'image/jpeg')).toBe('photo-optimized.jpg');
    expect(outputName('photo', 'image/webp')).toBe('photo-optimized.webp');
  });

  it('根据压缩档位生成尺寸和质量', () => {
    expect(optionsFromPreset(4000, 2000, '75', 'image/jpeg', '#fff')).toMatchObject({
      maxWidth: 3000,
      maxHeight: 1500,
      mime: 'image/jpeg',
      quality: 0.6,
    });
    expect(optionsFromPreset(4000, 2000, '50', 'image/png', '#fff')).toMatchObject({
      maxWidth: 2000,
      maxHeight: 1000,
      mime: 'image/png',
      quality: 0.6,
    });
    expect(optionsFromPreset(4000, 2000, '25', 'image/webp', '#fff')).toMatchObject({
      maxWidth: 1000,
      maxHeight: 500,
      mime: 'image/webp',
      quality: 0.6,
    });
    expect(optionsFromPreset(4000, 2000, '10', 'image/webp', '#fff')).toMatchObject({
      maxWidth: 400,
      maxHeight: 200,
      mime: 'image/webp',
      quality: 0.6,
    });
    expect(optionsFromPreset(4000, 2000, '30', 'image/webp', '#fff', 'performance')).toMatchObject({
      maxWidth: 1200,
      maxHeight: 600,
      quality: 0.3,
    });
    expect(optionsFromPreset(4000, 2000, '15', 'image/webp', '#fff', 'high')).toMatchObject({
      maxWidth: 600,
      maxHeight: 300,
      quality: 0.92,
    });
  });

  it('极限压缩收缩长边且尊重输出格式', () => {
    expect(optionsFromPreset(4000, 2000, 'extreme', 'image/png', '#fff')).toMatchObject({
      maxWidth: 640,
      maxHeight: 320,
      mime: 'image/png',
      quality: 0.2,
    });
    expect(presetLabel('extreme')).toBe('极限压缩');
  });

  it('按像素模式使用精确尺寸', () => {
    const options = optionsFromPixels(321, 123, 'image/jpeg', '#fff');
    expect(options).toMatchObject({ maxWidth: 321, maxHeight: 123, mime: 'image/jpeg', exactSize: true });
    expect(calculateSize(4000, 2000, options)).toEqual({ width: 321, height: 123 });
  });

  it('处理方式映射为质量参数', () => {
    expect(qualityFromProcessing('high')).toBe(0.92);
    expect(qualityFromProcessing('balanced')).toBe(0.6);
    expect(qualityFromProcessing('performance')).toBe(0.3);
  });

  it('只接受最新异步任务', () => {
    const tasks = new LatestTask();
    const first = tasks.begin();
    const second = tasks.begin();
    expect(tasks.isLatest(first)).toBe(false);
    expect(tasks.isLatest(second)).toBe(true);
    tasks.cancel();
    expect(tasks.isLatest(second)).toBe(false);
  });
});
