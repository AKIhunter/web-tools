import { createWorkbench } from '../../components/workbench';
import type { PageResult, ToolPlugin } from '../../app/tool-plugin';
import { decryptText, digestText, encryptText, signHmac, verifyHmac } from './crypto-service';

function select(options: Array<[string, string]>): HTMLSelectElement {
  const element = document.createElement('select');
  options.forEach(([value, label]) => element.add(new Option(label, value)));
  return element;
}

function withControl(label: string, control: HTMLElement, child: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'tool-page';
  const controls = document.createElement('div');
  controls.className = 'parameters';
  const caption = document.createElement('label');
  caption.textContent = label;
  caption.append(control);
  controls.append(caption);
  wrap.append(controls, child);
  return wrap;
}

function digestPage(): PageResult {
  const algorithm = select([['SHA-256', 'SHA-256'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']]);
  const workbench = createWorkbench({
    sample: 'Web Toolbox',
    auto: true,
    canSwap: false,
    process: (input) => digestText(input, algorithm.value as 'SHA-256' | 'SHA-384' | 'SHA-512'),
  });
  return { element: withControl('摘要算法', algorithm, workbench) };
}

function hmacPage(): PageResult {
  const root = document.createElement('div');
  const secret = document.createElement('input');
  secret.type = 'password';
  secret.placeholder = '签名密钥（不会保存）';
  const mode = select([['sign', '生成签名'], ['verify', '验证签名（输入格式：正文\\n签名）']]);
  const workbench = createWorkbench({
    sample: '待签名的消息',
    canSwap: false,
    process: async (input) => {
      if (!secret.value) throw new Error('请输入签名密钥');
      if (mode.value === 'sign') return signHmac(input, secret.value);
      const split = input.lastIndexOf('\n');
      if (split < 0) throw new Error('最后一行应为签名');
      return (await verifyHmac(input.slice(0, split), secret.value, input.slice(split + 1))) ? '签名有效' : '签名无效';
    },
  });
  const parameters = document.createElement('div');
  parameters.className = 'parameters';
  parameters.append(mode, secret);
  root.append(parameters, workbench);
  return { element: root, cleanup: () => { secret.value = ''; } };
}

function aesPage(): PageResult {
  const root = document.createElement('div');
  const password = document.createElement('input');
  password.type = 'password';
  password.placeholder = '口令（不会保存）';
  const mode = select([['encrypt', '加密'], ['decrypt', '解密']]);
  const workbench = createWorkbench({
    sample: '只在浏览器内处理的明文',
    canSwap: false,
    runLabel: '执行高强度运算',
    process: (input) => mode.value === 'encrypt' ? encryptText(input, password.value) : decryptText(input, password.value),
  });
  const parameters = document.createElement('div');
  parameters.className = 'parameters';
  parameters.append(mode, password);
  root.append(parameters, workbench);
  return { element: root, cleanup: () => { password.value = ''; } };
}

export const digestPlugin: ToolPlugin = {
  definition: {
    route: '#/crypto/digest',
    category: '加密与安全',
    title: '安全摘要',
    description: 'SHA-256、SHA-384 与 SHA-512',
    keywords: ['sha', 'hash', '摘要'],
    aliases: ['hash', 'sha256', 'sha512'],
    icon: '#',
    tags: ['摘要', '校验'],
    privacyLevel: 'crypto-sensitive',
    featured: true,
  },
  render: digestPage,
};

export const hmacPlugin: ToolPlugin = {
  definition: {
    route: '#/crypto/hmac',
    category: '加密与安全',
    title: 'HMAC 签名',
    description: 'HMAC-SHA-256 签名与验证',
    keywords: ['hmac', '签名', '验证'],
    aliases: ['message authentication code'],
    icon: '签',
    tags: ['签名', '验证'],
    privacyLevel: 'crypto-sensitive',
  },
  render: hmacPage,
};

export const aesGcmPlugin: ToolPlugin = {
  definition: {
    route: '#/crypto/aes-gcm',
    category: '加密与安全',
    title: 'AES-GCM 加解密',
    description: 'PBKDF2 + AES-256-GCM 版本化密文',
    keywords: ['aes', '加密', '解密'],
    aliases: ['aes gcm', 'encrypt', 'decrypt'],
    icon: 'AES',
    tags: ['加密', '口令'],
    privacyLevel: 'crypto-sensitive',
  },
  render: aesPage,
};
