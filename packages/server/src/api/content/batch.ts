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
    const pageRows = await db
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
      ));

    const pageIds = pageRows.map((p: { id: number }) => p.id);
    const pbByPageId = new Map<number, Array<{
      pbId: number;
      region: string;
      position: number;
      isShared: boolean;
      overrides: Record<string, unknown> | null;
      blockId: number;
      blockFields: Record<string, unknown> | null;
      blockTypeSlug: string;
    }>>();

    if (pageIds.length > 0) {
      const pbRows = await db
        .select({
          pageId: pageBlocks.pageId,
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
        .where(inArray(pageBlocks.pageId, pageIds))
        .orderBy(asc(pageBlocks.pageId), asc(pageBlocks.region), asc(pageBlocks.position));

      for (const row of pbRows) {
        const existing = pbByPageId.get(row.pageId) || [];
        existing.push(row);
        pbByPageId.set(row.pageId, existing);
      }
    }

    const pagesResult: Record<string, unknown> = {};
    for (const page of pageRows) {
      const pageBlocksForPage = pbByPageId.get(page.id) || [];

      const regions: Record<string, unknown[]> = {};
      for (const pb of pageBlocksForPage) {
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
    const menuRows = await db.select().from(menus).where(inArray(menus.slug, slugList));
    const menuIds = menuRows.map((m: { id: number }) => m.id);
    const menuItemsRows = menuIds.length > 0
      ? await db.select().from(menuItems).where(inArray(menuItems.menuId, menuIds)).orderBy(asc(menuItems.menuId), asc(menuItems.position))
      : [];
    const itemsByMenuId = new Map<number, typeof menuItemsRows>();
    for (const item of menuItemsRows) {
      const existing = itemsByMenuId.get(item.menuId) || [];
      existing.push(item);
      itemsByMenuId.set(item.menuId, existing);
    }
    for (const menu of menuRows) {
      menusResult[menu.slug] = { ...menu, items: itemsByMenuId.get(menu.id) || [] };
    }
    result.menus = menusResult;
  }

  return c.json({ data: result });
});

export default app;
