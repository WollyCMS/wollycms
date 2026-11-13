// Build the actual Svelte editors, then serve them with the admin's CSP.
// No API, credentials, production content, or persistent server data is used.
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import config from '../../svelte.config.js';

const result = await build({
  configFile: false,
  root: fileURLToPath(new URL('./fixture', import.meta.url)),
  plugins: [svelte({ configFile: false })],
  resolve: { alias: { $lib: fileURLToPath(new URL('../../src/lib', import.meta.url)) } },
  build: { write: false, minify: false },
  logLevel: 'error',
});
const assets = new Map(result.output.map((asset) => [
  `/${asset.fileName}`,
  asset.type === 'chunk' ? asset.code : asset.source,
]));
const keywords = new Set(['self', 'none', 'unsafe-inline', 'unsafe-eval']);
const policy = Object.entries(config.kit.csp.directives)
  .map(([name, values]) => `${name} ${values.map((v) => keywords.has(v) ? `'${v}'` : v).join(' ')}`)
  .join('; ');

createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1').pathname;
  res.setHeader('Content-Security-Policy', policy);
  if (path === '/image.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="gray"/></svg>');
    return;
  }
  const body = assets.get(path === '/' ? '/index.html' : path);
  if (body === undefined) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', path.endsWith('.js') ? 'application/javascript'
    : path.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(body);
}).listen(4399, '127.0.0.1');
