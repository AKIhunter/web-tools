import { describe, expect, it } from 'vitest';
import { defaultOcrOptions, formatOcrResult, isSupportedOcrFile, mergeOcrOptions, normalizeOcrText, scaleToMaxPixels, validateOcrFile } from '../src/tools/ocr/ocr-service';

describe('OCR service', () => {
  it('识别支持的 PDF 和常见图片类型', () => {
    expect(isSupportedOcrFile(new File(['x'], 'demo.pdf', { type: 'application/pdf' }))).toBe(true);
    expect(isSupportedOcrFile(new File(['x'], 'demo.png', { type: 'image/png' }))).toBe(true);
    expect(isSupportedOcrFile(new File(['x'], 'demo.tiff', { type: '' }))).toBe(true);
    expect(isSupportedOcrFile(new File(['x'], 'demo.txt', { type: 'text/plain' }))).toBe(false);
  });

  it('校验文件大小和类型', () => {
    expect(() => validateOcrFile(new File(['x'], 'demo.txt', { type: 'text/plain' }), defaultOcrOptions)).toThrow('仅支持');
    const largeFile = new File([new Uint8Array(2 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    expect(() => validateOcrFile(largeFile, { ...defaultOcrOptions, maxFileSizeMb: 1 })).toThrow('文件不能超过 1 MB');
  });

  it('合并默认配置', () => {
    expect(mergeOcrOptions({ maxPdfPages: 3 })).toEqual({ ...defaultOcrOptions, maxPdfPages: 3 });
  });

  it('格式化 OCR 文本', () => {
    expect(normalizeOcrText('第一行   \n\u0000第二行\n\n\n\n第三行  ')).toBe('第一行\n第二行\n\n第三行');
  });

  it('按最大像素缩放尺寸', () => {
    expect(scaleToMaxPixels(1000, 1000, 2_000_000)).toEqual({ width: 1000, height: 1000, scale: 1 });
    const scaled = scaleToMaxPixels(4000, 4000, 4_000_000);
    expect(scaled.width).toBe(2000);
    expect(scaled.height).toBe(2000);
    expect(scaled.scale).toBeCloseTo(0.5);
    expect(() => scaleToMaxPixels(0, 100, 1000)).toThrow('图像尺寸无效');
  });

  it('输出 Markdown 风格的多页识别结果', () => {
    const text = formatOcrResult({
      fileName: 'demo.pdf',
      fileType: 'application/pdf',
      pageCount: 12,
      truncated: true,
      pages: [
        { page: 1, text: '第一页', confidence: 92.345 },
        { page: 2, text: '', confidence: 80 },
      ],
    });
    expect(text).toContain('# demo.pdf');
    expect(text).toContain('页数：12（已按页数限制截断）');
    expect(text).toContain('## 第 1 页');
    expect(text).toContain('识别置信度：92.3%');
    expect(text).toContain('（未识别到文本）');
  });
});
