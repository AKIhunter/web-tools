import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { ObjectUrlStore } from '../../platform/object-url-store';
import { compressImage, LatestTask, outputName } from './image-service';

function imagePage(): PageResult {
  const store = new ObjectUrlStore();
  const tasks = new LatestTask();
  const root = document.createElement('div');
  root.className = 'image-tool';
  root.innerHTML = `
    <div class="parameters">
      <label>图片<input class="image-input" type="file" accept="image/jpeg,image/png,image/webp"></label>
      <label>最大宽度<input class="width" type="number" min="1" value="1920"></label>
      <label>最大高度<input class="height" type="number" min="1" value="1080"></label>
      <label>格式<select class="format"><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label>
      <label>质量<input class="quality" type="range" min="0.1" max="1" step="0.05" value="0.8"></label>
      <button class="primary compress" type="button">压缩图片</button>
    </div>
    <div class="image-compare"><figure><figcaption>原图</figcaption><img class="before" alt="原图预览"><small class="before-stat"></small></figure><figure><figcaption>结果</figcaption><img class="after" alt="压缩结果预览"><small class="after-stat"></small></figure></div>
    <a class="button download" hidden>下载结果</a><p class="notice alert info" role="status" aria-live="polite">重新编码会移除 EXIF/GPS 等元数据；PNG 不保证变小。</p>`;
  const fileInput = root.querySelector<HTMLInputElement>('.image-input')!;
  let file: File | undefined;
  fileInput.addEventListener('change', () => {
    tasks.cancel();
    store.clear();
    file = fileInput.files?.[0];
    if (!file) return;
    root.querySelector<HTMLImageElement>('.before')!.src = store.create(file);
    root.querySelector<HTMLElement>('.before-stat')!.textContent = `${file.type} · ${(file.size / 1024).toFixed(1)} KB`;
  });
  root.querySelector('.compress')!.addEventListener('click', async () => {
    const id = tasks.begin();
    const notice = root.querySelector<HTMLElement>('.notice')!;
    if (!file) { notice.textContent = '请先选择图片'; return; }
    try {
      const result = await compressImage(file, {
        maxWidth: Number(root.querySelector<HTMLInputElement>('.width')!.value),
        maxHeight: Number(root.querySelector<HTMLInputElement>('.height')!.value),
        mime: root.querySelector<HTMLSelectElement>('.format')!.value as 'image/jpeg' | 'image/png' | 'image/webp',
        quality: Number(root.querySelector<HTMLInputElement>('.quality')!.value),
        background: getComputedStyle(document.documentElement).getPropertyValue('--image-background').trim(),
      });
      if (!tasks.isLatest(id)) return;
      const url = store.create(result.blob);
      root.querySelector<HTMLImageElement>('.after')!.src = url;
      const change = ((result.blob.size / file.size - 1) * 100).toFixed(1);
      root.querySelector<HTMLElement>('.after-stat')!.textContent = `${result.blob.type} · ${result.width}×${result.height} · ${(result.blob.size / 1024).toFixed(1)} KB · ${Number(change) > 0 ? '体积增加' : '体积减少'} ${Math.abs(Number(change))}%`;
      const download = root.querySelector<HTMLAnchorElement>('.download')!;
      download.href = url;
      download.download = outputName(file.name, result.blob.type as 'image/jpeg' | 'image/png' | 'image/webp');
      download.hidden = false;
      download.textContent = '下载结果';
      notice.textContent = '处理完成。图片始终保留在本机浏览器中。';
    } catch (error) {
      notice.textContent = error instanceof Error ? error.message : '图片处理失败';
    }
  });
  return { element: root, cleanup: () => { tasks.cancel(); store.clear(); } };
}

export const imageCompressPlugin: ToolPlugin = {
  definition: {
    route: '#/image/compress',
    category: '图片与颜色',
    title: '图片压缩',
    description: '缩放并导出 JPEG、PNG 或 WebP',
    keywords: ['图片', '压缩', 'webp', 'jpeg'],
    aliases: ['image compressor', 'resize image'],
    icon: 'IMG',
    tags: ['图片', '压缩'],
    privacyLevel: 'local-file',
  },
  render: imagePage,
};
