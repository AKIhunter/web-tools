export type Capabilities = {
  webCrypto: boolean;
  clipboard: boolean;
  canvas: boolean;
  imageBitmap: boolean;
};

export function detectCapabilities(): Capabilities {
  return {
    webCrypto: Boolean(globalThis.crypto?.subtle),
    clipboard: Boolean(globalThis.navigator?.clipboard),
    canvas: typeof HTMLCanvasElement !== 'undefined',
    imageBitmap: typeof createImageBitmap === 'function',
  };
}

export async function supportsCanvasMime(mime: string): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime));
  return blob?.type === mime;
}
