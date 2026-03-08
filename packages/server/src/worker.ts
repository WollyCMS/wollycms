/**
 * Cloudflare Workers entry point for WollyCMS.
 *
 * Only handles API routes (/api/*). Admin UI static assets and SPA
 * routing are handled by the Cloudflare asset layer automatically
 * (configured via run_worker_first = ["/api/*"] in wrangler.toml).
 *
 * All module imports are dynamic (inside fetch handler) to ensure
 * Workers bindings are available before any module initialization runs.
 */

interface WorkerEnv {
  DB?: unknown;
  R2_BUCKET?: unknown;
  R2_PUBLIC_URL?: string;
  [key: string]: unknown;
}

let initialized = false;

export default {
  async fetch(request: Request, workerEnv: WorkerEnv, ctx: any): Promise<Response> {
    try {
      if (!initialized) {
        // Initialize env FIRST from Workers bindings, before any other module loads
        const { initEnvFromBindings } = await import('./env.js');
        initEnvFromBindings(workerEnv);

        // Now initialize D1 (env.DATABASE_URL is set, so getDialect() returns 'd1')
        if (workerEnv.DB) {
          const { initD1 } = await import('./db/index.js');
          await initD1(workerEnv.DB);
        }

        // Initialize R2 storage
        if (workerEnv.R2_BUCKET) {
          const { initR2Storage } = await import('./media/storage.js');
          initR2Storage(workerEnv.R2_BUCKET, workerEnv.R2_PUBLIC_URL);
        }

        initialized = true;
      }

      // All requests reaching the Worker are API routes (run_worker_first = ["/api/*"])
      const appModule = await import('./app.js');
      return appModule.default.fetch(request, workerEnv, ctx);
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message, stack: err.stack }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
