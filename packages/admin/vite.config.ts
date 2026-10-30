import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    // Keep SvelteKit's cookie API with its server build. Externalizing the bare
    // import resolves Astro's incompatible hoisted cookie major at prerender.
    noExternal: ['cookie'],
  },
  build: {
    sourcemap: true,
  },
  server: {
    allowedHosts: ['workpop'],
    proxy: {
      '/api': 'http://localhost:4321',
      '/uploads': 'http://localhost:4321',
    },
  },
});
