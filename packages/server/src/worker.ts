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

async function ensureInitialized(workerEnv: WorkerEnv) {
  if (initialized) return;

  const { initEnvFromBindings } = await import('./env.js');
  initEnvFromBindings(workerEnv);

  if (workerEnv.DB) {
    const { initD1 } = await import('./db/index.js');
    await initD1(workerEnv.DB);
  }

  if (workerEnv.R2_BUCKET) {
    const { initR2Storage } = await import('./media/storage.js');
    initR2Storage(workerEnv.R2_BUCKET, workerEnv.R2_PUBLIC_URL);
  }

  initialized = true;
}

export default {
  async fetch(request: Request, workerEnv: WorkerEnv, ctx: any): Promise<Response> {
    try {
      await ensureInitialized(workerEnv);

      const appModule = await import('./app.js');
      return appModule.default.fetch(request, workerEnv, ctx);
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message, stack: err.stack }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  async scheduled(event: ScheduledEvent, workerEnv: WorkerEnv, ctx: any): Promise<void> {
    await ensureInitialized(workerEnv);

    const { runScheduledPublishing } = await import('./scheduler.js');
    const { runScheduledUnpublishing } = await import('./scheduler.js');

    ctx.waitUntil(
      Promise.all([
        runScheduledPublishing(),
        runScheduledUnpublishing(),
      ]).then(([published, unpublished]) => {
        if (published > 0 || unpublished > 0) {
          console.log(`[cron] Published ${published}, unpublished ${unpublished}`);
        }
      })
    );
  },
};
