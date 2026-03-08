/**
 * Build WollyCMS server for Cloudflare Workers.
 *
 * Bundles packages/server/src/worker.ts → packages/server/dist-worker/worker.js
 * using esbuild with Workers-compatible settings.
 *
 * Node-only packages (pg, better-sqlite3, sharp, etc.) are replaced with
 * empty stubs so the bundle is self-contained and wrangler doesn't try
 * to resolve them.
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Packages that only exist in Node.js and must be stubbed out for Workers.
// The WollyCMS code handles their absence via dynamic imports with try/catch.
const nodeOnlyPackages = [
  'better-sqlite3',
  'pg',
  'sharp',
  'dotenv',
  'dotenv/config',
  '@hono/node-server',
  '@hono/node-server/serve-static',
  '@aws-sdk/client-s3',
  'satori',
];

// Plugin that replaces Node-only imports with empty modules
const stubNodeModules = {
  name: 'stub-node-modules',
  setup(build) {
    const filter = new RegExp(
      '^(' + nodeOnlyPackages.map(p => p.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|') + ')$'
    );
    build.onResolve({ filter }, args => ({
      path: args.path,
      namespace: 'stub-node-modules',
    }));
    build.onLoad({ filter: /.*/, namespace: 'stub-node-modules' }, () => ({
      contents: 'export default {}; export {}',
      loader: 'js',
    }));
  },
};

await build({
  entryPoints: [resolve(root, 'packages/server/src/worker.ts')],
  outfile: resolve(root, 'packages/server/dist-worker/worker.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['workerd', 'worker', 'import'],
  // node:* builtins are available on Workers with nodejs_compat flag
  external: ['node:*'],
  plugins: [stubNodeModules],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  minify: false, // Keep readable for debugging
  sourcemap: true,
  logLevel: 'info',
});

console.log('Worker build complete: packages/server/dist-worker/worker.js');
