import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { buildFormQuery, decodeUrlComponent, encodeUrlComponent, parseFormQuery, parseUrl } from './url-service';
import { escapeUnicode, unescapeUnicode, utf8Hex } from './unicode-service';

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

function urlPage(): PageResult {
  const mode = select([['encode', 'URI 组件编码'], ['decode', 'URI 组件解码'], ['url', '完整 URL 分析'], ['query', '表单查询参数解析'], ['build', '从 JSON 键值对生成查询参数']]);
  const workbench = createWorkbench({
    sample: 'https://example.com/search?q=轻量 工具&q=本地+处理#result',
    auto: true,
    process: (input) => {
      if (mode.value === 'encode') return encodeUrlComponent(input);
      if (mode.value === 'decode') return decodeUrlComponent(input);
      if (mode.value === 'query') return JSON.stringify(parseFormQuery(input), null, 2);
      if (mode.value === 'build') {
        const entries = JSON.parse(input) as unknown;
        if (!Array.isArray(entries) || entries.some((entry) => !Array.isArray(entry) || entry.length !== 2)) throw new Error('请输入形如 [["key","value"]] 的 JSON');
        return buildFormQuery(entries as Array<[string, string]>);
      }
      return JSON.stringify(parseUrl(input), null, 2);
    },
  });
  return { element: withControl('模式', mode, workbench) };
}

function unicodePage(): PageResult {
  const mode = select([['escape', 'Unicode 转义'], ['unescape', 'Unicode 反转义'], ['hex', 'UTF-8 十六进制']]);
  const workbench = createWorkbench({
    sample: '你好，Web Toolbox 👋',
    auto: true,
    process: (input) => mode.value === 'escape' ? escapeUnicode(input) : mode.value === 'unescape' ? unescapeUnicode(input) : utf8Hex(input),
  });
  return { element: withControl('模式', mode, workbench) };
}

export const urlPlugin: ToolPlugin = {
  definition: {
    route: '#/codec/url',
    category: '编码解码',
    title: 'URL 编解码',
    description: 'URI 组件、完整 URL 与查询参数',
    keywords: ['url', 'encode', 'query'],
    aliases: ['url encode', 'url decode', 'percent encoding'],
    icon: '%',
    tags: ['URL', '查询参数'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: urlPage,
};

export const unicodePlugin: ToolPlugin = {
  definition: {
    route: '#/codec/unicode',
    category: '编码解码',
    title: 'Unicode 工具',
    description: 'Unicode 转义与 UTF-8 字节',
    keywords: ['unicode', 'utf8', '转义'],
    aliases: ['unicode escape', 'utf-8 hex'],
    icon: 'U+',
    tags: ['字符集', '转义'],
    privacyLevel: 'local-only',
  },
  render: unicodePage,
};
