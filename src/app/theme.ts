export type ThemePreference = 'system' | 'light' | 'dark';

const key = 'toolbox-theme';
const media = matchMedia('(prefers-color-scheme: dark)');

function valid(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function getThemePreference(): ThemePreference {
  const value = localStorage.getItem(key);
  return valid(value) ? value : 'system';
}

export function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themePreference = preference;
  const color = dark ? '#1d1d1f' : '#f5f5f7';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', color);
}

export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(key, preference);
  applyTheme(preference);
}

export function initTheme(): void {
  const preference = getThemePreference();
  applyTheme(preference);
  media.addEventListener('change', () => {
    if (getThemePreference() === 'system') applyTheme('system');
  });
}
