import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { generatePassword, generateToken, generateUlid, generateUuidV4, TokenFormat } from './random-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
}

function uuidPage(): PageResult {
  const mode = select([['uuid', 'UUID v4'], ['ulid', 'ULID'], ['both', 'UUID + ULID']]);
  const count = document.createElement('input');
  count.type = 'number';
  count.min = '1';
  count.max = '100';
  count.value = '5';
  const workbench = createWorkbench({
    outputLabel: '标识符',
    canSwap: false,
    inputVisible: false,
    runLabel: '生成',
    process: () => {
      const total = Math.min(100, Math.max(1, Number.parseInt(count.value, 10) || 1));
      const rows = Array.from({ length: total }, () => {
        if (mode.value === 'uuid') return generateUuidV4();
        if (mode.value === 'ulid') return generateUlid();
        return `${generateUuidV4()}\t${generateUlid()}`;
      });
      return rows.join('\n');
    },
  });
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const countLabel = document.createElement('label');
  countLabel.textContent = '数量';
  countLabel.append(count);
  const modeLabel = document.createElement('label');
  modeLabel.textContent = '类型';
  modeLabel.append(mode);
  controls.append(modeLabel, countLabel);
  const root = document.createElement('div');
  root.append(controls, workbench);
  return { element: root };
}

function randomPage(): PageResult {
  const mode = select([['token', '随机 Token'], ['password', '随机密码']]);
  const format = select([['base64url', 'Base64URL'], ['hex', '十六进制'], ['numeric', '纯数字']]);
  const length = document.createElement('input');
  length.type = 'number';
  length.min = '1';
  length.max = '256';
  length.value = '32';
  const symbols = document.createElement('input');
  symbols.type = 'checkbox';
  const workbench = createWorkbench({
    outputLabel: '结果',
    canSwap: false,
    inputVisible: false,
    runLabel: '生成',
    process: () => {
      const size = Math.min(256, Math.max(1, Number.parseInt(length.value, 10) || 1));
      if (mode.value === 'password') {
        return generatePassword({ length: size, lowercase: true, uppercase: true, digits: true, symbols: symbols.checked });
      }
      return generateToken(size, format.value as TokenFormat);
    },
  });
  const updateMode = () => {
    format.disabled = mode.value === 'password';
    symbols.disabled = mode.value !== 'password';
  };
  mode.addEventListener('change', updateMode);
  updateMode();
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = '类型';
  modeLabel.append(mode);
  const lengthLabel = document.createElement('label');
  lengthLabel.textContent = '长度';
  lengthLabel.append(length);
  const formatLabel = document.createElement('label');
  formatLabel.textContent = 'Token 格式';
  formatLabel.append(format);
  const symbolsLabel = document.createElement('label');
  symbolsLabel.className = 'inline-control';
  symbolsLabel.append(symbols, document.createTextNode('包含符号'));
  controls.append(modeLabel, lengthLabel, formatLabel, symbolsLabel);
  const root = document.createElement('div');
  root.append(controls, workbench);
  return { element: root };
}

export const uuidPlugin: ToolPlugin = {
  definition: {
    route: '#/generator/uuid',
    category: '生成器',
    title: 'UUID / ULID 生成器',
    description: '生成 UUID v4、ULID 与批量标识符',
    keywords: ['uuid', 'ulid', 'id', '生成'],
    aliases: ['guid', 'unique id', 'identifier'],
    icon: 'ID',
    tags: ['标识符', '批量'],
    privacyLevel: 'local-only',
    featured: true,
  },
  render: uuidPage,
};

export const randomPlugin: ToolPlugin = {
  definition: {
    route: '#/generator/random',
    category: '生成器',
    title: '随机 Token / 密码',
    description: '生成随机 Token、十六进制串和可配置密码',
    keywords: ['token', 'password', '密码', '随机'],
    aliases: ['random token', 'password generator', 'secret'],
    icon: 'KEY',
    tags: ['随机', '密码', '密钥素材'],
    privacyLevel: 'crypto-sensitive',
    featured: true,
  },
  render: randomPage,
};
