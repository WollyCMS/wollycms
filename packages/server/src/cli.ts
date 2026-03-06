#!/usr/bin/env node
/**
 * SpacelyCMS CLI — Run common operations from the command line.
 *
 * Usage:
 *   npx spacely migrate     Run pending database migrations
 *   npx spacely seed        Populate database with sample data
 *   npx spacely start       Start the production server
 *   npx spacely dev         Start development server with hot reload
 *   npx spacely export      Export all data as JSON to stdout
 *   npx spacely import <f>  Import data from a JSON file
 *   npx spacely health      Check server health
 */

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'migrate': {
      const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
      const { getDb } = await import('./db/index.js');
      const { env } = await import('./env.js');
      const { mkdirSync } = await import('fs');
      const { dirname } = await import('path');

      const dbPath = env.DATABASE_URL.replace('sqlite:', '');
      mkdirSync(dirname(dbPath), { recursive: true });
      const db = getDb();
      console.log('Running migrations...');
      migrate(db, { migrationsFolder: './drizzle' });
      console.log('Migrations complete.');
      break;
    }

    case 'seed': {
      // Dynamically import the seed script
      await import('./db/seed.js');
      break;
    }

    case 'start': {
      await import('./index.js');
      break;
    }

    case 'export': {
      const { getDb } = await import('./db/index.js');
      const { sql } = await import('drizzle-orm');
      const db = getDb();

      const tables = [
        'content_types', 'block_types', 'pages', 'blocks', 'page_blocks',
        'menus', 'menu_items', 'taxonomies', 'terms', 'content_terms',
        'redirects', 'users', 'media', 'webhooks', 'api_keys',
      ];
      const data: Record<string, unknown[]> = {};
      for (const table of tables) {
        try {
          data[table] = db.all(sql.raw(`SELECT * FROM ${table}`));
        } catch {
          data[table] = [];
        }
      }
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'import': {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error('Usage: spacely import <file.json>');
        process.exit(1);
      }
      const { readFileSync } = await import('fs');
      const { getDb } = await import('./db/index.js');
      const { eq } = await import('drizzle-orm');
      const schema = await import('./db/schema/index.js');

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'));
      } catch {
        console.error(`Failed to read or parse ${filePath}`);
        process.exit(1);
      }

      if ((data as { version?: number }).version !== 1) {
        console.error('Invalid export format (expected version: 1)');
        process.exit(1);
      }

      const db = getDb();
      const importTable = async (
        name: string,
        table: Parameters<typeof db.insert>[0],
        rows: unknown[],
        dedup: (row: Record<string, unknown>) => ReturnType<typeof eq>,
      ) => {
        let imported = 0;
        for (const row of rows as Record<string, unknown>[]) {
          const [existing] = await db.select().from(table).where(dedup(row)).limit(1);
          if (!existing) {
            await db.insert(table).values(row as typeof table.$inferInsert);
            imported++;
          }
        }
        console.log(`  ${name}: ${imported} new / ${rows.length} total`);
      };

      console.log('Importing...');
      const d = data as Record<string, unknown[]>;
      if (d.contentTypes?.length) await importTable('contentTypes', schema.contentTypes, d.contentTypes, (r) => eq(schema.contentTypes.slug, r.slug as string));
      if (d.blockTypes?.length) await importTable('blockTypes', schema.blockTypes, d.blockTypes, (r) => eq(schema.blockTypes.slug, r.slug as string));
      if (d.taxonomies?.length) await importTable('taxonomies', schema.taxonomies, d.taxonomies, (r) => eq(schema.taxonomies.slug, r.slug as string));
      if (d.terms?.length) await importTable('terms', schema.terms, d.terms, (r) => eq(schema.terms.slug, r.slug as string));
      if (d.pages?.length) await importTable('pages', schema.pages, d.pages, (r) => eq(schema.pages.slug, r.slug as string));
      if (d.blocks?.length) await importTable('blocks', schema.blocks, d.blocks, (r) => eq(schema.blocks.id, r.id as number));
      if (d.pageBlocks?.length) await importTable('pageBlocks', schema.pageBlocks, d.pageBlocks, (r) => eq(schema.pageBlocks.id, r.id as number));
      if (d.menus?.length) await importTable('menus', schema.menus, d.menus, (r) => eq(schema.menus.slug, r.slug as string));
      if (d.menuItems?.length) await importTable('menuItems', schema.menuItems, d.menuItems, (r) => eq(schema.menuItems.id, r.id as number));
      if (d.redirects?.length) await importTable('redirects', schema.redirects, d.redirects, (r) => eq(schema.redirects.fromPath, r.fromPath as string));
      console.log('Import complete.');
      break;
    }

    case 'health': {
      const { env } = await import('./env.js');
      const url = `http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}/api/health`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
      } catch {
        console.error(`Could not reach server at ${url}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.log(`SpacelyCMS CLI v0.1.0

Usage: spacely <command>

Commands:
  migrate        Run pending database migrations
  seed           Populate database with sample data
  start          Start the production server
  export         Export all data as JSON to stdout
  import <file>  Import data from a JSON backup file
  health         Check server health status

Examples:
  spacely migrate
  spacely seed
  spacely export > backup.json
  spacely import backup.json`);
      if (command) {
        console.error(`\nUnknown command: ${command}`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
