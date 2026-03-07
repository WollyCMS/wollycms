import { serve } from '@hono/node-server';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { env, getDialect, getDatabasePath } from './env.js';
import app from './app.js';
import { startScheduler } from './scheduler.js';
import { getDb } from './db/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function autoMigrate() {
  const dialect = getDialect();
  if (dialect === 'sqlite') {
    const dbPath = getDatabasePath();
    const dbDir = dirname(dbPath);
    mkdirSync(dbDir, { recursive: true });
    console.log(`SQLite path: ${resolve(dbPath)}, dir: ${resolve(dbDir)}`);
    // Check directory is writable
    const { accessSync, constants } = await import('node:fs');
    try {
      accessSync(dbDir, constants.W_OK);
    } catch {
      console.error(`ERROR: Directory ${resolve(dbDir)} is not writable. Check volume mount permissions.`);
      process.exit(1);
    }
  }
  const db = getDb();
  const migrationsFolder = resolve(__dirname, '../drizzle');
  if (dialect === 'postgresql') {
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    await migrate(db, { migrationsFolder });
  } else {
    const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
    migrate(db, { migrationsFolder });
  }
  console.log('Database migrations applied.');
}

await autoMigrate();

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  console.log(
    `WollyCMS server running at http://${info.address}:${info.port}`,
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
