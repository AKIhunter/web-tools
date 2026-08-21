import { createWorkbench } from '../components/workbench';
import { setNotice } from '../components/notice';
import { encodeBase64Text, decodeBase64Text, fileToDataUrl, parseDataUrl } from '../tools/base64/base64-service';
import { buildFormQuery, decodeUrlComponent, encodeUrlComponent, parseFormQuery, parseUrl } from '../tools/codec/url-service';
import { escapeUnicode, unescapeUnicode, utf8Hex } from '../tools/codec/unicode-service';
import { decryptText, digestText, encryptText, signHmac, verifyHmac } from '../tools/crypto/crypto-service';
import { generatePassword, generateToken, generateUlid, generateUuidV4, TokenFormat } from '../tools/generator/random-service';
import { compressImage, LatestTask, outputName } from '../tools/image/image-service';
import { compareFormattedJson, JsonLineDiff } from '../tools/json/json-diff-service';
import { tokenizeJsonForHighlight } from '../tools/json/json-highlight-service';
import { escapeJsonString, processJson, unescapeJsonString } from '../tools/json/json-service';
import { formatDatabaseText, SqlDialect, tokenizeDatabaseForHighlight } from '../tools/sql/sql-service';
import { dateTimeToTimestamp, parseTimestamp } from '../tools/timestamp/timestamp-service';
import { ObjectUrlStore } from '../platform/object-url-store';

type PageResult = { element: HTMLElement; cleanup?: () => void };

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

function digestPage(): PageResult {
  const algorithm = select([['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']]);
  const workbench = createWorkbench({
    sample: 'Web Toolbox',
    auto: true,
    canSwap: false,
    process: (input) => digestText(input, algorithm.value as 'SHA-256' | 'SHA-384' | 'SHA-512'),
  });
  return { element: withControl('摘要算法', algorithm, workbench) };
}

function hmacPage(): PageResult {
  const root = document.createElement('div');
  const secret = document.createElement('input');
  secret.type = 'password';
  secret.placeholder = '签名密钥（不会保存）';
  const mode = select([['sign', '生成签名'], ['verify', '验证签名（输入格式：正文\\n签名）']]);
  const workbench = createWorkbench({
    sample: '待签名的消息',
    canSwap: false,
    process: async (input) => {
      if (!secret.value) throw new Error('请输入签名密钥');
      if (mode.value === 'sign') return signHmac(input, secret.value);
      const split = input.lastIndexOf('\n');
      if (split < 0) throw new Error('最后一行应为签名');
      return (await verifyHmac(input.slice(0, split), secret.value, input.slice(split + 1))) ? '签名有效' : '签名无效';
    },
  });
  const parameters = document.createElement('div');
  parameters.className = 'parameters';
  parameters.append(mode, secret);
  root.append(parameters, workbench);
  return { element: root, cleanup: () => { secret.value = ''; } };
}

function aesPage(): PageResult {
  const root = document.createElement('div');
  const password = document.createElement('input');
  password.type = 'password';
  password.placeholder = '口令（不会保存）';
  const mode = select([['encrypt', '加密'], ['decrypt', '解密']]);
  const workbench = createWorkbench({
    sample: '只在浏览器内处理的明文',
    canSwap: false,
    runLabel: '执行高强度运算',
    process: (input) => mode.value === 'encrypt' ? encryptText(input, password.value) : decryptText(input, password.value),
  });
  const parameters = document.createElement('div');
  parameters.className = 'parameters';
  parameters.append(mode, password);
  root.append(parameters, workbench);
  return { element: root, cleanup: () => { password.value = ''; } };
}

function uuidPage(): PageResult {
  const mode = select([['uuid', 'UUID v4'], ['ulid', 'ULID'], ['both', 'UUID + ULID']]);
  const count = document.createElement('input');
  count.type = 'number';
  count.min = '1';
  count.max = '100';
  count.value = '5';
  const workbench = createWorkbench({
    outputLabel: '标识符',
    canSwap: false,
    inputVisible: false,
    runLabel: '生成',
    process: () => {
      const total = Math.min(100, Math.max(1, Number.parseInt(count.value, 10) || 1));
      const rows = Array.from({ length: total }, () => {
        if (mode.value === 'uuid') return generateUuidV4();
        if (mode.value === 'ulid') return generateUlid();
        return `${generateUuidV4()}\t${generateUlid()}`;
      });
      return rows.join('\n');
    },
  });
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const countLabel = document.createElement('label');
  countLabel.textContent = '数量';
  countLabel.append(count);
  const modeLabel = document.createElement('label');
  modeLabel.textContent = '类型';
  modeLabel.append(mode);
  controls.append(modeLabel, countLabel);
  const root = document.createElement('div');
  root.append(controls, workbench);
  return { element: root };
}

