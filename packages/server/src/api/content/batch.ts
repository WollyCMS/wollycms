import { Hono } from 'hono';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import {
  pages, contentTypes, blocks, blockTypes, pageBlocks,
  menus, menuItems,
} from '../../db/schema/index.js';

const app = new Hono();

const batchSchema = z.object({
  pages: z.array(z.string()).optional(), // slugs
  menus: z.array(z.string()).optional(), // slugs
});

/**
 * POST / - Batch fetch multiple pages and menus in one request.
 * Useful for Astro builds that need many pages at once.
 */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Invalid batch request' }] }, 400);
  }

  const db = getDb();
  const now = new Date().toISOString();
  const result: Record<string, unknown> = {};

  // Fetch pages
  if (parsed.data.pages && parsed.data.pages.length > 0) {
    const slugs = parsed.data.pages.slice(0, 50); // Max 50 pages per batch
    const pageRows = db
      .select({
        id: pages.id,
        typeSlug: contentTypes.slug,
        title: pages.title,
        slug: pages.slug,
        status: pages.status,
        fields: pages.fields,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
      .where(and(
        inArray(pages.slug, slugs),
        eq(pages.status, 'published'),
        sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
      ))
      .all();

    const pagesResult: Record<string, unknown> = {};
    for (const page of pageRows) {
      const pbRows = db
        .select({
          pbId: pageBlocks.id,
          region: pageBlocks.region,
          position: pageBlocks.position,
          isShared: pageBlocks.isShared,
          overrides: pageBlocks.overrides,
          blockId: blocks.id,
          blockFields: blocks.fields,
          blockTypeSlug: blockTypes.slug,
        })
        .from(pageBlocks)
        .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
        .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
        .where(eq(pageBlocks.pageId, page.id))
        .orderBy(asc(pageBlocks.region), asc(pageBlocks.position))
        .all();

      const regions: Record<string, unknown[]> = {};
      for (const pb of pbRows) {
        if (!regions[pb.region]) regions[pb.region] = [];
        let fields = pb.blockFields || {};
        if (pb.isShared && pb.overrides) fields = { ...fields, ...pb.overrides };
        regions[pb.region].push({
          id: `pb_${pb.pbId}`,
          block_type: pb.blockTypeSlug,
          fields,
          ...(pb.isShared ? { is_shared: true, block_id: pb.blockId } : {}),
        });
      }

      pagesResult[page.slug] = {
        id: page.id,
        type: page.typeSlug,
        title: page.title,
        slug: page.slug,
        status: page.status,
        fields: page.fields,
        regions,
        meta: {
          created_at: page.createdAt,
          updated_at: page.updatedAt,
          published_at: page.publishedAt,
        },
      };
    }
    result.pages = pagesResult;
  }

  // Fetch menus
  if (parsed.data.menus && parsed.data.menus.length > 0) {
    const slugList = parsed.data.menus.slice(0, 10);
    const menusResult: Record<string, unknown> = {};
    for (const menuSlug of slugList) {
      const [menu] = db.select().from(menus).where(eq(menus.slug, menuSlug)).limit(1).all();
      if (!menu) continue;
      const items = db.select().from(menuItems)
        .where(eq(menuItems.menuId, menu.id))
        .orderBy(asc(menuItems.position))
        .all();
      menusResult[menuSlug] = { ...menu, items };
    }
    result.menus = menusResult;
  }

  return c.json({ data: result });
});

export default app;
