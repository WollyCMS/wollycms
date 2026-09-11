#!/usr/bin/env node
/**
 * WollyCMS CLI — Run common operations from the command line.
 *
 * Usage:
 *   npx wolly migrate     Run pending database migrations
 *   npx wolly seed        Populate database with sample data
 *   npx wolly start       Start the production server
 *   npx wolly dev         Start development server with hot reload
 *   npx wolly export      Export all data as JSON to stdout
 *   npx wolly import <f>  Import data from a JSON file
 *   npx wolly health      Check server health
 */

import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function getVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function getMigrationsFolder(dialect: string): string {
  const folder = dialect === 'postgresql' ? '../drizzle-pg' : '../drizzle';
  return resolve(__dirname, folder);
}

/**
 * Verify that the required native module (better-sqlite3) is loadable.
 * Prints actionable troubleshooting guidance on failure.
 */
async function checkSqliteDeps(): Promise<void> {
  try {
    await import('better-sqlite3');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nERROR: Could not load better-sqlite3.\n`);
    console.error(`This is a native Node.js module that requires compilation.`);
    console.error(`Common fixes:\n`);
    console.error(`  1. Use Node.js 22 LTS (current: ${process.version})`);
    console.error(`     nvm install 22 && nvm use 22`);
    console.error(`  2. Rebuild native modules:`);
    console.error(`     npm rebuild better-sqlite3`);
    console.error(`  3. Install build tools (if rebuild fails):`);
    console.error(`     Ubuntu/Debian: sudo apt install build-essential python3`);
    console.error(`     macOS:         xcode-select --install`);
    console.error(`     Windows:       npm install -g windows-build-tools`);
    console.error(`  4. Or switch to PostgreSQL (no native modules needed):`);
    console.error(`     Set DATABASE_URL=postgresql://user:pass@localhost/wollycms in .env\n`);
    console.error(`Original error: ${msg}`);
    process.exit(1);
  }
}

/**
 * Verify that the migrations folder and journal file exist before running migrations.
 */
