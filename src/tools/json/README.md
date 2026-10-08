# JSON 多段内容格式化

在“格式化”模式下，可直接粘贴连续的多个 JSON / JSON5 对象或数组。例如响应头与响应体：

```text
{'Server': 'volcclb', 'Content-Type': 'application/json'}
{"code": 200, "message": "成功", "data": []}
```

结果为标准 JSON 数组，按输入顺序保存每段内容：

```json
[
  {
    "Server": "volcclb",
    "Content-Type": "application/json"
  },
  {
    "code": 200,
    "message": "成功",
    "data": []
  }
]
```

## 支持范围

- 多段对象、数组及其混合；段间可以换行、空格、直接相邻，或以一个逗号、分号分隔。
- JSON5 的单引号、注释、未加引号的键和尾逗号。
- 原有单对象、单数组仍保持原来的顶层类型。
- 不合并各段字段，不展开内部 JSON 字符串，不改变布尔值、空值等数据类型。
- 无法识别的文字、括号不匹配、不完整片段仍报错，避免静默丢失内容。

这里支持的是 JSON / JSON5，不是任意 Python 表达式；例如 Python 的 `True`、`False`、`None` 不属于此次新增支持范围。

## 实现

`json-service.ts` 优先尝试完整 JSON、JSON5。失败后，`parseJsonSequence` 用括号栈和引号、转义、注释状态逐字符定位每段边界，再独立解析每段。只有所有内容完整且至少包含两段时，才返回数组，否则继续原有解析流程。

格式化和压缩共用 `processJson`，因此都支持此输入形式。“字符串转义”和“去除转义”仍是独立的文本操作。

`tests/json-service.test.ts` 包含完整响应头与响应体样例、各类分隔符、嵌套和转义字符串、注释、非法尾部以及原有行为的回归测试。
