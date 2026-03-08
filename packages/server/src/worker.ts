/**
 * Cloudflare Workers entry point for WollyCMS.
 *
 * Serves the Hono API and admin UI static assets.
 * Requires D1 database binding (DB) and R2 bucket binding (R2_BUCKET).
 */
import { initEnvFromBindings } from './env.js';
import { initD1 } from './db/index.js';
import { initR2Storage } from './media/storage.js';

// Re-export the Hono app as a Workers module
// We import app lazily after env is initialized
let appModule: typeof import('./app.js') | null = null;

interface WorkerEnv {
  DB?: unknown;
  R2_BUCKET?: unknown;
  R2_PUBLIC_URL?: string;
  [key: string]: unknown;
}

export default {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async fetch(request: Request, workerEnv: WorkerEnv, ctx: any): Promise<Response> {
    // Initialize env from Workers bindings on first request
    initEnvFromBindings(workerEnv);

    // Initialize D1 if binding exists
    if (workerEnv.DB) {
      await initD1(workerEnv.DB);
    }

    // Initialize R2 storage if binding exists
    if (workerEnv.R2_BUCKET) {
      initR2Storage(workerEnv.R2_BUCKET, workerEnv.R2_PUBLIC_URL);
    }

    // Lazy-load app after env is ready
    if (!appModule) {
      appModule = await import('./app.js');
    }

    return appModule.default.fetch(request, workerEnv, ctx);
  },
};
