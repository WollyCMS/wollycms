import { getDialect, env } from '../env.js';
import { getDb } from './index.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dialect = getDialect();
const db = getDb();

if (dialect === 'postgresql') {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  console.log('Running PostgreSQL migrations...');
  await migrate(db, { migrationsFolder: './drizzle-pg' });
} else {
  const dbPath = env.DATABASE_URL.replace('sqlite:', '');
  mkdirSync(dirname(dbPath), { recursive: true });
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  console.log('Running SQLite migrations...');
  migrate(db, { migrationsFolder: './drizzle' });
}

console.log('Migrations complete.');
