import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { dateTimeToTimestamp, parseTimestamp } from './timestamp-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
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

export const timestampPlugin: ToolPlugin = {
  definition: {
    route: '#/timestamp',
    category: '时间与日期',
    title: '时间戳转换',
    description: '秒、毫秒、本地时间与 UTC',
    keywords: ['时间戳', 'timestamp', '日期'],
    aliases: ['unix time', 'epoch', 'date'],
    icon: 'T',
    tags: ['时间', '日期'],
    privacyLevel: 'local-only',
  },
  render: timestampPage,
};
