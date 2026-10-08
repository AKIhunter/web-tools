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

  it('将响应头和响应体原文按顺序格式化为数组且不丢失数据', () => {
    const headers = `{'Server': 'volcclb', 'Date': 'Thu, 08 Oct 2026 06:27:30 GMT', 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked', 'Connection': 'keep-alive', 'Vary': 'Accept-Encoding, Accept-Encoding, Cookie, Accept-Encoding', 'X-M-Request-Start': 't=1791440850.964'}`;
    const body = `{"code": 200, "message": "成功", "data": [{"id": 1000, "name": "test", "description": "", "status": 1, "is_all_users": true, "org": {"id": 1, "name": "默认集团", "creator": {"subject_id": 0, "origin_id": "", "subject_type": 0, "name": ""}}, "subjects": [{"type": "user", "data": {"id": 1, "super_id": "", "account": "admin", "username": "admin", "status": 1, "is_superuser": true, "email": "", "mobile_number": "", "roles": null, "groups": null, "departments": null}}, {"type": "user", "data": {"id": 2, "super_id": "", "account": "user01", "username": "秋子", "status": 1, "is_superuser": false, "email": "851911696@qq.com", "mobile_number": "", "roles": null, "groups": null, "departments": null}}], "managers": [], "subject_range": null, "dynamic_subjects": {"enabled": false}, "contain_dept_as_member": false}]}`;
    const result = processJson(`${headers}\n${body}`);
    expect(result.value).toEqual([processJson(headers).value, JSON.parse(body)]);
    expect(JSON.parse(result.output)).toEqual(result.value);
    expect(result.output).toContain('\n  {');
    expect(result.stats).toMatchObject({ topLevelType: 'array', items: 2 });
  });

  it.each(['\n', '\r\n\r\n', ' ', '', ', ', ';\n'])('兼容以 %j 分隔的多段嵌套结构', (separator) => {
    const first = { params: '{"text":"}][{","quote":"\\""}', path: 'C:\\test\\', items: [true, null] };
    const second = [{ name: '中文', enabled: false }];
    const input = JSON.stringify(first) + separator + JSON.stringify(second);
    expect(processJson(input).value).toEqual([first, second]);
    expect(processJson(input, 0).output).toBe(JSON.stringify([first, second]));
  });

  it('忽略字符串及 JSON5 注释中的括号，保留单引号字符串内容', () => {
    const input = String.raw`/* }[ */ {text: 'it\'s }{', inner: {enabled: true}, /* ][ */ }
// }{
[{value: "// [", other: '/* } */'}] // 尾部注释`;
    expect(processJson(input).value).toEqual([
      { text: "it's }{", inner: { enabled: true } },
      [{ value: '// [', other: '/* } */' }],
    ]);
  });

  it.each(['{}\n{"a":', '{} junk {}', '{}\n[}', '{}\n{"x":"unfinished}', '{} /* unfinished', '{bad:}\n{}', '{},,{}', '{};'])(
    '多段解析不静默丢弃无效内容：%s', (input) => {
      expect(() => processJson(input)).toThrow('JSON 或 KV 格式无效');
    },
  );

  it('单对象和单数组保持原有顶层类型', () => {
    expect(processJson('{name: "test"}').value).toEqual({ name: 'test' });
    expect(processJson('[{name: "test"}]').value).toEqual([{ name: 'test' }]);
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
