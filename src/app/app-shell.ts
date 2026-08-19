import { renderToolPage } from './tool-pages';
import { categories, findTool, searchTools, tools } from './tool-registry';
import { getThemePreference, setThemePreference, type ThemePreference } from './theme';

function link(route: string, title: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = route;
  anchor.textContent = title;
  return anchor;
}

export class AppShell {
  private main: HTMLElement;
  private searchResults: HTMLElement;
  private cleanup?: () => void;

  constructor(private root: HTMLElement) {
    root.innerHTML = `
      <header class="topbar"><button class="menu" type="button" aria-label="打开导航">☰</button><a class="brand" href="#/">Web Toolbox</a><label class="search"><span class="sr-only">搜索工具</span><input type="search" placeholder="搜索工具…" autocomplete="off"></label><button class="theme" type="button"></button></header>
      <div class="shell"><aside class="sidebar" aria-label="工具导航"></aside><main id="main" tabindex="-1"></main></div>
      <div class="search-results" hidden></div><div class="toast" role="status" aria-live="polite"></div>`;
    this.main = root.querySelector('main')!;
    this.searchResults = root.querySelector('.search-results')!;
    this.renderNavigation();
    this.bindHeader();
    this.updateThemeLabel();
  }

  private renderNavigation(): void {
    const sidebar = this.root.querySelector<HTMLElement>('.sidebar')!;
    categories.forEach((category) => {
      const group = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = category;
      group.append(heading, ...tools.filter((tool) => tool.category === category).map((tool) => link(tool.route, tool.title)));
      sidebar.append(group);
    });
  }

  private bindHeader(): void {
    const sidebar = this.root.querySelector<HTMLElement>('.sidebar')!;
    this.root.querySelector('.menu')!.addEventListener('click', () => sidebar.classList.toggle('open'));
    sidebar.addEventListener('click', () => sidebar.classList.remove('open'));
    const theme = this.root.querySelector<HTMLButtonElement>('.theme')!;
    theme.addEventListener('click', () => {
      const order: ThemePreference[] = ['system', 'light', 'dark'];
      const next = order[(order.indexOf(getThemePreference()) + 1) % order.length];
      setThemePreference(next);
      this.updateThemeLabel();
    });
    const search = this.root.querySelector<HTMLInputElement>('.search input')!;
    search.addEventListener('input', () => this.showSearch(search.value));
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        search.value = '';
        this.showSearch('');
      }
    });
  }

  private updateThemeLabel(): void {
    const labels: Record<ThemePreference, string> = { system: '主题：跟随系统', light: '主题：浅色', dark: '主题：深色' };
    this.root.querySelector<HTMLButtonElement>('.theme')!.textContent = labels[getThemePreference()];
  }

  private showSearch(query: string): void {
    this.searchResults.replaceChildren();
    this.searchResults.hidden = !query;
    if (!query) return;
    const matches = searchTools(query);
    if (!matches.length) {
      this.searchResults.textContent = '没有匹配的工具';
      return;
    }
    matches.forEach((tool) => {
      const item = link(tool.route, tool.title);
      item.addEventListener('click', () => { this.searchResults.hidden = true; });
      this.searchResults.append(item);
    });
  }

  render(hash: string, unknown: boolean): void {
    this.cleanup?.();
    this.cleanup = undefined;
    this.main.replaceChildren();
    if (hash === '#/') {
      this.renderHome(unknown);
      document.title = 'Web Toolbox · 本地浏览器工具';
    } else {
      const tool = findTool(hash);
      if (!tool) return;
      const header = document.createElement('header');
      header.className = 'page-header';
      const title = document.createElement('h1');
      title.textContent = tool.title;
      const description = document.createElement('p');
      description.textContent = tool.description;
      const badge = document.createElement('span');
      badge.className = 'privacy-badge';
      badge.textContent = '仅在本机处理';
      header.append(title, description, badge);
      const page = renderToolPage(hash);
      this.cleanup = page.cleanup;
      this.main.append(header, page.element);
      document.title = `${tool.title} · Web Toolbox`;
    }
    this.root.querySelectorAll('.sidebar a').forEach((item) => item.classList.toggle('active', item.getAttribute('href') === hash));
    this.main.focus();
  }

  private renderHome(unknown: boolean): void {
    const hero = document.createElement('section');
    hero.className = 'hero';
    hero.innerHTML = '<span class="eyebrow">隐私优先 · 零上传</span><h1>轻量工具，留在浏览器里。</h1><p>十个高频工具覆盖六类任务。无账号、无广告、无历史记录，输入不会离开你的设备。</p>';
    if (unknown) {
      const notice = document.createElement('p');
      notice.className = 'notice warning';
      notice.textContent = '未找到该工具，已返回首页。';
      hero.append(notice);
    }
    const favorites = document.createElement('section');
    favorites.className = 'favorites';
    const heading = document.createElement('h2');
    heading.textContent = '常用工具';
    favorites.append(heading, ...tools.slice(0, 4).map((tool) => {
      const item = link(tool.route, tool.title);
      item.className = 'favorite-card';
      const copy = document.createElement('small');
      copy.textContent = tool.description;
      item.append(copy);
      return item;
    }));
    const grid = document.createElement('section');
    grid.className = 'category-grid';
    categories.forEach((category) => {
      const card = document.createElement('article');
      const title = document.createElement('h2');
      title.textContent = category;
      card.append(title, ...tools.filter((tool) => tool.category === category).map((tool) => link(tool.route, tool.title)));
      grid.append(card);
    });
    this.main.append(hero, favorites, grid);
  }
}
