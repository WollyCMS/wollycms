import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resetDb } from '../src/db/index.js';
import { media } from '../src/db/schema/index.js';
import { seedUsers } from '../src/db/seed/users.js';
import { seedContentTypes } from '../src/db/seed/content-types.js';
import { seedBlockTypes } from '../src/db/seed/block-types.js';
import { seedTaxonomies } from '../src/db/seed/taxonomies.js';
import { seedPagesAndBlocks } from '../src/db/seed/pages-and-blocks.js';
import { seedMenus, seedMainMenuChildren } from '../src/db/seed/menus.js';
import { seedRedirects } from '../src/db/seed/redirects.js';

const TEST_DB_PATH = './data/test.db';

// Set env before any module reads it
process.env.DATABASE_URL = `sqlite:${TEST_DB_PATH}`;

let initialized = false;

export async function setupTestDatabase() {
  if (initialized) return;
  initialized = true;

  mkdirSync('./data', { recursive: true });
  if (existsSync(TEST_DB_PATH)) {
    unlinkSync(TEST_DB_PATH);
  }

  const db = resetDb(TEST_DB_PATH);
  migrate(db, { migrationsFolder: './drizzle' });

  // Seed data
  const insertedUsers = await seedUsers(db);
  const adminId = insertedUsers[0].id;

  const insertedCT = await seedContentTypes(db);
  const contentTypeMap: Record<string, number> = {};
  for (const ct of insertedCT) contentTypeMap[ct.slug] = ct.id;

  const insertedBT = await seedBlockTypes(db);
  const blockTypeMap: Record<string, number> = {};
  for (const bt of insertedBT) blockTypeMap[bt.slug] = bt.id;

  await seedTestMedia(db, adminId);
  await seedTaxonomies(db);
  const { pageMap } = await seedPagesAndBlocks(db, contentTypeMap, blockTypeMap, adminId);
  const { mainMenu } = await seedMenus(db, pageMap);
  await seedMainMenuChildren(db, mainMenu.id, pageMap);
  await seedRedirects(db);

  return db;
}

/** Seed minimal media records for testing (no real files on disk). */
async function seedTestMedia(db: ReturnType<typeof resetDb>, adminId: number) {
  const now = new Date().toISOString();
  await db.insert(media).values([
    {
      filename: 'test-image.jpg', originalName: 'test-image.jpg',
      mimeType: 'image/jpeg', size: 1024, width: 800, height: 600,
      altText: 'Test image', title: 'Test Image',
      path: 'uploads/test-image.jpg',
      variants: { thumbnail: 'uploads/test-image-thumb.webp', medium: 'uploads/test-image-md.webp' },
      metadata: {}, createdAt: now, createdBy: adminId,
    },
    {
      filename: 'test-logo.png', originalName: 'test-logo.png',
      mimeType: 'image/png', size: 512, width: 200, height: 60,
      altText: 'Test logo', title: 'Test Logo',
      path: 'uploads/test-logo.png',
      variants: {},
      metadata: {}, createdAt: now, createdBy: adminId,
    },
  ]).returning();
}
