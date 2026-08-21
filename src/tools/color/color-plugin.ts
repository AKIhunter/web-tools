import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { formatColorReport } from './color-service';

function colorPage(): PageResult {
  const workbench = createWorkbench({
    inputLabel: '颜色值',
    outputLabel: '转换结果',
    placeholder: '#0071e3、rgb(0, 113, 227)、hsl(210, 100%, 45%)',
    sample: '#0071e3',
    auto: true,
    process: (input) => formatColorReport(input),
  });
  const root = document.createElement('div');
  root.append(workbench);
  return { element: root };
}

export const colorPlugin: ToolPlugin = {
  definition: {
    route: '#/color',
    category: '图片与颜色',
    title: '颜色转换器',
    description: 'HEX、RGB、RGBA、HSL 与 HSLA 格式互转',
    keywords: ['color', 'hex', 'rgb', 'hsl', '颜色'],
    aliases: ['颜色转换', 'css color', 'hex to rgb', 'rgb to hsl'],
    icon: '#',
    tags: ['CSS', '颜色'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: colorPage,
};