function randomPage(): PageResult {
  const mode = select([['token', '随机 Token'], ['password', '随机密码']]);
  const format = select([['base64url', 'Base64URL'], ['hex', '十六进制'], ['numeric', '纯数字']]);
  const length = document.createElement('input');
  length.type = 'number';
  length.min = '1';
  length.max = '256';
  length.value = '32';
  const symbols = document.createElement('input');
  symbols.type = 'checkbox';
  const workbench = createWorkbench({
    outputLabel: '结果',
    canSwap: false,
    inputVisible: false,
    runLabel: '生成',
    process: () => {
      const size = Math.min(256, Math.max(1, Number.parseInt(length.value, 10) || 1));
      if (mode.value === 'password') {
        return generatePassword({ length: size, lowercase: true, uppercase: true, digits: true, symbols: symbols.checked });
      }
      return generateToken(size, format.value as TokenFormat);
    },
  });
  const updateMode = () => {
    format.disabled = mode.value === 'password';
    symbols.disabled = mode.value !== 'password';
  };
  mode.addEventListener('change', updateMode);
  updateMode();
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = '类型';
  modeLabel.append(mode);
  const lengthLabel = document.createElement('label');
  lengthLabel.textContent = '长度';
  lengthLabel.append(length);
  const formatLabel = document.createElement('label');
  formatLabel.textContent = 'Token 格式';
  formatLabel.append(format);
  const symbolsLabel = document.createElement('label');
  symbolsLabel.className = 'inline-control';
  symbolsLabel.append(symbols, document.createTextNode('包含符号'));
  controls.append(modeLabel, lengthLabel, formatLabel, symbolsLabel);
  const root = document.createElement('div');
  root.append(controls, workbench);
  return { element: root };
}

function sqlPage(): PageResult {
  const dialect = select([['auto', '自动识别'], ['mysql', 'MySQL'], ['clickhouse', 'ClickHouse'], ['doris', 'Doris'], ['postgresql', 'PostgreSQL'], ['redis', 'Redis 命令']]);
  const indentMode = select([['2', '2 空格'], ['4', '4 空格'], ['tab', 'Tab']]);
  const resultPanel = document.createElement('section');
  resultPanel.className = 'sql-result-panel';
  const resultTitle = document.createElement('span');
  resultTitle.textContent = '结果';
  const preview = document.createElement('pre');
  preview.className = 'sql-preview empty';
  preview.setAttribute('aria-label', 'SQL 格式化结果');
  preview.textContent = '等待处理';
  resultPanel.append(resultTitle, preview);
  const clearPreview = () => {
    preview.classList.add('empty');
    preview.replaceChildren('等待处理');
  };
  const renderPreview = (output: string) => {
    preview.classList.remove('empty');
    preview.replaceChildren(...tokenizeDatabaseForHighlight(output, dialect.value as SqlDialect).map((token) => {
      const span = document.createElement('span');
      span.className = `sql-token ${token.kind}`;
      span.textContent = token.value;
      return span;
    }));
  };
  const indentValue = () => indentMode.value === 'tab' ? '\t' : indentMode.value === '4' ? 4 : 2;
  const workbench = createWorkbench({
    sample: 'select u.id,u.name,count(o.id) as order_count from users u left join orders o on u.id=o.user_id where u.status=1 and o.created_at>=\'2024-01-01\' group by u.id,u.name having count(o.id)>5 order by order_count desc limit 20;',
    canSwap: false,
    outputVisible: false,
    runLabel: '格式化',
    afterProcess: renderPreview,
    afterClear: clearPreview,
    process: (input) => formatDatabaseText(input, dialect.value as SqlDialect, indentValue()),
  });
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const dialectLabel = document.createElement('label');
  dialectLabel.textContent = '语法';
  dialectLabel.append(dialect);
  const indentLabel = document.createElement('label');
  indentLabel.textContent = '缩进';
  indentLabel.append(indentMode);
  controls.append(dialectLabel, indentLabel);
  dialect.addEventListener('change', () => workbench.querySelector<HTMLButtonElement>('.run')?.click());
  indentMode.addEventListener('change', () => workbench.querySelector<HTMLButtonElement>('.run')?.click());
  const root = document.createElement('div');
  root.className = 'sql-tool-layout';
  root.append(controls, workbench, resultPanel);
  return { element: root };
}

function timestampPage(): PageResult {
  const unit = select([['auto', '自动识别'], ['seconds', '秒'], ['milliseconds', '毫秒'], ['datetime', '本地日期时间转时间戳']]);
  const workbench = createWorkbench({
    sample: String(Math.floor(Date.now() / 1000)),
    auto: true,
    process: (input) => unit.value === 'datetime'
      ? JSON.stringify(dateTimeToTimestamp(input), null, 2)
      : JSON.stringify(parseTimestamp(input, unit.value as 'auto' | 'seconds' | 'milliseconds'), null, 2),
  });
  const now = document.createElement('button');
  now.type = 'button';
  now.textContent = '填入当前时间';
  now.addEventListener('click', () => {
    const input = workbench.querySelector<HTMLTextAreaElement>('.input')!;
    input.value = unit.value === 'milliseconds' ? String(Date.now()) : String(Math.floor(Date.now() / 1000));
    input.dispatchEvent(new Event('input'));
  });
  const controls = document.createElement('div');
  controls.className = 'parameters';
  controls.append(unit, now);
  const root = document.createElement('div');
  root.append(controls, workbench);
  return { element: root };
}

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

export function renderToolPage(route: string): PageResult {
  if (route === '#/json') return jsonPage();
  if (route === '#/codec/url') return urlPage();
  if (route === '#/codec/unicode') return unicodePage();
  if (route === '#/base64/text') return base64TextPage();
  if (route === '#/base64/file') return base64FilePage();
  if (route === '#/crypto/digest') return digestPage();
  if (route === '#/crypto/hmac') return hmacPage();
  if (route === '#/crypto/aes-gcm') return aesPage();
  if (route === '#/generator/uuid') return uuidPage();
  if (route === '#/generator/random') return randomPage();
  if (route === '#/dev/sql') return sqlPage();
  if (route === '#/timestamp') return timestampPage();
  if (route === '#/image/compress') return imagePage();
  return { element: document.createElement('div') };
}
