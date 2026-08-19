import { defineConfig } from 'vite';

export default defineConfig({
  // 使用相对资源路径，避免本地静态打开 dist 时 /assets 指向站点根目录导致样式丢失。
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
