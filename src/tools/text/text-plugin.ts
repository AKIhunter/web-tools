import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { CaseMode, convertCase, convertCaseAll } from './case-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
}

function casePage(): PageResult {
  const mode = select([
    ['all', '全部格式'],
    ['camel', 'camelCase'],
    ['pascal', 'PascalCase'],
    ['snake', 'snake_case'],
    ['kebab', 'kebab-case'],
    ['constant', 'CONSTANT_CASE'],
    ['title', 'Title Case'],
    ['dot', 'dot.case'],
  ]);
  const workbench = createWorkbench({
    inputLabel: '原始文本',
    outputLabel: '转换结果',
    sample: 'user profile URL value',
    auto: true,
    process: (input) => mode.value === 'all' ? JSON.stringify(convertCaseAll(input), null, 2) : convertCase(input, mode.value as CaseMode),
  });
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = '目标格式';
  modeLabel.append(mode);
  controls.append(modeLabel);
  const root = document.createElement('div');
  root.append(controls, workbench);
  return { element: root };
}

export const casePlugin: ToolPlugin = {
  definition: {
    route: '#/text/case',
    category: '文本处理',
    title: '命名转换',
    description: 'camel、snake、kebab、常量名与标题格式互转',
    keywords: ['case', 'camel', 'snake', 'kebab', '命名'],
    aliases: ['case converter', 'naming', '大小写转换'],
    icon: 'Aa',
    tags: ['文本', '变量名'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: casePage,
};
