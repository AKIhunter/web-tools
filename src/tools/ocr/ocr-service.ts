export type OcrLanguage = 'eng' | 'chi_sim' | 'chi_sim+eng';

export type OcrOptions = {
  language: OcrLanguage;
  maxPdfPages: number;
  maxFileSizeMb: number;
  maxCanvasPixels: number;
};

export type OcrPageResult = {
  page: number;
  text: string;
  confidence?: number;
};

export type OcrResult = {
  fileName: string;
  fileType: string;
  pageCount: number;
  pages: OcrPageResult[];
  truncated?: boolean;
};

export type OcrProgress = {
  message: string;
  progress?: number;
};

type ProgressHandler = (message: string, progress?: number) => void;

const PDF_WORKER_PATH = './ocr/pdf.worker.min.mjs';
const TESSERACT_WORKER_PATH = './ocr/tesseract/worker.min.js';
const TESSERACT_CORE_PATH = './ocr/tesseract-core';
const TESSERACT_LANG_PATH = './ocr/tessdata';
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']);
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff']);

export const defaultOcrOptions: OcrOptions = {
  language: 'chi_sim+eng',
  maxPdfPages: 10,
  maxFileSizeMb: 20,
  maxCanvasPixels: 12_000_000,
};

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLocaleLowerCase() ?? '';
}

function baseUrl(path: string): string {
  return new URL(path, document.baseURI).toString();
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || extensionOf(file.name) === 'pdf';
}

export function isSupportedImageFile(file: File): boolean {
  const extension = extensionOf(file.name);
  return SUPPORTED_IMAGE_TYPES.has(file.type) || SUPPORTED_IMAGE_EXTENSIONS.has(extension);
}

export function isSupportedOcrFile(file: File): boolean {
  return isPdfFile(file) || isSupportedImageFile(file);
}

export function mergeOcrOptions(options: Partial<OcrOptions> = {}): OcrOptions {
  return { ...defaultOcrOptions, ...options };
}

export function validateOcrFile(file: File, options: OcrOptions): void {
  if (!isSupportedOcrFile(file)) throw new Error('仅支持 PDF、PNG、JPEG、WebP、GIF、BMP、TIFF 文件');
  const maxBytes = options.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`文件不能超过 ${options.maxFileSizeMb} MB`);
}

export function normalizeOcrText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatOcrResult(result: OcrResult): string {
  const header = [
    `# ${result.fileName}`,
    '',
    `文件类型：${result.fileType || '未知'}`,
    `页数：${result.pageCount}${result.truncated ? '（已按页数限制截断）' : ''}`,
  ];
  const pages = result.pages.map((page) => {
    const confidence = typeof page.confidence === 'number' ? `\n识别置信度：${page.confidence.toFixed(1)}%` : '';
    return `## 第 ${page.page} 页${confidence}\n\n${page.text || '（未识别到文本）'}`;
  });
  return [...header, '', ...pages].join('\n').trim();
}

export function scaleToMaxPixels(width: number, height: number, maxPixels: number): { width: number; height: number; scale: number } {
  if (width <= 0 || height <= 0) throw new Error('图像尺寸无效');
  const pixels = width * height;
  if (pixels <= maxPixels) return { width: Math.round(width), height: Math.round(height), scale: 1 };
  const scale = Math.sqrt(maxPixels / pixels);
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scale,
  };
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('当前浏览器无法创建 Canvas');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  return { canvas, context };
}

