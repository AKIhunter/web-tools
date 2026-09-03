import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { dslToSql, formatDatabaseText, tokenizeDatabaseForHighlight } from './sql-service';
import type { SqlDialect } from './sql-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
}

function sqlPage(): PageResult {
  const mode = select([['format', '格式化 SQL / Redis'], ['dsl', 'DSL 转 SQL']]);
  const dialect = select([['auto', '自动识别'], ['mysql', 'MySQL'], ['clickhouse', 'ClickHouse'], ['doris', 'Doris'], ['postgresql', 'PostgreSQL'], ['redis', 'Redis 命令']]);
  const indentMode = select([['2', '2 空格'], ['4', '4 空格'], ['tab', 'Tab']]);
  const formatSample = 'select u.id,u.name,count(o.id) as order_count from users u left join orders o on u.id=o.user_id where u.status=1 and o.created_at>=\'2024-01-01\' group by u.id,u.name having count(o.id)>5 order by order_count desc limit 20;';
  const dslSample = JSON.stringify({
    table: 'users',
    select: ['id', 'name', 'email'],
    where: {
      status: 1,
      age: { gte: 18 },
      $or: [
        { role: 'admin' },
        { role: 'ops' },
      ],
    },
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 20,
  }, null, 2);
  const guide = document.createElement('section');
  guide.className = 'sql-guide';
  guide.innerHTML = `
    <p>支持两种处理：直接格式化 SQL / Redis，或把 JSON DSL 解析成 SQL。</p>
    <p>DSL 支持 <code>table/index</code>、<code>select/_source</code>、<code>where/query</code>、<code>orderBy/sort</code>、<code>limit/size</code>、<code>offset/from</code>。</p>
    <p>条件支持 <code>$and</code>、<code>$or</code>、<code>eq/ne/gt/gte/lt/lte/like/in/between/isNull</code>，也兼容常见 Elasticsearch <code>bool/term/terms/range/match/exists</code>。</p>`;
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
    sample: formatSample,
    canSwap: false,
    outputVisible: false,
    runLabel: '格式化',
    afterProcess: renderPreview,
    afterClear: clearPreview,
    process: (input) => mode.value === 'dsl'
      ? dslToSql(input, indentValue())
      : formatDatabaseText(input, dialect.value as SqlDialect, indentValue()),
  });
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = '处理类型';
  modeLabel.append(mode);
  const dialectLabel = document.createElement('label');
  dialectLabel.textContent = '语法';
  dialectLabel.append(dialect);
  const indentLabel = document.createElement('label');
  indentLabel.textContent = '缩进';
  indentLabel.append(indentMode);
  controls.append(modeLabel, dialectLabel, indentLabel);
  const input = workbench.querySelector<HTMLTextAreaElement>('.input')!;
  const runButton = workbench.querySelector<HTMLButtonElement>('.run')!;
  const sampleButton = workbench.querySelector<HTMLButtonElement>('.sample')!;
  const syncModeState = () => {
    const isDsl = mode.value === 'dsl';
    dialect.disabled = isDsl;
    input.placeholder = isDsl ? '输入 JSON DSL，例如包含 table、select、where、orderBy、limit 的对象' : '输入 SQL 或 Redis 命令';
    runButton.textContent = isDsl ? '解析 DSL' : '格式化';
    sampleButton.textContent = isDsl ? '载入 DSL 示例' : '载入示例';
  };
  sampleButton.addEventListener('click', (event) => {
    if (mode.value !== 'dsl') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (input.value && !confirm('载入 DSL 示例会覆盖当前输入，是否继续？')) return;
    input.value = dslSample;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    runButton.click();
  }, { capture: true });
  mode.addEventListener('change', () => {
    syncModeState();
    if (!input.value) input.value = mode.value === 'dsl' ? dslSample : formatSample;
    workbench.querySelector<HTMLButtonElement>('.run')?.click();
  });
  dialect.addEventListener('change', () => workbench.querySelector<HTMLButtonElement>('.run')?.click());
  indentMode.addEventListener('change', () => workbench.querySelector<HTMLButtonElement>('.run')?.click());
  syncModeState();
  const root = document.createElement('div');
  root.className = 'sql-tool-layout';
  root.append(guide, controls, workbench, resultPanel);
  return { element: root };
}

export const sqlPlugin: ToolPlugin = {
  definition: {
    route: '#/dev/sql',
    category: '数据库SQL辅助',
    title: 'SQL 解析与格式化',
    description: '格式化 SQL / Redis 命令，支持将 JSON DSL 和常见 Elasticsearch 查询 DSL 解析成 SQL',
    keywords: ['sql', 'mysql', 'clickhouse', 'doris', 'postgresql', 'redis', '格式化', 'dsl', 'elasticsearch'],
    aliases: ['sql formatter', 'redis command', 'query formatter', 'dsl to sql', 'es dsl'],
    icon: 'SQL',
    tags: ['数据库', '格式化', 'DSL', '高亮'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: sqlPage,
};
