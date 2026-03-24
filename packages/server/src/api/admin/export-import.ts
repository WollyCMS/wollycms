import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { requireRole } from '../../auth/rbac.js';
import {
  pages, blocks, blockTypes, contentTypes, pageBlocks,
  menus, menuItems, taxonomies, terms, contentTerms, redirects,
  media, pageRevisions, siteConfig, trackingScripts, webhooks,
} from '../../db/schema/index.js';

const app = new Hono();

// Export/import require admin role
app.use('/*', requireRole('admin'));

/** GET /export - Full site export as JSON
 *
 * Exports everything needed to recreate a site on a fresh WollyCMS instance.
 * Intentionally excludes: users, API keys, OAuth tokens, 2FA, audit logs
 * (auth/credentials should be recreated on the target instance).
 *
 * Media metadata is included but actual files (R2/S3) must be copied separately.
 */
app.get('/export', async (c) => {
  const db = getDb();

  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    // Schema
    contentTypes: await db.select().from(contentTypes),
    blockTypes: await db.select().from(blockTypes),
    // Content
    pages: await db.select().from(pages),
    blocks: await db.select().from(blocks),
    pageBlocks: await db.select().from(pageBlocks),
    pageRevisions: await db.select().from(pageRevisions),
    // Taxonomies
    taxonomies: await db.select().from(taxonomies),
    terms: await db.select().from(terms),
    contentTerms: await db.select().from(contentTerms),
    // Navigation
    menus: await db.select().from(menus),
    menuItems: await db.select().from(menuItems),
    redirects: await db.select().from(redirects),
    // Media metadata (files must be copied separately from R2/S3)
    media: await db.select().from(media),
    // Site configuration
    siteConfig: await db.select().from(siteConfig),
    trackingScripts: await db.select().from(trackingScripts),
    webhooks: await db.select().from(webhooks),
  };

  c.header('Content-Disposition', `attachment; filename="wolly-export-${new Date().toISOString().slice(0, 10)}.json"`);
  return c.json(data);
});

/** POST /import - Import content from JSON export
 *
 * Supports both v1 (legacy) and v2 (full) exports.
 * Uses slug/ID-based deduplication — existing records are not overwritten.
 * Import order respects foreign key dependencies.
 */
app.post('/import', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || (body.version !== 1 && body.version !== 2)) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Invalid export format (expected version: 1 or 2)' }] }, 400);
  }

  const db = getDb();
  const stats: Record<string, number> = {};

  // Helper: import rows with slug-based dedup
  async function importBySlug<T extends { slug: string }>(
    table: any,
    slugCol: any,
    rows: T[] | undefined,
    name: string,
  ) {
    if (!rows?.length) return;
    for (const row of rows) {
      const [existing] = await db.select({ id: table.id }).from(table).where(eq(slugCol, row.slug)).limit(1);
      if (!existing) {
        await db.insert(table).values(row);
      }
    }
    stats[name] = rows.length;
  }

  // Helper: import rows with ID-based dedup
  async function importById<T extends { id: number }>(
    table: any,
    idCol: any,
    rows: T[] | undefined,
    name: string,
  ) {
    if (!rows?.length) return;
    for (const row of rows) {
      const [existing] = await db.select({ id: table.id }).from(table).where(eq(idCol, row.id)).limit(1);
      if (!existing) {
        await db.insert(table).values(row);
      }
    }
    stats[name] = rows.length;
  }

  // --- Import in dependency order ---

  // 1. Schema (no dependencies)
  await importBySlug(contentTypes, contentTypes.slug, body.contentTypes, 'contentTypes');
  await importBySlug(blockTypes, blockTypes.slug, body.blockTypes, 'blockTypes');

  // 2. Taxonomies (no dependencies)
  await importBySlug(taxonomies, taxonomies.slug, body.taxonomies, 'taxonomies');

  // 3. Terms (depends on taxonomies)
  await importBySlug(terms, terms.slug, body.terms, 'terms');

  // 4. Media metadata (no dependencies besides users, which we skip)
  await importById(media, media.id, body.media, 'media');

  // 5. Pages (depends on contentTypes)
  await importBySlug(pages, pages.slug, body.pages, 'pages');

  // 6. Blocks (depends on blockTypes)
  await importById(blocks, blocks.id, body.blocks, 'blocks');

  // 7. Page blocks (depends on pages + blocks)
  await importById(pageBlocks, pageBlocks.id, body.pageBlocks, 'pageBlocks');

  // 8. Content terms (depends on pages/blocks + terms)
  await importById(contentTerms, contentTerms.id, body.contentTerms, 'contentTerms');

  // 9. Page revisions (depends on pages)
  await importById(pageRevisions, pageRevisions.id, body.pageRevisions, 'pageRevisions');

  // 10. Menus (no dependencies)
  await importBySlug(menus, menus.slug, body.menus, 'menus');

  // 11. Menu items (depends on menus)
  await importById(menuItems, menuItems.id, body.menuItems, 'menuItems');

  // 12. Redirects (no dependencies)
  if (body.redirects?.length) {
    for (const row of body.redirects) {
      const [existing] = await db.select({ id: redirects.id }).from(redirects).where(eq(redirects.fromPath, row.fromPath)).limit(1);
      if (!existing) {
        await db.insert(redirects).values(row);
      }
    }
    stats.redirects = body.redirects.length;
  }

  // 13. Site config (single-row table — upsert)
  if (body.siteConfig?.length) {
    const [existing] = await db.select({ id: siteConfig.id }).from(siteConfig).limit(1);
    if (existing) {
      await db.update(siteConfig).set({ value: body.siteConfig[0].value }).where(eq(siteConfig.id, 1));
    } else {
      await db.insert(siteConfig).values(body.siteConfig[0]);
    }
    stats.siteConfig = 1;
  }

  // 14. Tracking scripts (no dependencies)
  await importById(trackingScripts, trackingScripts.id, body.trackingScripts, 'trackingScripts');

  // 15. Webhooks (no dependencies)
  await importById(webhooks, webhooks.id, body.webhooks, 'webhooks');

  return c.json({ data: { imported: true, stats } });
});

export default app;
