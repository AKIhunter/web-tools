export type NoticeKind = 'success' | 'warning' | 'error' | 'info';

export function setNotice(element: HTMLElement, message = '', kind: NoticeKind = 'info'): void {
  element.className = `notice alert ${kind}`;
  element.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  element.setAttribute('aria-live', 'polite');
  element.textContent = message;
}

export function createNotice(message = '', kind: NoticeKind = 'info'): HTMLElement {
  const element = document.createElement('p');
  setNotice(element, message, kind);
  return element;
}
