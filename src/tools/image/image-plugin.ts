import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { ObjectUrlStore } from '../../platform/object-url-store';
import { calculateSize, compressImage, CompressionPreset, LatestTask, optionsFromPixels, optionsFromPreset, outputName, presetLabel, ProcessingQuality } from './image-service';

type ProcessTask = 'resize' | 'file-size';

function imagePage(): PageResult {
  const store = new ObjectUrlStore();
  const tasks = new LatestTask();
  let resultUrl: string | undefined;
  const root = document.createElement('div');
  root.className = 'image-tool';
  root.innerHTML = `
    <div class="parameters">
      <label>图片<input class="image-input" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label>输出格式<select class="format"><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label>
      <label>处理方式<select class="processing"><option value="high">高质量</option><option value="balanced">均衡</option><option value="performance">高性能</option></select></label>
      <label>处理任务<select class="process-task"><option value="resize">调整尺寸</option><option value="file-size">调整文件大小</option></select></label>
      <label class="dimension-percent-control">尺寸比例<select class="dimension-percent"><option value="75">75%</option><option value="50">50%</option><option value="30">30%</option><option value="15">15%</option></select></label>
      <label class="pixel-control">宽 px<input class="width" type="number" min="1" value="800"></label>
      <label class="pixel-control">高 px<input class="height" type="number" min="1" value="600"></label>
      <label class="size-percent-control" hidden>文件比例<select class="size-percent"><option value="75">75%</option><option value="50">50%</option><option value="30">30%</option><option value="15">15%</option><option value="extreme">极限压缩</option></select></label>
      <span class="preview-size" aria-live="polite">预计输出：等待图片</span>
      <button class="primary compress" type="button">处理图片</button>
      <button class="clear-result" type="button">清除结果</button>
    </div>
    <div class="image-compare"><figure><figcaption>原图</figcaption><img class="before" alt="原图预览"><small class="before-stat"></small></figure><figure><figcaption>结果</figcaption><img class="after" alt="压缩结果预览"><small class="after-stat"></small></figure></div>
    <a class="button download" hidden>下载结果</a><p class="notice alert info" role="status" aria-live="polite">自动识别 PNG/JPEG/WebP 类型；输出格式可自定义。调整尺寸支持像素和 75%、50%、30%、15%；调整文件大小支持 75%、50%、30%、15% 和极限压缩。极限压缩不受处理方式约束。</p>`;
  const fileInput = root.querySelector<HTMLInputElement>('.image-input')!;
  const taskSelect = root.querySelector<HTMLSelectElement>('.process-task')!;
  const processingSelect = root.querySelector<HTMLSelectElement>('.processing')!;
  const dimensionPercentSelect = root.querySelector<HTMLSelectElement>('.dimension-percent')!;
  const sizePercentSelect = root.querySelector<HTMLSelectElement>('.size-percent')!;
  const formatSelect = root.querySelector<HTMLSelectElement>('.format')!;
  const widthInput = root.querySelector<HTMLInputElement>('.width')!;
  const heightInput = root.querySelector<HTMLInputElement>('.height')!;
  const previewSize = root.querySelector<HTMLElement>('.preview-size')!;
  const afterImage = root.querySelector<HTMLImageElement>('.after')!;
  const afterStat = root.querySelector<HTMLElement>('.after-stat')!;
  const download = root.querySelector<HTMLAnchorElement>('.download')!;
  let file: File | undefined;
  let sourceSize: { width: number; height: number } | undefined;

  function clearResult(): void {
    if (resultUrl) store.revoke(resultUrl);
    resultUrl = undefined;
    afterImage.removeAttribute('src');
    afterStat.textContent = '';
    download.hidden = true;
    download.removeAttribute('href');
  }

  function currentOptions() {
    if (!sourceSize) return undefined;
    const mime = formatSelect.value as 'image/jpeg' | 'image/png' | 'image/webp';
    const background = getComputedStyle(document.documentElement).getPropertyValue('--image-background').trim();
    const processing = processingSelect.value as ProcessingQuality;
    const task = taskSelect.value as ProcessTask;
    if (task === 'resize') return optionsFromPixels(Number(widthInput.value), Number(heightInput.value), mime, background, processing);
    return optionsFromPreset(sourceSize.width, sourceSize.height, sizePercentSelect.value as CompressionPreset, mime, background, processing);
  }

  function updatePreviewSize(): void {
    const resizeMode = (taskSelect.value as ProcessTask) === 'resize';
    root.querySelectorAll<HTMLElement>('.dimension-percent-control, .pixel-control').forEach((element) => { element.hidden = !resizeMode; });
    root.querySelectorAll<HTMLElement>('.size-percent-control').forEach((element) => { element.hidden = resizeMode; });
    processingSelect.disabled = !resizeMode && sizePercentSelect.value === 'extreme';
    if (!sourceSize) { previewSize.textContent = '预计输出：等待图片'; return; }
    try {
      const options = currentOptions();
      if (!options) return;
      const size = calculateSize(sourceSize.width, sourceSize.height, options);
      previewSize.textContent = `预计输出：${size.width}×${size.height} · ${options.mime}`;
    } catch (error) {
      previewSize.textContent = error instanceof Error ? error.message : '尺寸无效';
    }
  }

  fileInput.addEventListener('change', async () => {
    tasks.cancel();
    store.clear();
    resultUrl = undefined;
    sourceSize = undefined;
    file = fileInput.files?.[0];
    if (!file) return;
    root.querySelector<HTMLImageElement>('.before')!.src = store.create(file);
    const beforeStat = root.querySelector<HTMLElement>('.before-stat')!;
    beforeStat.textContent = `${file.type} · ${(file.size / 1024).toFixed(1)} KB`;
    if (typeof createImageBitmap !== 'function') return;
    try {
      const bitmap = await createImageBitmap(file);
      sourceSize = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      const detectedType = file.type || '未知类型';
      beforeStat.textContent = `识别类型：${detectedType} · ${sourceSize.width}×${sourceSize.height} · ${(file.size / 1024).toFixed(1)} KB`;
      widthInput.value = String(sourceSize.width);
      heightInput.value = String(sourceSize.height);
      updatePreviewSize();
    } catch {
      root.querySelector<HTMLElement>('.notice')!.textContent = '当前浏览器无法读取图片尺寸';
    }
  });
  [taskSelect, processingSelect, dimensionPercentSelect, sizePercentSelect, formatSelect, widthInput, heightInput].forEach((control) => control.addEventListener('input', updatePreviewSize));
  [taskSelect, processingSelect, dimensionPercentSelect, sizePercentSelect, formatSelect].forEach((control) => control.addEventListener('change', updatePreviewSize));
  dimensionPercentSelect.addEventListener('change', () => {
    if (!sourceSize) return;
    const ratio = Number(dimensionPercentSelect.value) / 100;
    widthInput.value = String(Math.max(1, Math.round(sourceSize.width * ratio)));
    heightInput.value = String(Math.max(1, Math.round(sourceSize.height * ratio)));
    updatePreviewSize();
  });

  root.querySelector('.compress')!.addEventListener('click', async () => {
    const id = tasks.begin();
    const notice = root.querySelector<HTMLElement>('.notice')!;
    if (!file) { notice.textContent = '请先选择图片'; return; }
    if (!sourceSize) { notice.textContent = '原图尺寸仍在读取，请稍后再压缩'; return; }
    try {
      const options = currentOptions();
      if (!options) return;
      const result = await compressImage(file, options);
      if (!tasks.isLatest(id)) return;
      clearResult();
      resultUrl = store.create(result.blob);
      afterImage.src = resultUrl;
      const change = ((result.blob.size / file.size - 1) * 100).toFixed(1);
      const preset = sizePercentSelect.value as CompressionPreset;
      const label = (taskSelect.value as ProcessTask) === 'resize' ? '调整尺寸' : presetLabel(preset);
      afterStat.textContent = `${label} · ${result.blob.type} · ${result.width}×${result.height} · ${(result.blob.size / 1024).toFixed(1)} KB · ${Number(change) > 0 ? '体积增加' : '体积减少'} ${Math.abs(Number(change))}%`;
      download.href = resultUrl;
      download.download = outputName(file.name, result.blob.type as 'image/jpeg' | 'image/png' | 'image/webp');
      download.hidden = false;
      download.textContent = '下载结果';
      notice.textContent = '处理完成。图片始终保留在本机浏览器中。';
    } catch (error) {
      notice.textContent = error instanceof Error ? error.message : '图片处理失败';
    }
  });
  root.querySelector('.clear-result')!.addEventListener('click', () => {
    clearResult();
    root.querySelector<HTMLElement>('.notice')!.textContent = '结果已清除。';
  });
  updatePreviewSize();
  return { element: root, cleanup: () => { tasks.cancel(); store.clear(); } };
}

export const imageCompressPlugin: ToolPlugin = {
  definition: {
    route: '#/image/compress',
    category: '图片与颜色',
    title: '图片加工',
    description: '调整尺寸、调整文件大小并导出 JPEG、PNG 或 WebP',
    keywords: ['图片', '加工', '压缩', 'webp', 'jpeg', 'png', '极限压缩'],
    aliases: ['image processor', 'image compressor', 'resize image', 'compress png', 'compress jpeg', 'compress webp'],
    icon: 'IMG',
    tags: ['图片', '压缩'],
    privacyLevel: 'local-file',
  },
  render: imagePage,
};
