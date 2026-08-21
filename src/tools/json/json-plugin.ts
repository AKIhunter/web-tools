import { setNotice } from '../../components/notice';
import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { compareFormattedJson, JsonLineDiff } from './json-diff-service';
import { tokenizeJsonForHighlight } from './json-highlight-service';
import { escapeJsonString, processJson, unescapeJsonString } from './json-service';

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

function jsonPage(): PageResult {
  const mode = select([['2', '格式化 · 2 空格'], ['4', '格式化 · 4 空格'], ['tab', '格式化 · Tab'], ['0', '压缩'], ['sort', '键排序'], ['escape', '字符串转义'], ['unescape', '字符串去转义'], ['diff', '对比两个 JSON']]);
  const resultPanel = document.createElement('section');
  resultPanel.className = 'json-result-panel';
  const resultTitle = document.createElement('span');
  resultTitle.textContent = '结果';
  const preview = document.createElement('pre');
  preview.className = 'json-preview';
  preview.classList.add('empty');
  preview.setAttribute('aria-label', 'JSON 结果');
  preview.textContent = '等待处理';
  resultPanel.append(resultTitle, preview);
  const clearPreview = () => {
    preview.classList.add('empty');
    preview.replaceChildren('等待处理');
  };
  const renderPreview = (output: string) => {
    if (mode.value === 'escape' || mode.value === 'unescape') {
      preview.classList.remove('empty');
      preview.replaceChildren(output);
      return;
    }
    preview.classList.remove('empty');
    preview.replaceChildren(...tokenizeJsonForHighlight(output).map((token) => {
      const span = document.createElement('span');
      span.className = `json-token ${token.kind}`;
      span.textContent = token.value;
      return span;
    }));
    preview.hidden = false;
  };
  const workbench = createWorkbench({
    sample: '{"name":"工具箱","items":[1,true,"中文"],"meta":{"safe":true}}',
    auto: true,
    canSwap: false,
    outputVisible: false,
    afterProcess: renderPreview,
    afterClear: clearPreview,
    process: (input) => {
      if (mode.value === 'escape') return escapeJsonString(input);
      if (mode.value === 'unescape') return unescapeJsonString(input);
      const indent = mode.value === 'tab' ? '\t' : mode.value === '0' ? 0 : mode.value === '4' ? 4 : 2;
      const result = processJson(input, indent, mode.value === 'sort');
      return result.output;
    },
  });
  const comparePanel = createJsonComparePanel();
  const normalBody = document.createElement('div');
  normalBody.className = 'json-tool-layout';
  normalBody.append(workbench, resultPanel);
  const body = document.createElement('div');
  body.append(normalBody, comparePanel);
  const updateMode = () => {
    const diffMode = mode.value === 'diff';
    normalBody.hidden = diffMode;
    comparePanel.hidden = !diffMode;
    if (!diffMode) workbench.querySelector<HTMLButtonElement>('.run')?.click();
  };
  mode.addEventListener('change', updateMode);
  updateMode();
  return { element: withControl('处理方式', mode, body) };
}

function createJsonComparePanel(): HTMLElement {
  const root = document.createElement('section');
  root.className = 'json-compare-tool';
  root.hidden = true;

  const lineSwitch = document.createElement('input');
  lineSwitch.type = 'checkbox';
  lineSwitch.checked = true;
  const contentSwitch = document.createElement('input');
  contentSwitch.type = 'checkbox';
  contentSwitch.checked = true;
  const switches = document.createElement('div');
  switches.className = 'parameters';
  const lineLabel = document.createElement('label');
  lineLabel.className = 'inline-control';
  lineLabel.append(lineSwitch, document.createTextNode('对比行高亮'));
  const contentLabel = document.createElement('label');
  contentLabel.className = 'inline-control';
  contentLabel.append(contentSwitch, document.createTextNode('对比内容高亮'));
  switches.append(lineLabel, contentLabel);

  const inputs = document.createElement('div');
  inputs.className = 'json-compare-inputs';
  const leftInput = createCompareTextarea('左侧 JSON 原始数据');
  const rightInput = createCompareTextarea('右侧 JSON 原始数据');
  inputs.append(leftInput.label, rightInput.label);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const run = document.createElement('button');
  run.type = 'button';
  run.className = 'primary';
  run.textContent = '对比';
  const sample = document.createElement('button');
  sample.type = 'button';
  sample.textContent = '载入示例';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.textContent = '清空';
  actions.append(run, sample, clear);

  const result = document.createElement('section');
  result.className = 'json-compare-result';
  const leftColumn = createCompareColumn('左侧格式化结果');
  const rightColumn = createCompareColumn('右侧格式化结果');
  result.append(leftColumn.root, rightColumn.root);

  const notice = document.createElement('p');
  setNotice(notice);

  const resetResult = () => {
    leftColumn.body.replaceChildren(createEmptyLine('等待处理'));
    rightColumn.body.replaceChildren(createEmptyLine('等待处理'));
  };
  const render = () => {
    setNotice(notice);
    try {
      const rows = compareFormattedJson(leftInput.textarea.value, rightInput.textarea.value);
      renderCompareRows(leftColumn.body, rows, 'left', lineSwitch.checked, contentSwitch.checked);
      renderCompareRows(rightColumn.body, rows, 'right', lineSwitch.checked, contentSwitch.checked);
    } catch (error) {
      resetResult();
      setNotice(notice, error instanceof Error ? error.message : 'JSON 对比失败', 'error');
    }
  };

  run.addEventListener('click', render);
  lineSwitch.addEventListener('change', render);
  contentSwitch.addEventListener('change', render);
  sample.addEventListener('click', () => {
    leftInput.textarea.value = '{"name":"工具箱","items":[1,true,"中文"],"meta":{"safe":true,"version":1}}';
    rightInput.textarea.value = '{"name":"工具箱","items":[1,false,"中文"],"meta":{"safe":true,"version":2},"extra":"新增"}';
    render();
  });
  clear.addEventListener('click', () => {
    leftInput.textarea.value = '';
    rightInput.textarea.value = '';
    resetResult();
    setNotice(notice);
  });
  [leftInput.textarea, rightInput.textarea].forEach((textarea) => {
    textarea.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        render();
      }
    });
  });

  resetResult();
  root.append(switches, inputs, actions, result, notice);
  return root;
}

