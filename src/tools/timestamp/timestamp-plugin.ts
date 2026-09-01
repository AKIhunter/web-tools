import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { dateTimeToTimestampInTimeZone, DEFAULT_FIXED_TIME_ZONE, parseTimestamp, resolveTimeZone, TimestampUnit, timeZoneOptions } from './timestamp-service';

const ROW_COUNT = 5;

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
}

function formatTimestampResult(input: string, unit: TimestampUnit | 'datetime', timeZone: string): string {
  if (!input.trim()) return '等待输入';
  if (unit === 'datetime') {
    const result = dateTimeToTimestampInTimeZone(input, timeZone);
    return [
      `解释时区：${result.interpretedIn}`,
      `秒：${result.seconds}`,
      `毫秒：${result.milliseconds}`,
    ].join('\n');
  }
  const result = parseTimestamp(input, unit, Date.now(), timeZone);
  return [
    `时区时间：${result.zoned}`,
    `UTC：${result.utc}`,
    `本地：${result.local}`,
    `秒：${result.seconds}`,
    `毫秒：${result.milliseconds}`,
    `识别为：${result.interpretedAs === 'seconds' ? '秒' : '毫秒'}`,
    `相对：${result.relative}`,
  ].join('\n');
}

function timestampPage(): PageResult {
  const unit = select([['auto', '自动识别'], ['seconds', '秒'], ['milliseconds', '毫秒'], ['datetime', '日期时间转时间戳']]);
  const timeZone = select(timeZoneOptions.map((option) => [option.value, option.label]));
  timeZone.value = DEFAULT_FIXED_TIME_ZONE;

  const root = document.createElement('div');
  root.className = 'timestamp-tool';
  root.innerHTML = `
    <section class="file-panel timestamp-guide">
      <p>一次最多输入 5 条时间戳或日期时间。全局时区会刷新勾选“跟随”的结果；关闭跟随后，该行固定按 UTC+8 展示。</p>
      <p>日期时间模式按当前生效时区解释输入，例如 <code>2024-01-01 08:00:00</code>。</p>
    </section>
    <section class="file-panel timestamp-panel">
      <div class="parameters timestamp-controls">
        <label>输入类型</label>
        <label>全局时区</label>
        <button class="fill-now" type="button">填入当前时间</button>
      </div>
      <div class="timestamp-rows" aria-label="时间戳批量转换"></div>
    </section>`;

  const controls = root.querySelector<HTMLElement>('.timestamp-controls')!;
  controls.children[0].append(unit);
  controls.children[1].append(timeZone);
  const rows = root.querySelector<HTMLElement>('.timestamp-rows')!;

  const inputs: HTMLInputElement[] = [];
  const follows: HTMLInputElement[] = [];
  const outputs: HTMLElement[] = [];

  function renderRow(index: number): void {
    const effectiveTimeZone = follows[index].checked ? timeZone.value : DEFAULT_FIXED_TIME_ZONE;
    try {
      outputs[index].classList.remove('error');
      outputs[index].textContent = formatTimestampResult(inputs[index].value, unit.value as TimestampUnit | 'datetime', effectiveTimeZone);
    } catch (error) {
      outputs[index].classList.add('error');
      outputs[index].textContent = error instanceof Error ? error.message : '转换失败';
    }
  }

  function renderAll(): void {
    for (let index = 0; index < ROW_COUNT; index += 1) renderRow(index);
  }

  for (let index = 0; index < ROW_COUNT; index += 1) {
    const row = document.createElement('article');
    row.className = 'timestamp-row';
    row.innerHTML = `
      <label class="timestamp-input-label">输入 ${index + 1}<input class="timestamp-input" type="text" placeholder="时间戳、毫秒或日期时间"></label>
      <div class="timestamp-result-cell">
        <div class="timestamp-result-head">
          <span>结果 ${index + 1}</span>
          <label class="inline-control timestamp-follow"><input class="timestamp-follow-input" type="checkbox" checked> 跟随时区</label>
        </div>
        <pre class="timestamp-output">等待输入</pre>
      </div>`;
    const input = row.querySelector<HTMLInputElement>('.timestamp-input')!;
    const follow = row.querySelector<HTMLInputElement>('.timestamp-follow-input')!;
    const output = row.querySelector<HTMLElement>('.timestamp-output')!;
    input.addEventListener('input', () => renderRow(index));
    follow.addEventListener('change', () => {
      renderRow(index);
      const label = resolveTimeZone(follow.checked ? timeZone.value : DEFAULT_FIXED_TIME_ZONE).label;
      output.dataset.zone = label;
    });
    inputs.push(input);
    follows.push(follow);
    outputs.push(output);
    rows.append(row);
  }

  unit.addEventListener('change', renderAll);
  timeZone.addEventListener('change', renderAll);
  root.querySelector('.fill-now')!.addEventListener('click', () => {
    const target = inputs.find((input) => !input.value.trim()) ?? inputs[0];
    target.value = unit.value === 'milliseconds' ? String(Date.now()) : unit.value === 'datetime' ? formatDateTimeForInput(new Date(), timeZone.value) : String(Math.floor(Date.now() / 1000));
    renderAll();
  });

  renderAll();
  return { element: root };
}

function formatDateTimeForInput(date: Date, timeZoneValue: string): string {
  const option = resolveTimeZone(timeZoneValue);
  const offset = option.offsetMinutes === 'local' ? -date.getTimezoneOffset() : option.offsetMinutes;
  const shifted = new Date(date.getTime() + offset * 60_000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
}

export const timestampPlugin: ToolPlugin = {
  definition: {
    route: '#/timestamp',
    category: '时间与日期',
    title: '时间戳转换',
    description: '批量转换时间戳、日期时间和指定时区结果',
    keywords: ['时间戳', 'timestamp', '日期', '时区'],
    aliases: ['unix time', 'epoch', 'date', 'timezone'],
    icon: 'T',
    tags: ['时间', '日期', '时区'],
    privacyLevel: 'local-only',
  },
  render: timestampPage,
};
