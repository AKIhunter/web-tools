import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { formatJwtReport, parseJwt } from './jwt-service';

function jwtPage(): PageResult {
  const sample = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IldlYiBUb29sYm94IiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjQxMDI0NDQ4MDB9',
    'signature',
  ].join('.');
  const workbench = createWorkbench({
    inputLabel: 'JWT',
    outputLabel: '解析结果',
    placeholder: '粘贴 JWT，支持 Bearer 前缀',
    sample,
    auto: true,
    process: (input) => formatJwtReport(parseJwt(input)),
  });
  const root = document.createElement('div');
  root.append(workbench);
  return { element: root };
}

export const jwtPlugin: ToolPlugin = {
  definition: {
    route: '#/codec/jwt',
    category: '编码解码',
    title: 'JWT 解析器',
    description: '本地解码 Header、Payload 与常见时间声明',
    keywords: ['jwt', 'token', 'claims', 'payload'],
    aliases: ['json web token', 'bearer token', 'access token'],
    icon: 'JWT',
    tags: ['Token', 'Claims'],
    privacyLevel: 'crypto-sensitive',
    featured: true,
  },
  render: jwtPage,
};
