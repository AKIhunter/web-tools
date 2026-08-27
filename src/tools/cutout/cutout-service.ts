export type Point = { x: number; y: number };
export type RectSelection = { x: number; y: number; width: number; height: number };
export type EllipseSelection = { cx: number; cy: number; rx: number; ry: number };
export type SelectionMode = 'magic' | 'rect' | 'ellipse';

type Rgb = [number, number, number];

function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function emptyMask(width: number, height: number): Uint8Array {
  return new Uint8Array(Math.max(0, width * height));
}

function cloneImageData(image: ImageData): ImageData {
  const data = new Uint8ClampedArray(image.data);
  if (typeof ImageData === 'function') return new ImageData(data, image.width, image.height);
  return { data, width: image.width, height: image.height, colorSpace: image.colorSpace } as ImageData;
}

export function clampTolerance(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function colorWithinTolerance(data: Uint8ClampedArray, index: number, target: Rgb, tolerance: number): boolean {
  const safeTolerance = clampTolerance(tolerance);
  return Math.abs(data[index] - target[0]) <= safeTolerance
    && Math.abs(data[index + 1] - target[1]) <= safeTolerance
    && Math.abs(data[index + 2] - target[2]) <= safeTolerance;
}

export function createMagicSelection(image: ImageData, point: Point, tolerance: number): Uint8Array {
  const width = image.width;
  const height = image.height;
  const startX = Math.floor(point.x);
  const startY = Math.floor(point.y);
  const mask = emptyMask(width, height);
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return mask;

  const startOffset = pixelOffset(width, startX, startY);
  const target: Rgb = [image.data[startOffset], image.data[startOffset + 1], image.data[startOffset + 2]];
  const visited = new Uint8Array(width * height);
  const stack = [startY * width + startX];

  while (stack.length) {
    const pixel = stack.pop()!;
    if (visited[pixel]) continue;
    visited[pixel] = 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    const offset = pixel * 4;
    if (!colorWithinTolerance(image.data, offset, target, tolerance)) continue;
    mask[pixel] = 1;
    if (x > 0) stack.push(pixel - 1);
    if (x < width - 1) stack.push(pixel + 1);
    if (y > 0) stack.push(pixel - width);
    if (y < height - 1) stack.push(pixel + width);
  }

  return mask;
}

export function createRectSelection(width: number, height: number, rect: RectSelection): Uint8Array {
  const mask = emptyMask(width, height);
  const left = Math.max(0, Math.floor(Math.min(rect.x, rect.x + rect.width)));
  const right = Math.min(width, Math.ceil(Math.max(rect.x, rect.x + rect.width)));
  const top = Math.max(0, Math.floor(Math.min(rect.y, rect.y + rect.height)));
  const bottom = Math.min(height, Math.ceil(Math.max(rect.y, rect.y + rect.height)));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) mask[y * width + x] = 1;
  }
  return mask;
}

export function createEllipseSelection(width: number, height: number, ellipse: EllipseSelection): Uint8Array {
  const mask = emptyMask(width, height);
  if (ellipse.rx <= 0 || ellipse.ry <= 0) return mask;
  const left = Math.max(0, Math.floor(ellipse.cx - ellipse.rx));
  const right = Math.min(width, Math.ceil(ellipse.cx + ellipse.rx));
  const top = Math.max(0, Math.floor(ellipse.cy - ellipse.ry));
  const bottom = Math.min(height, Math.ceil(ellipse.cy + ellipse.ry));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const dx = (x + 0.5 - ellipse.cx) / ellipse.rx;
      const dy = (y + 0.5 - ellipse.cy) / ellipse.ry;
      if (dx * dx + dy * dy <= 1) mask[y * width + x] = 1;
    }
  }
  return mask;
}

export function countSelected(mask: Uint8Array): number {
  return mask.reduce((sum, value) => sum + (value ? 1 : 0), 0);
}

export function clearSelectionPixels(image: ImageData, mask: Uint8Array): ImageData {
  const output = cloneImageData(image);
  const total = Math.min(mask.length, output.width * output.height);
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (mask[pixel]) output.data[pixel * 4 + 3] = 0;
  }
  return output;
}

export function cutoutOutputName(inputName: string): string {
  const baseName = inputName.trim().replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}-cutout.png`;
}