async function imageFileToCanvas(file: File, maxCanvasPixels: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('当前浏览器无法解码该图片格式');
  });
  try {
    const size = scaleToMaxPixels(bitmap.width, bitmap.height, maxCanvasPixels);
    const { canvas, context } = createCanvas(size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

async function pdfPageToCanvas(page: unknown, maxCanvasPixels: number): Promise<HTMLCanvasElement> {
  const pdfPage = page as {
    getViewport: (options: { scale: number }) => { width: number; height: number };
    render: (options: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement }) => { promise: Promise<void> };
  };
  const baseViewport = pdfPage.getViewport({ scale: 2 });
  const size = scaleToMaxPixels(baseViewport.width, baseViewport.height, maxCanvasPixels);
  const viewport = pdfPage.getViewport({ scale: 2 * size.scale });
  const { canvas, context } = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  await pdfPage.render({ canvasContext: context, viewport, canvas }).promise;
  return canvas;
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('识别已取消');
}

export async function recognizeFile(file: File, optionsInput: Partial<OcrOptions> = {}, onProgress?: ProgressHandler, signal?: AbortSignal): Promise<OcrResult> {
  const options = mergeOcrOptions(optionsInput);
  validateOcrFile(file, options);
  ensureNotAborted(signal);

  const tesseract = await import('tesseract.js');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = baseUrl(PDF_WORKER_PATH);

  let worker: Awaited<ReturnType<typeof tesseract.createWorker>> | undefined;
  const abortWorker = () => void worker?.terminate();
  signal?.addEventListener('abort', abortWorker, { once: true });

  try {
    onProgress?.('初始化 OCR 引擎', 0);
    worker = await tesseract.createWorker(options.language.split('+'), tesseract.OEM.LSTM_ONLY, {
      workerPath: baseUrl(TESSERACT_WORKER_PATH),
      corePath: baseUrl(TESSERACT_CORE_PATH),
      langPath: baseUrl(TESSERACT_LANG_PATH),
      cacheMethod: 'none',
      workerBlobURL: false,
      logger: (message) => {
        if (message.status) onProgress?.(message.status, message.progress);
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: tesseract.PSM.AUTO,
      preserve_interword_spaces: '1',
    });
    ensureNotAborted(signal);

    if (isPdfFile(file)) {
      return await recognizePdf(file, worker, options, onProgress, signal);
    }
    return await recognizeImage(file, worker, options, onProgress, signal);
  } finally {
    signal?.removeEventListener('abort', abortWorker);
    await worker?.terminate();
  }
}

async function recognizeImage(
  file: File,
  worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>>,
  options: OcrOptions,
  onProgress?: ProgressHandler,
  signal?: AbortSignal,
): Promise<OcrResult> {
  onProgress?.('读取图片', 0.1);
  const canvas = await imageFileToCanvas(file, options.maxCanvasPixels);
  ensureNotAborted(signal);
  onProgress?.('识别图片文字', 0.35);
  const { data } = await worker.recognize(canvas);
  return {
    fileName: file.name,
    fileType: file.type || 'image/*',
    pageCount: 1,
    pages: [{ page: 1, text: normalizeOcrText(data.text), confidence: data.confidence }],
  };
}

async function recognizePdf(
  file: File,
  worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>>,
  options: OcrOptions,
  onProgress?: ProgressHandler,
  signal?: AbortSignal,
): Promise<OcrResult> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  onProgress?.('加载 PDF', 0.1);
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  try {
    const pdf = await loadingTask.promise.catch(() => {
      throw new Error('PDF 文件无法解析或已损坏');
    });
    const pageCount = pdf.numPages;
    const pageLimit = Math.min(pageCount, options.maxPdfPages);
    const pages: OcrPageResult[] = [];

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      ensureNotAborted(signal);
      onProgress?.(`渲染第 ${pageNumber} 页`, pageNumber / (pageLimit * 2));
      const page = await pdf.getPage(pageNumber);
      const canvas = await pdfPageToCanvas(page, options.maxCanvasPixels);
      ensureNotAborted(signal);
      onProgress?.(`识别第 ${pageNumber} 页`, (pageNumber + pageLimit) / (pageLimit * 2));
      const { data: pageData } = await worker.recognize(canvas);
      pages.push({ page: pageNumber, text: normalizeOcrText(pageData.text), confidence: pageData.confidence });
    }

    return {
      fileName: file.name,
      fileType: file.type || 'application/pdf',
      pageCount,
      pages,
      truncated: pageCount > pageLimit,
    };
  } finally {
    await loadingTask.destroy();
  }
}
