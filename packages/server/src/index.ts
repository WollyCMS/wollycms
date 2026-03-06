import { serve } from '@hono/node-server';
import { env } from './env.js';
import app from './app.js';
import { startScheduler } from './scheduler.js';

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  console.log(
    `SpacelyCMS server running at http://${info.address}:${info.port}`,
  );
  startScheduler();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
