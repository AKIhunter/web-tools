import { copyText } from '../platform/clipboard';
import { setNotice } from './notice';

export type WorkbenchOptions = {
  inputLabel?: string;
  outputLabel?: string;
  placeholder?: string;
  sample?: string;
  runLabel?: string;
  auto?: boolean;
  canSwap?: boolean;
  inputVisible?: boolean;
  outputVisible?: boolean;
  afterProcess?: (output: string) => void;
  afterClear?: () => void;
  process: (input: string) => string | Promise<string>;
};

export function createWorkbench(options: WorkbenchOptions): HTMLElement {
  const root = document.createElement('section');
  const inputVisible = options.inputVisible !== false;
  const outputVisible = options.outputVisible !== false;
  root.className = ['workbench', inputVisible ? '' : 'single-output', outputVisible ? '' : 'input-only'].filter(Boolean).join(' ');
  root.innerHTML = `
    <div class="editor-grid">
      <label class="editor"><span>${options.inputLabel ?? '输入'}</span><textarea class="input" spellcheck="false"></textarea><small class="input-stat">0 字符 · 0 字节 · 1 行</small></label>
      <label class="editor"><span>${options.outputLabel ?? '结果'}</span><textarea class="output" readonly spellcheck="false"></textarea><small class="output-stat">等待处理</small></label>
    </div>
    <div class="actions">
      <button class="primary run" type="button">${options.runLabel ?? '执行'}</button>
      <button class="swap" type="button">交换</button>
      <button class="sample" type="button">载入示例</button>
      <button class="copy" type="button">复制结果</button>
      <button class="clear" type="button">清空</button>
    </div>
    <p class="notice alert" role="status" aria-live="polite"></p>`;
  const input = root.querySelector<HTMLTextAreaElement>('.input')!;
  const output = root.querySelector<HTMLTextAreaElement>('.output')!;
  const notice = root.querySelector<HTMLElement>('.notice')!;
  const outputStat = root.querySelector<HTMLElement>('.output-stat')!;
  input.placeholder = options.placeholder ?? '在此输入内容';
  root.querySelector<HTMLLabelElement>('.editor')!.hidden = !inputVisible;
  output.closest<HTMLLabelElement>('.editor')!.hidden = !outputVisible;
  root.querySelector<HTMLButtonElement>('.swap')!.hidden = options.canSwap === false || !inputVisible || !outputVisible;
  root.querySelector<HTMLButtonElement>('.sample')!.hidden = !inputVisible;

  const updateInputStat = () => {
    const bytes = new TextEncoder().encode(input.value).length;
    root.querySelector<HTMLElement>('.input-stat')!.textContent = `${input.value.length} 字符 · ${bytes} 字节 · ${input.value.split('\n').length} 行`;
    if (output.value) outputStat.textContent = '输入已改变，结果待更新';
  };
  const run = async () => {
    setNotice(notice);
    const started = performance.now();
    try {
      output.value = await options.process(input.value);
      outputStat.textContent = `${output.value.length} 字符 · ${(performance.now() - started).toFixed(1)} ms`;
      options.afterProcess?.(output.value);
    } catch (error) {
      options.afterClear?.();
      setNotice(notice, error instanceof Error ? error.message : '处理失败', 'error');
    }
  };
  root.querySelector('.run')!.addEventListener('click', run);
  root.querySelector('.clear')!.addEventListener('click', () => {
    input.value = '';
    output.value = '';
    setNotice(notice);
    outputStat.textContent = '等待处理';
    if (inputVisible) updateInputStat();
    options.afterClear?.();
  });
  root.querySelector('.sample')!.addEventListener('click', () => {
    if (input.value && !confirm('载入示例会覆盖当前输入，是否继续？')) return;
    input.value = options.sample ?? '';
    updateInputStat();
    void run();
  });
  root.querySelector('.swap')!.addEventListener('click', () => {
    [input.value, output.value] = [output.value, input.value];
    updateInputStat();
  });
  root.querySelector('.copy')!.addEventListener('click', async () => {
    const copied = await copyText(output.value, output);
    setNotice(notice, copied ? '已复制到剪贴板' : '已选中结果，请手动复制', copied ? 'success' : 'info');
  });
  input.addEventListener('input', () => {
    updateInputStat();
    if (options.auto) void run();
  });
  input.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void run();
    }
  });
  queueMicrotask(() => (inputVisible ? input : output).focus());
  return root;
}
