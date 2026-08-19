export type NoticeKind = 'success' | 'warning' | 'error' | 'info';

export function createNotice(message: string, kind: NoticeKind = 'info'): HTMLElement {
  const element = document.createElement('p');
  element.className = `notice ${kind}`;
  element.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  element.textContent = message;
  return element;
}
