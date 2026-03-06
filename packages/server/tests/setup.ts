import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resetDb } from '../src/db/index.js';
import { seedUsers } from '../src/db/seed/users.js';
import { seedContentTypes } from '../src/db/seed/content-types.js';
import { seedBlockTypes } from '../src/db/seed/block-types.js';
import { seedMedia } from '../src/db/seed/media.js';
import { seedTaxonomies } from '../src/db/seed/taxonomies.js';
import { seedPagesAndBlocks } from '../src/db/seed/pages-and-blocks.js';
import { seedMenus, seedMainMenuChildren } from '../src/db/seed/menus.js';
import { seedRedirects } from '../src/db/seed/redirects.js';

const TEST_DB_PATH = './data/test.db';

// Set env before any module reads it
process.env.DATABASE_URL = `sqlite:${TEST_DB_PATH}`;

export function setupTestDatabase() {
  mkdirSync('./data', { recursive: true });
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }

  const db = resetDb(TEST_DB_PATH);
  migrate(db, { migrationsFolder: './drizzle' });

  // Seed data
  const insertedUsers = seedUsers(db);
  const adminId = insertedUsers[0].id;

  const insertedCT = seedContentTypes(db);
  const contentTypeMap: Record<string, number> = {};
  for (const ct of insertedCT) contentTypeMap[ct.slug] = ct.id;

  const insertedBT = seedBlockTypes(db);
  const blockTypeMap: Record<string, number> = {};
  for (const bt of insertedBT) blockTypeMap[bt.slug] = bt.id;

  seedMedia(db, adminId);
  seedTaxonomies(db);
  const { pageMap } = seedPagesAndBlocks(db, contentTypeMap, blockTypeMap, adminId);
  const { mainMenu } = seedMenus(db, pageMap);
  seedMainMenuChildren(db, mainMenu.id, pageMap);
  seedRedirects(db);

  return db;
}
