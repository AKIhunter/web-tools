import { describe, expect, it } from 'vitest';
import { formatDatabaseText, tokenizeDatabaseForHighlight } from '../src/tools/sql/sql-service';

describe('SQL service', () => {
  it('格式化 MySQL 风格 SELECT / JOIN / WHERE / GROUP BY', () => {
    const output = formatDatabaseText('select u.id,u.name,count(o.id) as total from users u left join orders o on u.id=o.user_id where u.status=1 and o.amount>10 group by u.id,u.name order by total desc limit 20;', 'mysql', 2);
    expect(output).toContain('SELECT');
    expect(output).toContain('\nFROM');
    expect(output).toContain('\n  LEFT JOIN');
    expect(output).toContain('\n    ON u.id = o.user_id');
    expect(output).toContain('\nWHERE');
    expect(output).toContain('\n    AND o.amount > 10');
    expect(output).toContain('\nGROUP BY');
    expect(output).toContain('\nORDER BY');
  });

  it('保留 ClickHouse / Doris 常见关键字并格式化', () => {
    const output = formatDatabaseText('select event_date,countIf(user_id>0) from events prewhere event_date>=toDate(\'2026-01-01\') group by event_date settings max_threads=8', 'clickhouse', 4);
    expect(output).toContain('PREWHERE');
    expect(output).toContain('COUNTIF(');
    expect(output).toContain('toDate(');
    expect(output).toContain('SETTINGS');
  });

  it('格式化 Redis 命令为命令加参数列表', () => {
    const output = formatDatabaseText('hset user:1 name "Aki" score 100 active true', 'redis', 2);
    expect(output).toBe('HSET\n  user:1\n  name\n  "Aki"\n  score\n  100\n  active\n  true');
  });

  it('自动识别 Redis 命令', () => {
    expect(formatDatabaseText('get user:1', 'auto', 2)).toBe('GET user:1');
  });

  it('生成高亮 token，区分关键字、函数、字符串和值', () => {
    const tokens = tokenizeDatabaseForHighlight('SELECT count(*) FROM users WHERE id = 1 AND name = \'Aki\'');
    expect(tokens).toContainEqual({ kind: 'keyword', value: 'SELECT' });
    expect(tokens).toContainEqual({ kind: 'function', value: 'COUNT' });
    expect(tokens).toContainEqual({ kind: 'number', value: '1' });
    expect(tokens).toContainEqual({ kind: 'string', value: '\'Aki\'' });
  });

  it('拒绝空输入和过大输入', () => {
    expect(() => formatDatabaseText('')).toThrow('请输入 SQL 或 Redis 命令');
    expect(() => formatDatabaseText('x'.repeat(1_000_001))).toThrow('文本超过 1 MB 限制');
  });
});