function createCompareTextarea(title: string): { label: HTMLLabelElement; textarea: HTMLTextAreaElement } {
  const label = document.createElement('label');
  label.className = 'json-compare-editor';
  const caption = document.createElement('span');
  caption.textContent = title;
  const textarea = document.createElement('textarea');
  textarea.spellcheck = false;
  textarea.placeholder = '粘贴原始 JSON';
  label.append(caption, textarea);
  return { label, textarea };
}

function createCompareColumn(title: string): { root: HTMLElement; body: HTMLElement } {
  const root = document.createElement('article');
  root.className = 'json-compare-column';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const body = document.createElement('div');
  body.className = 'json-compare-lines';
  root.append(heading, body);
  return { root, body };
}

function createEmptyLine(text: string): HTMLElement {
  const line = document.createElement('div');
  line.className = 'json-compare-line empty';
  const number = document.createElement('span');
  number.className = 'line-number';
  number.textContent = '';
  const code = document.createElement('span');
  code.className = 'line-code';
  code.textContent = text;
  line.append(number, code);
  return line;
}

function renderCompareRows(target: HTMLElement, rows: JsonLineDiff[], side: 'left' | 'right', lineHighlight: boolean, contentHighlight: boolean): void {
  target.replaceChildren(...rows.map((row) => {
    const text = side === 'left' ? row.left : row.right;
    const range = side === 'left' ? row.leftRange : row.rightRange;
    const line = document.createElement('div');
    line.className = 'json-compare-line';
    if (lineHighlight && row.lineDifferent) line.classList.add('line-different');
    const number = document.createElement('span');
    number.className = 'line-number';
    number.textContent = String(row.lineNumber);
    const code = document.createElement('span');
    code.className = 'line-code';
    appendJsonLine(code, text, contentHighlight ? range : undefined);
    line.append(number, code);
    return line;
  }));
}

function appendJsonLine(target: HTMLElement, line: string, diffRange?: [number, number]): void {
  if (!line) {
    target.append(document.createTextNode(' '));
    return;
  }
  let cursor = 0;
  tokenizeJsonForHighlight(line).forEach((token) => {
    const start = cursor;
    const end = cursor + token.value.length;
    appendTokenPart(target, token.kind, token.value, start, end, diffRange);
    cursor = end;
  });
}

function appendTokenPart(target: HTMLElement, kind: string, value: string, start: number, end: number, diffRange?: [number, number]): void {
  if (!diffRange || diffRange[1] <= start || diffRange[0] >= end) {
    target.append(createJsonTokenSpan(kind, value, false));
    return;
  }
  const diffStart = Math.max(diffRange[0], start) - start;
  const diffEnd = Math.min(diffRange[1], end) - start;
  if (diffStart > 0) target.append(createJsonTokenSpan(kind, value.slice(0, diffStart), false));
  target.append(createJsonTokenSpan(kind, value.slice(diffStart, diffEnd), true));
  if (diffEnd < value.length) target.append(createJsonTokenSpan(kind, value.slice(diffEnd), false));
}

function createJsonTokenSpan(kind: string, value: string, diff: boolean): HTMLElement {
  const span = document.createElement('span');
  span.className = `json-token ${kind}${diff ? ' diff-segment' : ''}`;
  span.textContent = value;
  return span;
}

export const jsonPlugin: ToolPlugin = {
  definition: {
    route: '#/json',
    category: '数据格式',
    title: 'JSON 工具',
    description: '校验、格式化、压缩、转义、键排序与双 JSON 对比',
    keywords: ['json', '格式化', '压缩', '校验', '对比', 'diff'],
    aliases: ['json formatter', 'json beautifier', 'json diff', 'json compare'],
    icon: '{}',
    tags: ['结构化数据', '格式化', '对比'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: jsonPage,
};
