import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'http://localhost:4322',
  vite: {
    server: {
      port: 4322,
    },
  },
});
