export type UrlPart = {
  href: string;
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  parameters: Array<[string, string]>;
};

export function encodeUrlComponent(input: string): string {
  return encodeURIComponent(input);
}

export function decodeUrlComponent(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    throw new Error('输入包含无效的百分号编码');
  }
}

export function parseUrl(input: string): UrlPart {
  try {
    const url = new URL(input);
    return {
      href: url.href,
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      hash: url.hash,
      parameters: [...url.searchParams.entries()],
    };
  } catch {
    throw new Error('请输入包含协议的有效完整 URL');
  }
}

export function parseFormQuery(input: string): Array<[string, string]> {
  return [...new URLSearchParams(input.startsWith('?') ? input.slice(1) : input).entries()];
}

export function buildFormQuery(entries: Array<[string, string]>): string {
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, value));
  return params.toString();
}
