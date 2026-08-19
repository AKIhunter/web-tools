export function createFileDrop(accept: string, onFile: (file: File) => void): HTMLElement {
  const label = document.createElement('label');
  label.className = 'drop-zone';
  label.tabIndex = 0;
  label.textContent = '点击选择或拖放文件';
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  label.addEventListener('dragover', (event) => {
    event.preventDefault();
    label.classList.add('dragging');
  });
  label.addEventListener('dragleave', () => label.classList.remove('dragging'));
  label.addEventListener('drop', (event) => {
    event.preventDefault();
    label.classList.remove('dragging');
    const file = event.dataTransfer?.files[0];
    if (file) onFile(file);
  });
  label.append(input);
  return label;
}
