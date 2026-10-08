import { describe, expect, it } from 'vitest';
import { escapeJsonString, processJson, unescapeJsonString } from '../src/tools/json/json-service';

describe('JSON service', () => {
  it('格式化、压缩并统计嵌套结构', () => {
    const formatted = processJson('{"b":[1,{"c":"中文"}],"a":true}', 2, true);
    expect(formatted.output).toContain('"a": true');
    expect(formatted.output.indexOf('"a"')).toBeLessThan(formatted.output.indexOf('"b"'));
    expect(formatted.stats).toMatchObject({ topLevelType: 'object', items: 2, maxDepth: 3 });
    expect(processJson(formatted.output, 0).output).toBe('{"a":true,"b":[1,{"c":"中文"}]}');
  });

  it('拒绝空输入与无法识别的内容', () => {
    expect(() => processJson('')).toThrow('请输入');
    expect(() => processJson('这不是 JSON 或 KV')).toThrow('JSON 或 KV 格式无效');
  });

  it('兼容常见的宽松 JSON 格式', () => {
    const result = processJson(`{
      // 允许注释、未加引号的 key、单引号和尾逗号
      name: '工具箱',
      enabled: true,
    }`);
    expect(result.value).toEqual({ name: '工具箱', enabled: true });
    expect(result.output).toContain('"name": "工具箱"');
  });

  it('兼容无外层花括号的 KV 结构', () => {
    const result = processJson('name=工具箱\ncount: 2\nenabled=true\ntags=[\'本地\', \'JSON\']');
    expect(result.value).toEqual({
      name: '工具箱',
      count: 2,
      enabled: true,
      tags: ['本地', 'JSON'],
    });
  });

  it('处理转义并提示超安全整数', () => {
    expect(unescapeJsonString(escapeJsonString('a\n"中"'))).toBe('a\n"中"');
    expect(unescapeJsonString('{"name":"工具箱"}')).toBe('{"name":"工具箱"}');
    expect(processJson('{"id":9007199254740993}').stats.unsafeIntegers).toBe(true);
  });

  it('格式化带转义符的 JSON 内容', () => {
    const escaped = escapeJsonString('{"name":"工具箱","meta":{"safe":true}}');
    expect(processJson(escaped).output).toBe(`{
  "name": "工具箱",
  "meta": {
    "safe": true
  }
}`);
    expect(processJson(`"${escaped}"`).value).toEqual({
      name: '工具箱',
      meta: { safe: true },
    });
  });

  it('解析外层转义且字段内包含二次转义 JSON 的内容', () => {
    const input = String.raw`{\"events\":[{\"event\":\"page_view\",\"local_time_ms\":1790561407110,\"params\":\"{\\\"page_name\\\":\\\"有客币\\\"}\"}],\"header\":{\"app_id\":10000069,\"app_name\":\"AI_clue\",\"client_ip\":\"122.96.25.202\",\"custom\":\"{\\\"app_business_type\\\":\\\"\\\",\\\"app_phone_number\\\":\\\"13776654690\\\",\\\"app_upload_system\\\":\\\"有客APP\\\"}\",\"device_model\":\"EMA-AL00U\",\"os_name\":\"harmonyos\",\"os_version\":\"7.0.0.105\"},\"user\":{\"user_unique_id\":\"13776654690\",\"user_unique_id_type\":\"phone\"}}`;
    const result = processJson(input);
    const value = result.value as {
      events: Array<{ params: string }>;
      header: { custom: string };
    };

    expect(JSON.parse(value.events[0].params)).toEqual({ page_name: '有客币' });
    expect(JSON.parse(value.header.custom)).toEqual({
      app_business_type: '',
      app_phone_number: '13776654690',
      app_upload_system: '有客APP',
    });
    expect(result.output).toContain('"event": "page_view"');
  });

  it('逐层解析字符串包裹的转义日志 JSON', () => {
    const requestBody = String.raw`[{\"events\":[{\"event\":\"page_view\",\"params\":\"{\\\"page_name\\\":\\\"有客币\\\"}\"}],\"header\":{\"custom\":\"{\\\"app_upload_system\\\":\\\"有客APP\\\"}\"}}]`;
    const responseBody = String.raw`{\"Type\":\"Web/Mp(MiniProgram)\",\"e\":0,\"message\":\"success\"}`;
    const log = JSON.stringify({ request_body: requestBody, response_body: responseBody });
    const result = processJson(JSON.stringify(log));
    const value = result.value as { request_body: string; response_body: string };

    expect(JSON.parse(unescapeJsonString(value.request_body))[0].events[0].event).toBe('page_view');
    expect(JSON.parse(unescapeJsonString(value.response_body))).toEqual({
      Type: 'Web/Mp(MiniProgram)',
      e: 0,
      message: 'success',
    });
    expect(result.output).toContain('"request_body"');
  });

  it('复现混合转义且缺少前缀的日志片段', () => {
    const input = String.raw`{\"events\":[{\"event\":\"page_view\",\"local_time_ms\":1790561407110,\"params\":\"{\\\"page_name\\\":\\\"有客币\\\"}\"}],\"header\":{\"app_id\":10000069,\"app_name\":\"AI_clue\",\"client_ip\":\"122.96.25.202\",\"custom\":\"{\\\"app_business_type\\\":\\\"\\\",\\\"app_phone_number\\\":\\\"13776654690\\\",\\\"app_upload_system\\\":\\\"有客APP\\\"}\",\"device_model\":\"EMA-AL00U\",\"os_name\":\"harmonyos\",\"os_version\":\"7.0.0.105\"},\"user\":{\"user_unique_id\":\"13776654690\",\"user_unique_id_type\":\"phone\"}}]", "response_body": "{\"Type\":\"Web/Mp(MiniProgram)\",\"e\":0,\"message\":\"success\",\"sc\":1,\"server_time\":1790561407,\"tc\":1}"}`;
    const value = processJson(input).value as { request_body: string; response_body: string };

    expect(JSON.parse(value.request_body)[0].events[0].params).toBe('{"page_name":"有客币"}');
    expect(JSON.parse(value.response_body)).toMatchObject({
      Type: 'Web/Mp(MiniProgram)',
      message: 'success',
    });
  });

  it('复现截图中 request_body 内容未转义且缺少字段名前缀的日志片段', () => {
    const input = String.raw`[{"events":[{"event":"page_view","local_time_ms":1790561407110,"params":"{\"page_name\":\"有客币\"}"}],"header":{"app_id":10000069,"app_name":"AI_clue","client_ip":"122.96.25.202","custom":"{\"app_business_type\":\"\",\"app_phone_number\":\"13776654690\",\"app_upload_system\":\"有客APP\"}","device_model":"EMA-AL00U","os_name":"harmonyos","os_version":"7.0.0.105"},"user":{"user_unique_id":"13776654690","user_unique_id_type":"phone"}}]", "response_body": "{\"Type\":\"Web/Mp(MiniProgram)\",\"e\":0,\"message\":\"success\",\"sc\":1,\"server_time\":1790561407,\"tc\":1}"}`;
    const result = processJson(input);
    const value = result.value as { request_body: string; response_body: string };
    const requestBody = JSON.parse(value.request_body);

    expect(requestBody[0].events[0]).toMatchObject({
      event: 'page_view',
      params: '{"page_name":"有客币"}',
    });
    expect(requestBody[0].header.custom).toBe('{"app_business_type":"","app_phone_number":"13776654690","app_upload_system":"有客APP"}');
    expect(JSON.parse(value.response_body)).toMatchObject({
      Type: 'Web/Mp(MiniProgram)',
      message: 'success',
    });
    expect(result.output).toContain('"request_body"');
    expect(result.output).toContain('"response_body"');
    expect(result.output).toContain('page_view');
  });
});
