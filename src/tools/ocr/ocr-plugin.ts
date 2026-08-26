import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { createFileDrop } from '../../components/file-drop';
import { setNotice } from '../../components/notice';
import { copyText } from '../../platform/clipboard';
import { ObjectUrlStore } from '../../platform/object-url-store';
import { defaultOcrOptions, formatOcrResult, recognizeFile } from './ocr-service';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,image/tiff,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ocrPage(): PageResult {
  const store = new ObjectUrlStore();
  let file: File | undefined;
  let taskId = 0;
  let abortController: AbortController | undefined;

  const root = document.createElement('div');
  root.className = 'ocr-tool';
  root.innerHTML = `
    <div class="ocr-layout">
      <section class="file-panel ocr-input-panel">
        <div class="parameters">
          <label>识别语言<select disabled><option>中文简体 + English</option></select></label>
          <label>文件限制<input readonly value="${defaultOcrOptions.maxFileSizeMb} MB / PDF 前 ${defaultOcrOptions.maxPdfPages} 页"></label>
        </div>
        <div class="ocr-drop"></div>
        <dl class="ocr-meta" aria-live="polite"></dl>
        <div class="actions">
          <button class="primary recognize" type="button">开始识别</button>
          <button class="copy" type="button">复制结果</button>
          <a class="button download" hidden>下载 TXT</a>
          <button class="clear" type="button">清空</button>
        </div>
        <p class="ocr-progress">等待选择文件</p>
        <p class="notice alert info" role="status" aria-live="polite">PDF 和图片只在本机浏览器中处理，OCR 资源从本站静态文件加载。</p>
      </section>
      <label class="editor ocr-output-panel"><span>格式化文本</span><textarea class="ocr-output" readonly spellcheck="false" placeholder="识别结果会显示在这里"></textarea><small class="ocr-stat">等待识别</small></label>
    </div>`;

  const drop = createFileDrop(ACCEPT, (selected) => {
    abortController?.abort();
    taskId += 1;
    file = selected;
    store.clear();
    output.value = '';
    download.hidden = true;
    download.removeAttribute('href');
    progress.textContent = '文件已选择，等待识别';
    meta.innerHTML = `<dt>文件名</dt><dd>${selected.name}</dd><dt>类型</dt><dd>${selected.type || '未知'}</dd><dt>大小</dt><dd>${formatBytes(selected.size)}</dd>`;
    stat.textContent = '等待识别';
    setNotice(notice, '文件已就绪。点击开始识别后会在本地浏览器中运行 OCR。', 'info');
  });
  root.querySelector('.ocr-drop')!.append(drop);

  const output = root.querySelector<HTMLTextAreaElement>('.ocr-output')!;
  const progress = root.querySelector<HTMLElement>('.ocr-progress')!;
  const stat = root.querySelector<HTMLElement>('.ocr-stat')!;
  const meta = root.querySelector<HTMLElement>('.ocr-meta')!;
  const notice = root.querySelector<HTMLElement>('.notice')!;
  const recognize = root.querySelector<HTMLButtonElement>('.recognize')!;
  const copy = root.querySelector<HTMLButtonElement>('.copy')!;
  const clear = root.querySelector<HTMLButtonElement>('.clear')!;
  const download = root.querySelector<HTMLAnchorElement>('.download')!;

  recognize.addEventListener('click', async () => {
    if (!file) {
      setNotice(notice, '请先选择 PDF 或图片文件', 'warning');
      return;
    }
    abortController?.abort();
    abortController = new AbortController();
    const currentTask = ++taskId;
    const started = performance.now();
    recognize.disabled = true;
    output.value = '';
    download.hidden = true;
    setNotice(notice, '正在识别，请保持页面打开。', 'info');
    try {
      const result = await recognizeFile(file, defaultOcrOptions, (message, ratio) => {
        if (currentTask !== taskId) return;
        progress.textContent = typeof ratio === 'number' ? `${message} · ${(ratio * 100).toFixed(0)}%` : message;
      }, abortController.signal);
      if (currentTask !== taskId) return;
      output.value = formatOcrResult(result);
      stat.textContent = `${output.value.length} 字符 · ${(performance.now() - started).toFixed(1)} ms`;
      const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
      download.href = store.create(blob);
      download.download = `${file.name.replace(/\.[^.]+$/, '') || 'ocr-result'}.txt`;
      download.hidden = false;
      progress.textContent = result.truncated ? `处理完成，PDF 已按前 ${defaultOcrOptions.maxPdfPages} 页截断` : '处理完成';
      setNotice(notice, '识别完成。文件和识别文本没有上传。', 'success');
    } catch (error) {
      if (currentTask !== taskId) return;
      setNotice(notice, error instanceof Error ? error.message : 'OCR 识别失败', 'error');
      progress.textContent = '识别失败';
      stat.textContent = '等待识别';
    } finally {
      if (currentTask === taskId) recognize.disabled = false;
    }
  });

  copy.addEventListener('click', async () => {
    const copied = await copyText(output.value, output);
    setNotice(notice, copied ? '已复制到剪贴板' : '已选中结果，请手动复制', copied ? 'success' : 'info');
  });

  clear.addEventListener('click', () => {
    abortController?.abort();
    taskId += 1;
    file = undefined;
    store.clear();
    output.value = '';
    meta.textContent = '';
    progress.textContent = '等待选择文件';
    stat.textContent = '等待识别';
    download.hidden = true;
    download.removeAttribute('href');
    recognize.disabled = false;
    setNotice(notice, '已清空。', 'info');
  });

  return {
    element: root,
    cleanup: () => {
      abortController?.abort();
      store.clear();
    },
  };
}

export const ocrPlugin: ToolPlugin = {
  definition: {
    route: '#/ocr',
    category: '图片与颜色',
    title: 'PDF / 图片 OCR',
    description: '识别 PDF 与图片中的文字并输出格式化文本',
    keywords: ['ocr', 'pdf', 'image', '文字识别', '图片识别'],
    aliases: ['text recognition', 'extract text', 'pdf ocr'],
    icon: 'OCR',
    tags: ['OCR', 'PDF', '图片'],
    privacyLevel: 'local-file',
    featured: true,
  },
  render: ocrPage,
};
