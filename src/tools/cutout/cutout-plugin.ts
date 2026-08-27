import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { createFileDrop } from '../../components/file-drop';
import { setNotice } from '../../components/notice';
import { ObjectUrlStore } from '../../platform/object-url-store';
import { clearSelectionPixels, clampTolerance, countSelected, createEllipseSelection, createMagicSelection, createRectSelection, cutoutOutputName } from './cutout-service';
import type { Point, SelectionMode } from './cutout-service';

const ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const MAX_UNDO = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.1;

function formatPixels(count: number): string {
  return `${count.toLocaleString('zh-Hans-CN')} 像素`;
}

function isFormTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function cloneImageData(image: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
}

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

async function decodeImageSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file).catch(() => undefined);
    if (bitmap) return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('当前浏览器无法解码图片'));
  });
  image.src = url;
  try {
    await loaded;
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function cutoutPage(): PageResult {
  const store = new ObjectUrlStore();
  const root = document.createElement('div');
  root.className = 'cutout-tool';
  root.innerHTML = `
    <section class="file-panel cutout-toolbar">
      <div class="parameters">
        <div class="cutout-field"><span>图片</span><div class="cutout-drop"></div></div>
        <label>容差<input class="tolerance-range" type="range" min="0" max="255" value="30"></label>
        <label>数值<input class="tolerance-number" type="number" min="0" max="255" value="30"></label>
      </div>
      <div class="segmented" role="group" aria-label="选区工具">
        <button class="mode" type="button" data-mode="magic" aria-pressed="true">魔棒</button>
        <button class="mode" type="button" data-mode="rect" aria-pressed="false">矩形</button>
        <button class="mode" type="button" data-mode="ellipse" aria-pressed="false">圆形</button>
      </div>
      <div class="actions">
        <button class="primary delete-selection" type="button">删除选区</button>
        <button class="undo" type="button" disabled>撤销</button>
        <button class="zoom-out" type="button">缩小</button>
        <button class="zoom-reset" type="button">100%</button>
        <button class="zoom-in" type="button">放大</button>
        <button class="export" type="button">导出 PNG</button>
        <a class="button download" hidden>下载 PNG</a>
        <button class="clear" type="button">清空</button>
      </div>
      <p class="cutout-shortcuts">快捷键：Delete 删除选区，Ctrl/Command + Z 撤销，Ctrl/Command + 滚轮缩放图片，鼠标中键拖动画布。</p>
      <p class="cutout-status">等待选择图片</p>
      <p class="notice alert info" role="status" aria-live="polite">图片只在本机 Canvas 中处理；删除区域会变为透明像素。</p>
    </section>
    <section class="cutout-canvas-shell">
      <div class="cutout-canvas-wrap">
        <div class="cutout-stage">
          <canvas class="cutout-canvas"></canvas>
          <canvas class="cutout-overlay"></canvas>
        </div>
      </div>
    </section>`;

  const stage = root.querySelector<HTMLElement>('.cutout-stage')!;
  const mainCanvas = root.querySelector<HTMLCanvasElement>('.cutout-canvas')!;
  const overlayCanvas = root.querySelector<HTMLCanvasElement>('.cutout-overlay')!;
  const mainContext = mainCanvas.getContext('2d');
  const selectionContext = overlayCanvas.getContext('2d');
  if (!mainContext || !selectionContext) throw new Error('当前浏览器不支持 Canvas');
  const context: CanvasRenderingContext2D = mainContext;
  const overlayContext: CanvasRenderingContext2D = selectionContext;

  const notice = root.querySelector<HTMLElement>('.notice')!;
  const status = root.querySelector<HTMLElement>('.cutout-status')!;
  const canvasWrap = root.querySelector<HTMLElement>('.cutout-canvas-wrap')!;
  canvasWrap.style.overflow = 'auto';
  canvasWrap.style.maxHeight = '72vh';
  const toleranceRange = root.querySelector<HTMLInputElement>('.tolerance-range')!;
  const toleranceNumber = root.querySelector<HTMLInputElement>('.tolerance-number')!;
  const undoButton = root.querySelector<HTMLButtonElement>('.undo')!;
  const zoomResetButton = root.querySelector<HTMLButtonElement>('.zoom-reset')!;
  const download = root.querySelector<HTMLAnchorElement>('.download')!;
  const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.mode'));
  let mode: SelectionMode = 'magic';
  let fileName = 'image';
  let currentImageData: ImageData | undefined;
  let selectionMask: Uint8Array | undefined;
  let lastMagicPoint: Point | undefined;
  let undoStack: ImageData[] = [];
  let dragStart: Point | undefined;
  let panStart: { x: number; y: number; scrollLeft: number; scrollTop: number } | undefined;
  let zoom = 1;

  function updateUndoState(): void {
    undoButton.disabled = undoStack.length === 0;
  }

  function currentTolerance(): number {
    return clampTolerance(Number(toleranceNumber.value));
  }

  function syncTolerance(value: number): void {
    const next = String(clampTolerance(value));
    toleranceRange.value = next;
    toleranceNumber.value = next;
    if (mode === 'magic' && currentImageData && lastMagicPoint) {
      selectionMask = createMagicSelection(currentImageData, lastMagicPoint, Number(next));
      renderOverlay();
    }
  }

  function setMode(nextMode: SelectionMode): void {
    mode = nextMode;
    modeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === nextMode)));
    lastMagicPoint = undefined;
    selectionMask = undefined;
    renderOverlay();
    status.textContent = nextMode === 'magic' ? '魔棒模式：点击图片色块生成选区' : nextMode === 'rect' ? '矩形模式：拖拽生成矩形选区' : '圆形模式：拖拽生成圆形选区';
  }

  function applyZoom(nextZoom: number): void {
    zoom = clampZoom(nextZoom);
    const displayWidth = currentImageData ? Math.max(1, Math.round(currentImageData.width * zoom)) : 0;
    const displayHeight = currentImageData ? Math.max(1, Math.round(currentImageData.height * zoom)) : 0;
    stage.style.width = displayWidth ? `${displayWidth}px` : '';
    stage.style.height = displayHeight ? `${displayHeight}px` : '';
    [mainCanvas, overlayCanvas].forEach((canvas) => {
      canvas.style.width = displayWidth ? `${displayWidth}px` : '';
      canvas.style.height = displayHeight ? `${displayHeight}px` : '';
    });
    zoomResetButton.textContent = `${Math.round(zoom * 100)}%`;
  }

  function resizeCanvases(width: number, height: number): void {
    [mainCanvas, overlayCanvas].forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
      canvas.style.aspectRatio = width > 0 && height > 0 ? `${width} / ${height}` : '';
    });
    applyZoom(zoom);
  }

  function renderImage(): void {
    if (!currentImageData) {
      context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      return;
    }
    context.putImageData(currentImageData, 0, 0);
  }

  function renderOverlay(): void {
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (!currentImageData || !selectionMask || countSelected(selectionMask) === 0) return;
    const overlay = overlayContext.createImageData(currentImageData.width, currentImageData.height);
    for (let index = 0; index < selectionMask.length; index += 1) {
      if (!selectionMask[index]) continue;
      const offset = index * 4;
      overlay.data[offset] = 0;
      overlay.data[offset + 1] = 113;
      overlay.data[offset + 2] = 227;
      overlay.data[offset + 3] = 95;
    }
    overlayContext.putImageData(overlay, 0, 0);
  }

  function updateSelection(mask: Uint8Array): void {
    selectionMask = mask;
    const selected = countSelected(mask);
    status.textContent = selected ? `已选择 ${formatPixels(selected)}` : '当前选区为空';
    renderOverlay();
  }

  function canvasPoint(event: PointerEvent): Point | undefined {
    if (!currentImageData) return undefined;
    const rect = overlayCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return undefined;
    const x = Math.floor((event.clientX - rect.left) * (overlayCanvas.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (overlayCanvas.height / rect.height));
    if (x < 0 || y < 0 || x >= overlayCanvas.width || y >= overlayCanvas.height) return undefined;
    return { x, y };
  }

  function rectFromPoints(start: Point, end: Point) {
    return { x: start.x, y: start.y, width: end.x - start.x + 1, height: end.y - start.y + 1 };
  }

  function ellipseFromPoints(start: Point, end: Point) {
    const rect = rectFromPoints(start, end);
    return { cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, rx: Math.abs(rect.width / 2), ry: Math.abs(rect.height / 2) };
  }

  function pushUndo(): void {
    if (!currentImageData) return;
    undoStack.push(cloneImageData(currentImageData));
    if (undoStack.length > MAX_UNDO) undoStack = undoStack.slice(-MAX_UNDO);
    updateUndoState();
  }

  function clearDownload(): void {
    store.clear();
    download.hidden = true;
    download.removeAttribute('href');
  }

  async function loadFile(file: File): Promise<void> {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) throw new Error('仅支持 PNG、JPG、JPEG、WebP 图片');
    const decoded = await decodeImageSource(file);
    try {
      fileName = file.name;
      resizeCanvases(decoded.width, decoded.height);
      context.clearRect(0, 0, decoded.width, decoded.height);
      context.drawImage(decoded.source, 0, 0);
      currentImageData = context.getImageData(0, 0, decoded.width, decoded.height);
      selectionMask = undefined;
      lastMagicPoint = undefined;
      undoStack = [];
      zoom = 1;
      clearDownload();
      renderImage();
      renderOverlay();
      applyZoom(zoom);
      updateUndoState();
      status.textContent = `${file.name} · ${decoded.width}×${decoded.height}`;
      setNotice(notice, '图片已载入。选择区域后可删除为透明像素。', 'success');
    } finally {
      decoded.close();
    }
  }

  const drop = createFileDrop(ACCEPT, (file) => {
    void loadFile(file).catch((error) => setNotice(notice, error instanceof Error ? error.message : '图片加载失败', 'error'));
  });
  root.querySelector('.cutout-drop')!.append(drop);

  toleranceRange.addEventListener('input', () => syncTolerance(Number(toleranceRange.value)));
  toleranceNumber.addEventListener('input', () => syncTolerance(Number(toleranceNumber.value)));
  modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode as SelectionMode)));
  root.querySelector('.zoom-out')!.addEventListener('click', () => applyZoom(zoom - ZOOM_STEP));
  root.querySelector('.zoom-in')!.addEventListener('click', () => applyZoom(zoom + ZOOM_STEP));
  zoomResetButton.addEventListener('click', () => applyZoom(1));

  overlayCanvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const point = canvasPoint(event);
    if (!point || !currentImageData) return;
    event.preventDefault();
    try {
      overlayCanvas.setPointerCapture(event.pointerId);
    } catch {
      // 合成事件或部分浏览器场景下可能没有 active pointer，不影响选区计算。
    }
    if (mode === 'magic') {
      lastMagicPoint = point;
      updateSelection(createMagicSelection(currentImageData, point, currentTolerance()));
      return;
    }
    dragStart = point;
    const mask = mode === 'rect'
      ? createRectSelection(currentImageData.width, currentImageData.height, rectFromPoints(point, point))
      : createEllipseSelection(currentImageData.width, currentImageData.height, ellipseFromPoints(point, point));
    updateSelection(mask);
  });

  overlayCanvas.addEventListener('pointermove', (event) => {
    const point = canvasPoint(event);
    if (!point || !dragStart || !currentImageData || mode === 'magic') return;
    event.preventDefault();
    const mask = mode === 'rect'
      ? createRectSelection(currentImageData.width, currentImageData.height, rectFromPoints(dragStart, point))
      : createEllipseSelection(currentImageData.width, currentImageData.height, ellipseFromPoints(dragStart, point));
    updateSelection(mask);
  });

  overlayCanvas.addEventListener('pointerup', (event) => {
    dragStart = undefined;
    if (overlayCanvas.hasPointerCapture(event.pointerId)) overlayCanvas.releasePointerCapture(event.pointerId);
  });

  canvasWrap.addEventListener('wheel', (event: WheelEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    applyZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });
  canvasWrap.addEventListener('mousedown', (event: MouseEvent) => {
    if (event.button !== 1 || !currentImageData) return;
    event.preventDefault();
    panStart = { x: event.clientX, y: event.clientY, scrollLeft: canvasWrap.scrollLeft, scrollTop: canvasWrap.scrollTop };
    canvasWrap.classList.add('is-panning');
  });
  canvasWrap.addEventListener('auxclick', (event: MouseEvent) => {
    if (event.button === 1) event.preventDefault();
  });

  const handlePanMove = (event: MouseEvent) => {
    if (!panStart) return;
    event.preventDefault();
    canvasWrap.scrollLeft = panStart.scrollLeft - (event.clientX - panStart.x);
    canvasWrap.scrollTop = panStart.scrollTop - (event.clientY - panStart.y);
  };
  const stopPanning = (event?: MouseEvent) => {
    if (event && event.button !== 1) return;
    panStart = undefined;
    canvasWrap.classList.remove('is-panning');
  };
  window.addEventListener('mousemove', handlePanMove);
  window.addEventListener('mouseup', stopPanning);

  const deleteSelection = () => {
    if (!currentImageData) { setNotice(notice, '请先选择图片', 'warning'); return; }
    if (!selectionMask || countSelected(selectionMask) === 0) { setNotice(notice, '请先创建选区', 'warning'); return; }
    pushUndo();
    currentImageData = clearSelectionPixels(currentImageData, selectionMask);
    selectionMask = undefined;
    lastMagicPoint = undefined;
    clearDownload();
    renderImage();
    renderOverlay();
    setNotice(notice, '选区已删除为透明像素。', 'success');
    status.textContent = '选区已删除';
  };

  root.querySelector('.delete-selection')!.addEventListener('click', deleteSelection);
  undoButton.addEventListener('click', () => {
    const previous = undoStack.pop();
    if (!previous) return;
    currentImageData = previous;
    selectionMask = undefined;
    lastMagicPoint = undefined;
    clearDownload();
    renderImage();
    renderOverlay();
    updateUndoState();
    setNotice(notice, '已撤销上一步。', 'success');
    status.textContent = '已撤销';
  });
  root.querySelector('.export')!.addEventListener('click', async () => {
    if (!currentImageData) { setNotice(notice, '请先选择图片', 'warning'); return; }
    renderImage();
    const blob = await new Promise<Blob | null>((resolve) => mainCanvas.toBlob(resolve, 'image/png'));
    if (!blob) { setNotice(notice, '当前浏览器无法导出 PNG', 'error'); return; }
    clearDownload();
    download.href = store.create(blob);
    download.download = cutoutOutputName(fileName);
    download.hidden = false;
    setNotice(notice, 'PNG 已生成，可以下载。', 'success');
  });
  root.querySelector('.clear')!.addEventListener('click', () => {
    currentImageData = undefined;
    selectionMask = undefined;
    lastMagicPoint = undefined;
    undoStack = [];
    zoom = 1;
    resizeCanvases(0, 0);
    clearDownload();
    renderImage();
    renderOverlay();
    updateUndoState();
    status.textContent = '等待选择图片';
    setNotice(notice, '已清空。', 'info');
  });

  const handleKeydown = (event: KeyboardEvent) => {
    if (!root.isConnected || isFormTarget(event.target)) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'z') {
      event.preventDefault();
      undoButton.click();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelection();
    }
  };
  window.addEventListener('keydown', handleKeydown);

  return {
    element: root,
    cleanup: () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', stopPanning);
      store.clear();
    },
  };
}

export const cutoutPlugin: ToolPlugin = {
  definition: {
    route: '#/image/cutout',
    category: '图片与颜色',
    title: '图片抠图',
    description: '魔棒、矩形和圆形选区删除背景并导出透明 PNG',
    keywords: ['抠图', '背景删除', '魔棒', '透明', 'png'],
    aliases: ['remove background', 'magic wand', 'image cutout'],
    icon: 'CUT',
    tags: ['图片', '抠图', '透明'],
    privacyLevel: 'local-file',
    featured: true,
  },
  render: cutoutPage,
};
