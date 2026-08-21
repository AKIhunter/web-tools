import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { decodeBase64Text, encodeBase64Text, fileToDataUrl, parseDataUrl } from './base64-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
}

function withControl(label: string, control: HTMLElement, child: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'tool-page';
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const caption = document.createElement('label');
  caption.textContent = label;
  caption.append(control);
  controls.append(caption);
  wrap.append(controls, child);
  return wrap;
}

function base64TextPage(): PageResult {
  const mode = select([['encode', '标准 Base64 编码'], ['url', 'Base64URL 编码'], ['decode', '解码 UTF-8 文本']]);
  const workbench = createWorkbench({
    sample: '本地处理 🔒',
    auto: true,
    process: (input) => mode.value === 'decode' ? decodeBase64Text(input) : encodeBase64Text(input, mode.value === 'url'),
  });
  return { element: withControl('模式', mode, workbench) };
}

function base64FilePage(): PageResult {
  const root = document.createElement('div');
  root.className = 'file-panel';
  root.innerHTML = '<label class="drop-zone">选择文件<input type="file"></label><textarea readonly placeholder="Data URL 结果"></textarea><div class="actions"><button type="button" class="download">下载解析文件</button></div><p class="notice alert" role="status" aria-live="polite"></p>';
  const input = root.querySelector<HTMLInputElement>('input')!;
  const output = root.querySelector<HTMLTextAreaElement>('textarea')!;
  const notice = root.querySelector<HTMLElement>('.notice')!;
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (file) output.value = await fileToDataUrl(file);
  });
  root.querySelector('.download')!.addEventListener('click', () => {
    try {
      const { mime, bytes } = parseDataUrl(output.value);
      const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: mime }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'decoded-file';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      notice.textContent = error instanceof Error ? error.message : '解析失败';
    }
  });
  return { element: root };
}

export const base64TextPlugin: ToolPlugin = {
  definition: {
    route: '#/base64/text',
    category: '编码解码',
    title: 'Base64 文本',
    description: 'UTF-8 文本与 Base64URL 往返',
    keywords: ['base64', '文本', '编码'],
    aliases: ['base64url', 'b64'],
    icon: '64',
    tags: ['文本', 'Base64'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: base64TextPage,
};

export const base64FilePlugin: ToolPlugin = {
  definition: {
    route: '#/base64/file',
    category: '编码解码',
    title: 'Base64 文件',
    description: '文件与 Data URL 本地转换',
    keywords: ['base64', 'file', 'data url'],
    aliases: ['data uri', 'file to base64'],
    icon: 'B64',
    tags: ['文件', 'Data URL'],
    privacyLevel: 'local-file',
  },
  render: base64FilePage,
};
