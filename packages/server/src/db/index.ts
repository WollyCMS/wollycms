import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { getDatabasePath } from '../env.js';
import * as schema from './schema/index.js';

let db: ReturnType<typeof createDb> | null = null;

function createDb(path?: string) {
  const dbPath = path || getDatabasePath();
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export function getDb(path?: string) {
  if (!db) {
    db = createDb(path);
  }
  return db;
}

export function resetDb(path?: string) {
  db = createDb(path);
  return db;
}

export function createTestDb(path: string) {
  return createDb(path);
}

export type AppDatabase = ReturnType<typeof getDb>;
