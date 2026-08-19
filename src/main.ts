import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import { AppShell } from './app/app-shell';
import { startRouter } from './app/router';
import { initTheme } from './app/theme';

initTheme();

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('应用挂载点不存在');

const shell = new AppShell(root);
startRouter((hash, unknown) => shell.render(hash, unknown));
