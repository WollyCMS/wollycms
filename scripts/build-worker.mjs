/**
 * Build WollyCMS server for Cloudflare Workers.
 *
 * Bundles packages/server/src/worker.ts → packages/server/dist-worker/worker.js
 * using esbuild with Workers-compatible settings.
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await build({
  entryPoints: [resolve(root, 'packages/server/src/worker.ts')],
  outfile: resolve(root, 'packages/server/dist-worker/worker.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['workerd', 'worker', 'import'],
  // Mark Node.js built-ins and native modules as external —
  // Workers doesn't have them but the code handles missing modules gracefully
  // via dynamic imports with try/catch.
  external: [
    'node:*',
    'better-sqlite3',
    'pg',
    'sharp',
    'dotenv',
    'dotenv/config',
    '@hono/node-server',
    '@hono/node-server/serve-static',
    '@aws-sdk/client-s3',
    'satori',
  ],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  minify: false, // Keep readable for debugging
  sourcemap: true,
  logLevel: 'info',
});

console.log('Worker build complete: packages/server/dist-worker/worker.js');
