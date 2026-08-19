import { describe, expect, it } from 'vitest';
import { calculateSize, LatestTask, outputName } from '../src/tools/image/image-service';

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
