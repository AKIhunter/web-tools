const stored = localStorage.getItem('toolbox-theme');
const preference = stored === 'light' || stored === 'dark' ? stored : 'system';
const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
document.documentElement.dataset.themePreference = preference;
