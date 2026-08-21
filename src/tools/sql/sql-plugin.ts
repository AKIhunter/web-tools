import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { formatDatabaseText, SqlDialect, tokenizeDatabaseForHighlight } from './sql-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
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

export const sqlPlugin: ToolPlugin = {
  definition: {
    route: '#/dev/sql',
    category: '数据库SQL辅助',
    title: 'SQL 格式化',
    description: '格式化 MySQL、ClickHouse、Doris、PostgreSQL 与 Redis 命令并高亮结构',
    keywords: ['sql', 'mysql', 'clickhouse', 'doris', 'postgresql', 'redis', '格式化'],
    aliases: ['sql formatter', 'redis command', 'query formatter'],
    icon: 'SQL',
    tags: ['数据库', '格式化', '高亮'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: sqlPage,
};
