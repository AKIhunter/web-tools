import { renderToolPage } from './tool-pages';
import { categories, findTool, searchTools, tools, type ToolDefinition } from './tool-registry';
import { getThemePreference, setThemePreference, type ThemePreference } from './theme';

const FAVORITES_KEY = 'web-toolbox:favorites:v1';
const RECENTS_KEY = 'web-toolbox:recents:v1';
const MAX_FAVORITES = 12;
const MAX_RECENTS = 6;

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
  private searchActiveIndex = -1;
  private restoreSidebarFocus?: HTMLElement;

  constructor(private root: HTMLElement) {
    root.innerHTML = `
      <header class="topbar"><button class="menu" type="button" aria-label="打开导航">☰</button><a class="brand" href="#/">Web Toolbox</a><label class="search"><span class="sr-only">搜索工具</span><input type="search" placeholder="搜索工具…" autocomplete="off"></label><button class="theme" type="button"></button></header>
      <div class="shell"><aside class="sidebar" aria-label="工具导航"></aside><button class="sidebar-toggle" type="button" aria-label="隐藏目录" aria-expanded="true">‹</button><main id="main" tabindex="-1"></main></div>
      <div class="sidebar-backdrop" hidden></div><div class="search-results" hidden></div><div class="toast" role="status" aria-live="polite"></div>`;
    this.main = root.querySelector('main')!;
    this.searchResults = root.querySelector('.search-results')!;
    this.renderNavigation();
    this.bindHeader();
    this.updateThemeLabel();
  }

  private renderNavigation(): void {
    const sidebar = this.root.querySelector<HTMLElement>('.sidebar')!;
    sidebar.replaceChildren();
    categories.forEach((category) => {
      const categoryTools = this.toolsInCategory(category);
      if (!categoryTools.length) return;
      const group = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = category;
      group.append(heading, ...categoryTools.map((tool) => link(tool.route, tool.title)));
      sidebar.append(group);
    });
  }

  private bindHeader(): void {
    const sidebar = this.root.querySelector<HTMLElement>('.sidebar')!;
    const backdrop = this.root.querySelector<HTMLElement>('.sidebar-backdrop')!;
    const menu = this.root.querySelector<HTMLButtonElement>('.menu')!;
    const shell = this.root.querySelector<HTMLElement>('.shell')!;
    const sidebarToggle = this.root.querySelector<HTMLButtonElement>('.sidebar-toggle')!;
    const setSidebarCollapsed = (collapsed: boolean) => {
      shell.classList.toggle('sidebar-collapsed', collapsed);
      sidebarToggle.textContent = collapsed ? '›' : '‹';
      sidebarToggle.setAttribute('aria-label', collapsed ? '显示目录' : '隐藏目录');
      sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    };
    sidebarToggle.addEventListener('click', () => setSidebarCollapsed(!shell.classList.contains('sidebar-collapsed')));
    const closeSidebar = (restoreFocus = true) => {
      sidebar.classList.remove('open');
      backdrop.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
      if (restoreFocus) (this.restoreSidebarFocus ?? menu).focus();
      this.restoreSidebarFocus = undefined;
    };
    const openSidebar = () => {
      this.restoreSidebarFocus = document.activeElement instanceof HTMLElement ? document.activeElement : menu;
      sidebar.classList.add('open');
      backdrop.hidden = false;
      menu.setAttribute('aria-expanded', 'true');
      sidebar.querySelector<HTMLAnchorElement>('a')?.focus();
    };
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    sidebar.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a')) closeSidebar(false);
    });
    backdrop.addEventListener('click', () => closeSidebar());
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('open')) closeSidebar();
    });
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
        search.blur();
        return;
      }
      if (!search.value.trim()) return;
      const items = Array.from(this.searchResults.querySelectorAll<HTMLAnchorElement>('a[data-search-item]'));
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!items.length) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        this.searchActiveIndex = (this.searchActiveIndex + delta + items.length) % items.length;
        this.updateSearchActive(items);
      }
      if (event.key === 'Enter') {
        if (items.length) {
          event.preventDefault();
          const target = items[Math.max(0, this.searchActiveIndex)];
          target.click();
        }
      }
    });
  }

  private updateThemeLabel(): void {
    const labels: Record<ThemePreference, string> = { system: '主题：跟随系统', light: '主题：浅色', dark: '主题：深色' };
    this.root.querySelector<HTMLButtonElement>('.theme')!.textContent = labels[getThemePreference()];
  }

  private showSearch(query: string): void {
    this.searchResults.replaceChildren();
    this.searchActiveIndex = -1;
    this.searchResults.hidden = !query;
    if (!query) return;
    const matches = searchTools(query);
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      const title = document.createElement('strong');
      title.textContent = '没有匹配的工具';
      const suggestion = document.createElement('span');
      suggestion.textContent = '试试 JSON、Base64、时间戳、UUID、密码或图片加工。';
      empty.append(title, suggestion);
      this.searchResults.append(empty);
      return;
    }
    matches.forEach((tool) => {
      const item = link(tool.route, tool.title);
      item.dataset.searchItem = 'true';
      const title = document.createElement('strong');
      title.textContent = tool.title;
      const description = document.createElement('span');
      description.textContent = `${tool.category} · ${tool.description}`;
      item.replaceChildren(title, description);
      item.addEventListener('click', () => { this.searchResults.hidden = true; });
      this.searchResults.append(item);
    });
  }

  private updateSearchActive(items: HTMLAnchorElement[]): void {
    items.forEach((item, index) => {
      const active = index === this.searchActiveIndex;
      item.classList.toggle('active', active);
      if (active) item.scrollIntoView({ block: 'nearest' });
    });
  }

  render(hash: string, unknown: boolean): void {
    this.cleanup?.();
    this.cleanup = undefined;
    this.searchResults.hidden = true;
    this.searchActiveIndex = -1;
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
      badge.textContent = this.privacyLabel(tool);
      const favorite = document.createElement('button');
      favorite.className = 'favorite-toggle';
      favorite.type = 'button';
      favorite.textContent = this.isFavorite(hash) ? '已收藏' : '收藏';
      favorite.setAttribute('aria-pressed', String(this.isFavorite(hash)));
      favorite.addEventListener('click', () => {
        this.toggleFavorite(hash);
        favorite.textContent = this.isFavorite(hash) ? '已收藏' : '收藏';
        favorite.setAttribute('aria-pressed', String(this.isFavorite(hash)));
        this.renderNavigation();
      });
      header.append(title, description, badge, favorite);
      const page = renderToolPage(hash);
      this.cleanup = page.cleanup;
      this.main.append(header, page.element);
      document.title = `${tool.title} · Web Toolbox`;
      this.recordRecent(hash);
    }
    this.root.querySelectorAll('.sidebar a').forEach((item) => item.classList.toggle('active', item.getAttribute('href') === hash));
    this.main.focus();
  }

  private renderHome(unknown: boolean): void {
    const hero = document.createElement('section');
    hero.className = 'hero';
    hero.innerHTML = '<span class="eyebrow">隐私优先 · 零上传</span><h1>轻量工具，留在浏览器里。</h1><p>十二个高频工具覆盖六个已开放分类。无账号、无广告，收藏与最近使用只保存工具入口，不保存输入内容。</p>';
    if (unknown) {
      const notice = document.createElement('p');
      notice.className = 'notice warning alert';
      notice.textContent = '未找到该工具，已返回首页。';
      hero.append(notice);
    }
    const featured = this.toolSection('推荐工具', tools.filter((tool) => tool.featured));
    const favorites = this.toolSection('我的收藏', this.routesToTools(this.readRoutes(FAVORITES_KEY)), '还没有收藏。打开工具页后点击“收藏”即可固定入口。');
    const recents = this.toolSection('最近使用', this.routesToTools(this.readRoutes(RECENTS_KEY)), '还没有最近使用记录。这里只保存工具路径，不保存输入。');
    const grid = document.createElement('section');
    grid.className = 'category-grid';
    categories.forEach((category) => {
      const categoryTools = this.toolsInCategory(category);
      if (!categoryTools.length) return;
      const card = document.createElement('article');
      const title = document.createElement('h2');
      title.textContent = category;
      const summary = document.createElement('p');
      summary.textContent = `${categoryTools.length} 个工具`;
      card.append(title, summary, ...categoryTools.map((tool) => link(tool.route, tool.title)));
      grid.append(card);
    });
    this.main.append(hero, featured, favorites, recents, grid);
  }

  private toolSection(titleText: string, sectionTools: ToolDefinition[], emptyText?: string): HTMLElement {
    const section = document.createElement('section');
    section.className = 'tool-strip';
    const heading = document.createElement('h2');
    heading.textContent = titleText;
    section.append(heading);
    if (!sectionTools.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-card';
      empty.textContent = emptyText ?? '暂无工具';
      section.append(empty);
      return section;
    }
    section.append(...sectionTools.map((tool) => {
      const item = link(tool.route, tool.title);
      item.className = 'favorite-card';
      const icon = document.createElement('span');
      icon.className = 'tool-icon';
      icon.textContent = tool.icon ?? '•';
      const copy = document.createElement('small');
      copy.textContent = tool.description;
      const tags = document.createElement('span');
      tags.className = 'tool-tags';
      tags.textContent = (tool.tags ?? []).slice(0, 2).join(' · ');
      item.replaceChildren(icon, document.createTextNode(tool.title), copy, tags);
      return item;
    }));
    return section;
  }

  private privacyLabel(tool: ToolDefinition): string {
    if (tool.privacyLevel === 'crypto-sensitive') return '敏感数据仅在本机处理';
    if (tool.privacyLevel === 'local-file') return '文件仅在本机处理';
    return '仅在本机处理';
  }

  private toolsInCategory(category: string): ToolDefinition[] {
    return tools.filter((tool) => tool.category === category);
  }

  private readRoutes(key: string): string[] {
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown;
      return Array.isArray(value) ? value.filter((route): route is string => typeof route === 'string' && Boolean(findTool(route))) : [];
    } catch {
      return [];
    }
  }

  private writeRoutes(key: string, routes: string[], limit: number): void {
    try {
      const clean = routes.filter((route, index) => Boolean(findTool(route)) && routes.indexOf(route) === index).slice(0, limit);
      localStorage.setItem(key, JSON.stringify(clean));
    } catch {
      // 存储不可用时保持工具功能可用；收藏/最近使用仅作为增强体验。
    }
  }

  private routesToTools(routes: string[]): ToolDefinition[] {
    return routes.map((route) => findTool(route)).filter((tool): tool is ToolDefinition => Boolean(tool));
  }

  private isFavorite(route: string): boolean {
    return this.readRoutes(FAVORITES_KEY).includes(route);
  }

  private toggleFavorite(route: string): void {
    const current = this.readRoutes(FAVORITES_KEY);
    this.writeRoutes(FAVORITES_KEY, current.includes(route) ? current.filter((item) => item !== route) : [route, ...current], MAX_FAVORITES);
  }

  private recordRecent(route: string): void {
    this.writeRoutes(RECENTS_KEY, [route, ...this.readRoutes(RECENTS_KEY).filter((item) => item !== route)], MAX_RECENTS);
  }
}
