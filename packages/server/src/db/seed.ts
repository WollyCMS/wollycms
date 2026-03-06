import { sql } from 'drizzle-orm';
import { getDb } from './index.js';
import { seedUsers } from './seed/users.js';
import { seedContentTypes } from './seed/content-types.js';
import { seedBlockTypes } from './seed/block-types.js';
import { seedMedia } from './seed/media.js';
import { seedRedirects } from './seed/redirects.js';
import { seedTaxonomies } from './seed/taxonomies.js';
import { seedPagesAndBlocks } from './seed/pages-and-blocks.js';
import { seedMenus, seedMainMenuChildren } from './seed/menus.js';

const TABLE_NAMES = [
  'content_terms',
  'page_blocks',
  'menu_items',
  'blocks',
  'pages',
  'terms',
  'taxonomies',
  'menus',
  'media',
  'redirects',
  'block_types',
  'content_types',
  'users',
];

function clearTables(db: ReturnType<typeof getDb>) {
  db.run(sql`PRAGMA foreign_keys = OFF`);
  for (const name of TABLE_NAMES) {
    db.run(sql.raw(`DELETE FROM "${name}"`));
  }
  db.run(sql`PRAGMA foreign_keys = ON`);
  console.log('Cleared existing data from all tables.');
}

function seed() {
  console.log('Starting SpacelyCMS seed...\n');

  const db = getDb();

  clearTables(db);

  // 1. Users
  console.log('[1/8] Users');
  const insertedUsers = seedUsers(db);
  const adminId = insertedUsers[0].id;

  // 2. Content types
  console.log('[2/8] Content Types');
  const insertedCT = seedContentTypes(db);
  const contentTypeMap: Record<string, number> = {};
  for (const ct of insertedCT) {
    contentTypeMap[ct.slug] = ct.id;
  }

  // 3. Block types
  console.log('[3/8] Block Types');
  const insertedBT = seedBlockTypes(db);
  const blockTypeMap: Record<string, number> = {};
  for (const bt of insertedBT) {
    blockTypeMap[bt.slug] = bt.id;
  }

  // 4. Media
  console.log('[4/8] Media');
  seedMedia(db, adminId);

  // 5. Taxonomies & terms
  console.log('[5/8] Taxonomies');
  seedTaxonomies(db);

  // 6. Pages & blocks
  console.log('[6/8] Pages & Blocks');
  const { pageMap } = seedPagesAndBlocks(db, contentTypeMap, blockTypeMap, adminId);

  // 7. Menus
  console.log('[7/8] Menus');
  const { mainMenu } = seedMenus(db, pageMap);
  seedMainMenuChildren(db, mainMenu.id, pageMap);

  // 8. Redirects
  console.log('[8/8] Redirects');
  seedRedirects(db);

  console.log('\nSeed complete!');
}

try {
  seed();
} catch (err) {
  console.error('Seed failed:', err);
  process.exit(1);
}