function checkMigrationsFolder(folder: string): void {
  const journalPath = resolve(folder, 'meta', '_journal.json');
  if (!existsSync(folder) || !existsSync(journalPath)) {
    console.error(`\nERROR: Migration files not found at:\n  ${folder}\n`);
    console.error(`Expected journal file at:\n  ${journalPath}\n`);
    console.error(`This usually means @wollycms/server wasn't installed correctly.`);
    console.error(`Fix:\n`);
    console.error(`  rm -rf node_modules package-lock.json`);
    console.error(`  npm install\n`);
    console.error(`If the problem persists, check that this file exists:`);
    console.error(`  node_modules/@wollycms/server/drizzle/meta/_journal.json\n`);
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/*  Commands                                                          */
/* ------------------------------------------------------------------ */

async function main() {
  switch (command) {
    case 'migrate': {
      const { getDialect, env } = await import('./env.js');
      const dialect = getDialect();
      const migrationsFolder = getMigrationsFolder(dialect);

      checkMigrationsFolder(migrationsFolder);

      if (dialect === 'postgresql') {
        const { getDb } = await import('./db/index.js');
        const db = getDb();
        const { migrate } = await import('drizzle-orm/node-postgres/migrator');
        console.log('Running PostgreSQL migrations...');
        await migrate(db, { migrationsFolder });
      } else {
        await checkSqliteDeps();
        const { getDb } = await import('./db/index.js');
        const dbPath = env.DATABASE_URL.replace('sqlite:', '');
        mkdirSync(dirname(dbPath), { recursive: true });
        const db = getDb();
        const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
        console.log('Running SQLite migrations...');
        migrate(db, { migrationsFolder });
      }

      console.log('Migrations complete.');
      break;
    }

    case 'seed': {
      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }
      await import('./db/seed.js');
      break;
    }

    case 'start': {
      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }
      await import('./index.js');
      break;
    }

    case 'export': {
      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }

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
          if (dialect === 'postgresql') {
            const result = await db.execute(sql.raw(`SELECT * FROM "${table}"`));
            data[table] = result.rows ?? [];
          } else {
            data[table] = db.all(sql.raw(`SELECT * FROM ${table}`));
          }
        } catch {
          data[table] = [];
        }
      }
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'types': {
      const subcommand = process.argv[3];
      if (subcommand !== 'generate') {
        console.log('Usage: wolly types generate [--output <path>]');
        process.exit(1);
      }

      const outputIdx = process.argv.indexOf('--output');
      const outputPath = outputIdx > -1 ? process.argv[outputIdx + 1] : './wolly-types.d.ts';

      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }

      const { getDb } = await import('./db/index.js');
      const schema = await import('./db/schema/index.js');
      const { writeFileSync } = await import('fs');
      const db = getDb();

      const ctRows = await db.select().from(schema.contentTypes);
      const btRows = await db.select().from(schema.blockTypes);

      function fieldToTs(field: { name: string; type: string; fields?: unknown[] }): string {
        switch (field.type) {
          case 'text': case 'url': case 'richtext': return 'string';
          case 'number': return 'number';
          case 'boolean': return 'boolean';
          case 'media': return 'number | null';
          case 'select': return 'string';
          case 'repeater': {
            if (!field.fields || !Array.isArray(field.fields)) return 'unknown[]';
            const inner = (field.fields as { name: string; type: string }[])
              .map((f) => `    ${f.name}: ${fieldToTs(f)};`)
              .join('\n');
            return `Array<{\n${inner}\n  }>`;
          }
          default: return 'unknown';
        }
      }

      function pascalCase(slug: string): string {
        return slug.split(/[_-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
      }

      let output = `/**\n * Auto-generated by WollyCMS — do not edit manually.\n * Generated: ${new Date().toISOString()}\n */\n\n`;

      // Block type interfaces
      output += '// Block type field interfaces\n';
      for (const bt of btRows) {
        const fields = (bt.fieldsSchema as { name: string; type: string; required?: boolean; fields?: unknown[] }[]) || [];
        output += `export interface ${pascalCase(bt.slug)}Fields {\n`;
        for (const f of fields) {
          const optional = f.required ? '' : '?';
          output += `  ${f.name}${optional}: ${fieldToTs(f)};\n`;
        }
        output += '}\n\n';
      }

      // Content type interfaces
      output += '// Content type interfaces\n';
      for (const ct of ctRows) {
        const regions = (ct.regions as { name: string; label: string }[]) || [];
        output += `export interface ${pascalCase(ct.slug)}Page {\n`;
        output += '  id: number;\n';
        output += `  type: '${ct.slug}';\n`;
        output += '  title: string;\n';
        output += '  slug: string;\n';
        output += "  status: 'draft' | 'published' | 'archived';\n";
        output += '  fields: Record<string, unknown>;\n';
        output += '  seo?: { meta_title: string | null; meta_description: string | null; og_image: string | null; canonical_url: string | null; robots: string | null };\n';
        output += '  regions: {\n';
        for (const r of regions) {
          output += `    ${r.name}?: import('@wollycms/astro').ResolvedBlock[];\n`;
        }
        output += '  };\n';
        output += '  meta: { created_at: string; updated_at: string; published_at: string | null };\n';
        output += '}\n\n';
      }

      // Union type
      const pageUnion = ctRows.map((ct: typeof ctRows[0]) => `${pascalCase(ct.slug)}Page`).join(' | ');
      output += `export type WollyPage = ${pageUnion};\n\n`;

      // Block type slug union
      const blockSlugs = btRows.map((bt: typeof btRows[0]) => `'${bt.slug}'`).join(' | ');
      output += `export type BlockTypeSlug = ${blockSlugs};\n\n`;

      // Content type slug union
      const ctSlugs = ctRows.map((ct: typeof ctRows[0]) => `'${ct.slug}'`).join(' | ');
      output += `export type ContentTypeSlug = ${ctSlugs};\n`;

      writeFileSync(outputPath, output);
      console.log(`Types generated: ${outputPath}`);
      console.log(`  ${ctRows.length} content types, ${btRows.length} block types`);
      break;
    }

    case 'import': {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error('Usage: wolly import <file.json>');
        process.exit(1);
      }

      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }

      const { readFileSync: readFile } = await import('fs');
      const { getDb } = await import('./db/index.js');
      const { and, eq } = await import('drizzle-orm');
      const schema = await import('./db/schema/index.js');

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(readFile(filePath, 'utf-8'));
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
        table: any,
        rows: unknown[],
        dedup: (row: Record<string, unknown>) => ReturnType<typeof eq> | ReturnType<typeof and>,
      ) => {
        let imported = 0;
        for (const row of rows as Record<string, unknown>[]) {
          const [existing] = await db.select().from(table).where(dedup(row)).limit(1);
          if (!existing) {
            await db.insert(table).values(row);
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
      // Pages dedup on (slug, locale): slugs are only unique per locale.
      if (d.pages?.length) await importTable('pages', schema.pages, d.pages, (r) => and(eq(schema.pages.slug, r.slug as string), eq(schema.pages.locale, (r.locale as string | undefined) ?? 'en')));
      if (d.blocks?.length) await importTable('blocks', schema.blocks, d.blocks, (r) => eq(schema.blocks.id, r.id as number));
      if (d.pageBlocks?.length) await importTable('pageBlocks', schema.pageBlocks, d.pageBlocks, (r) => eq(schema.pageBlocks.id, r.id as number));
      if (d.menus?.length) await importTable('menus', schema.menus, d.menus, (r) => eq(schema.menus.slug, r.slug as string));
      if (d.menuItems?.length) await importTable('menuItems', schema.menuItems, d.menuItems, (r) => eq(schema.menuItems.id, r.id as number));
      if (d.redirects?.length) await importTable('redirects', schema.redirects, d.redirects, (r) => eq(schema.redirects.fromPath, r.fromPath as string));
      console.log('Import complete.');
      break;
    }

    case 'og:generate': {
      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }

      const { getDb } = await import('./db/index.js');
      const { bulkGenerateOgImages } = await import('./og/generate.js');
      getDb(); // ensure DB is initialized

      const args = process.argv.slice(3);
      const force = args.includes('--force');
      const dryRun = args.includes('--dry-run');
      const typeIdx = args.indexOf('--type');
      const contentTypeSlug = typeIdx > -1 ? args[typeIdx + 1] : undefined;

      console.log(`OG Image Generation${dryRun ? ' (dry run)' : ''}`);
      console.log(`  Mode: ${force ? 'regenerate all' : 'missing only'}`);
      if (contentTypeSlug) console.log(`  Content type: ${contentTypeSlug}`);
      console.log('');

      const result = await bulkGenerateOgImages({
        force,
        dryRun,
        contentTypeSlug,
      });

      console.log('');
      console.log(`Done. Generated: ${result.generated}, Skipped: ${result.skipped}`);
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
        for (const err of result.errors) console.log(`  - ${err}`);
      }
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

    case 'search:rebuild': {
      const { getDialect } = await import('./env.js');
      const dialect = getDialect();
      if (dialect !== 'postgresql') {
        await checkSqliteDeps();
      }

      const { getDb: getDbForSearch } = await import('./db/index.js');
      const { rebuildSearchIndex } = await import('./search-index.js');
      getDbForSearch();
      console.log('Rebuilding search index...');
      const count = await rebuildSearchIndex();
      console.log(`Indexed ${count} published pages.`);
      break;
    }

    default:
      console.log(`WollyCMS CLI v${getVersion()}

Usage: wolly <command>

Commands:
  migrate              Run pending database migrations
  seed                 Populate database with sample data
  start                Start the production server
  export               Export all data as JSON to stdout
  import <file>        Import data from a JSON backup file
  types generate       Generate TypeScript types from CMS schemas
  og:generate          Generate OG images for published pages
  search:rebuild       Rebuild full-text search index
  health               Check server health status

Examples:
  wolly migrate
  wolly seed
  wolly export > backup.json
  wolly import backup.json
  wolly types generate --output src/wolly-types.d.ts
  wolly og:generate                    # pages missing OG images
  wolly og:generate --force            # regenerate all
  wolly og:generate --type=blog        # specific content type
  wolly og:generate --dry-run          # preview without generating
  wolly search:rebuild                 # rebuild FTS index`);
      if (command) {
        console.error(`\nUnknown command: ${command}`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);

  // Catch common environment issues and provide guidance
  if (msg.includes('better-sqlite3') || msg.includes('better_sqlite3')) {
    console.error(`\nERROR: better-sqlite3 failed to load.\n`);
    console.error(`Run: npm rebuild better-sqlite3`);
    console.error(`Or switch to PostgreSQL: DATABASE_URL=postgresql://... in .env`);
  } else if (msg.includes('ENOENT') && msg.includes('.env')) {
    console.error(`\nERROR: .env file not found.\n`);
    console.error(`Create one from the example: cp .env.example .env`);
  } else if (msg.includes('EACCES') || msg.includes('permission denied')) {
    console.error(`\nERROR: Permission denied.\n`);
    console.error(`Check that the data/ and uploads/ directories are writable.`);
  } else {
    console.error(err);
  }

  process.exit(1);
});
