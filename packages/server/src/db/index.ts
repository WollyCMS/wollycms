import { getDialect, getDatabasePath, env } from '../env.js';
import * as schema from './schema/index.js';

const dialect = getDialect();
let db: any = null;

let connect: (pathOrUrl?: string) => any;

if (dialect === 'postgresql') {
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  connect = (url?: string) => {
    const pool = new pg.default.Pool({ connectionString: url || env.DATABASE_URL });
    return drizzle(pool, { schema });
  };
} else {
  const { default: Database } = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  connect = (path?: string) => {
    const dbPath = path || getDatabasePath();
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    return drizzle(sqlite, { schema });
  };
}

export function getDb(pathOrUrl?: string) {
  if (!db) {
    db = connect(pathOrUrl);
  }
  return db;
}

export function resetDb(pathOrUrl?: string) {
  db = connect(pathOrUrl);
  return db;
}

export function createTestDb(path: string) {
  return connect(path);
}

export type AppDatabase = ReturnType<typeof getDb>;
