import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './index.js';
import { env } from '../env.js';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = env.DATABASE_URL.replace('sqlite:', '');
mkdirSync(dirname(dbPath), { recursive: true });

const db = getDb();
console.log('Running migrations...');
migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations complete.');
