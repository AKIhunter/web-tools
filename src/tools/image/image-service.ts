export type ResizeOptions = {
  maxWidth: number;
  maxHeight: number;
  allowUpscale?: boolean;
};

export type CompressOptions = ResizeOptions & {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number;
  background: string;
  exactSize?: boolean;
};

export type CompressionPreset = '75' | '50' | '30' | '25' | '15' | '10' | 'extreme';
export type ProcessingQuality = 'high' | 'balanced' | 'performance';

export function presetLabel(preset: CompressionPreset): string {
  if (preset === 'extreme') return '极限压缩';
  return `${preset}%`;
}

export function qualityFromProcessing(processing: ProcessingQuality): number {
  if (processing === 'high') return 0.92;
  if (processing === 'balanced') return 0.6;
  return 0.3;
}

export function optionsFromPreset(
  width: number,
  height: number,
  preset: CompressionPreset,
  mime: CompressOptions['mime'],
  background: string,
  processing: ProcessingQuality = 'balanced',
): CompressOptions {
  if (width <= 0 || height <= 0) throw new Error('尺寸必须大于 0');
  if (preset === 'extreme') {
    const longest = Math.max(width, height);
    const ratio = Math.min(1, 640 / longest, 0.25);
    return {
      maxWidth: Math.max(1, Math.round(width * ratio)),
      maxHeight: Math.max(1, Math.round(height * ratio)),
      mime,
      quality: 0.2,
      background,
    };
  }
  const ratio = Number(preset) / 100;
  return {
    maxWidth: Math.max(1, Math.round(width * ratio)),
    maxHeight: Math.max(1, Math.round(height * ratio)),
    mime,
    quality: qualityFromProcessing(processing),
    background,
  };
}

export function optionsFromPixels(
  width: number,
  height: number,
  mime: CompressOptions['mime'],
  background: string,
  processing: ProcessingQuality = 'balanced',
): CompressOptions {
  if (width <= 0 || height <= 0) throw new Error('尺寸必须大于 0');
  return {
    maxWidth: Math.max(1, Math.round(width)),
    maxHeight: Math.max(1, Math.round(height)),
    mime,
    quality: qualityFromProcessing(processing),
    background,
    exactSize: true,
  };
}

export function calculateSize(width: number, height: number, options: ResizeOptions): { width: number; height: number } {
  if (width <= 0 || height <= 0 || options.maxWidth <= 0 || options.maxHeight <= 0) throw new Error('尺寸必须大于 0');
  if ('exactSize' in options && options.exactSize) return { width: Math.round(options.maxWidth), height: Math.round(options.maxHeight) };
  const ratio = Math.min(options.maxWidth / width, options.maxHeight / height);
  const scale = options.allowUpscale ? ratio : Math.min(1, ratio);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function outputName(inputName: string, mime: CompressOptions['mime']): string {
  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  return `${inputName.replace(/\.[^.]+$/, '')}-optimized.${extension}`;
}

export async function compressImage(file: File, options: CompressOptions): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.size > 25 * 1024 * 1024) throw new Error('图片不能超过 25 MB');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('仅支持 JPEG、PNG 和 WebP');
  if (typeof createImageBitmap !== 'function') throw new Error('当前浏览器不支持图片解码');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('图片总像素超过 4000 万限制');
    const size = calculateSize(bitmap.width, bitmap.height, options);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器不支持 Canvas');
    if (options.mime === 'image/jpeg') {
      context.fillStyle = options.background;
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, options.mime, options.quality));
    if (!blob || blob.type !== options.mime) throw new Error(`当前浏览器无法导出 ${options.mime}`);
    return { blob, ...size };
  } finally {
    bitmap.close();
  }
}

export class LatestTask {
  private sequence = 0;

  begin(): number {
    this.sequence += 1;
    return this.sequence;
  }

  isLatest(id: number): boolean {
    return id === this.sequence;
  }

  cancel(): void {
    this.sequence += 1;
  }
}
