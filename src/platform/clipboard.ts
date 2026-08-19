export async function copyText(text: string, fallbackTarget?: HTMLTextAreaElement): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  if (fallbackTarget) {
    fallbackTarget.focus();
    fallbackTarget.select();
  }
  return false;
}
