import { Hono } from 'hono';
import { eq, desc, asc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import {
  pages, pageRevisions, blocks, blockTypes, pageBlocks,
} from '../../db/schema/index.js';

const app = new Hono();

/** GET /:pageId/revisions - List revisions for a page */
app.get('/:pageId/revisions', async (c) => {
  const db = getDb();
  const pageId = parseInt(c.req.param('pageId'), 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const [page] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  const rows = await db
    .select()
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    data: rows.map((r: typeof rows[0]) => ({
      id: r.id,
      pageId: r.pageId,
      title: r.title,
      slug: r.slug,
      status: r.status,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      blockCount: Array.isArray(r.blocks) ? r.blocks.length : 0,
    })),
  });
});

/** GET /:pageId/revisions/:revId - Get full revision detail */
app.get('/:pageId/revisions/:revId', async (c) => {
  const db = getDb();
  const revId = parseInt(c.req.param('revId'), 10);

  const [rev] = await db.select().from(pageRevisions).where(eq(pageRevisions.id, revId)).limit(1);
  if (!rev) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Revision not found' }] }, 404);

  return c.json({ data: rev });
});

/** POST /:pageId/revisions/:revId/restore - Restore a page to a previous revision */
app.post('/:pageId/revisions/:revId/restore', async (c) => {
  const db = getDb();
  const pageId = parseInt(c.req.param('pageId'), 10);
  const revId = parseInt(c.req.param('revId'), 10);
  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();

  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  const [rev] = await db.select().from(pageRevisions).where(eq(pageRevisions.id, revId)).limit(1);
  if (!rev || rev.pageId !== pageId) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Revision not found' }] }, 404);
  }

  // Snapshot current state before restoring
  const currentBlocks = await db
    .select({
      region: pageBlocks.region, position: pageBlocks.position,
      isShared: pageBlocks.isShared, overrides: pageBlocks.overrides,
      blockId: blocks.id, blockTypeSlug: blockTypes.slug,
      blockTitle: blocks.title, blockFields: blocks.fields,
    })
    .from(pageBlocks)
    .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
    .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
    .where(eq(pageBlocks.pageId, pageId))
    .orderBy(asc(pageBlocks.region), asc(pageBlocks.position));

  await db.insert(pageRevisions).values({
    pageId,
    title: page.title,
    slug: page.slug,
    status: page.status!,
    fields: page.fields,
    blocks: currentBlocks.map((b: typeof currentBlocks[0]) => ({
      region: b.region, position: b.position, isShared: b.isShared,
      overrides: b.overrides, blockType: b.blockTypeSlug,
      title: b.blockTitle, fields: b.blockFields,
    })),
    createdAt: now,
    createdBy: payload.sub,
  });

  // Restore page fields
  await db.update(pages).set({
    title: rev.title,
    slug: rev.slug,
    fields: rev.fields,
    updatedAt: now,
  }).where(eq(pages.id, pageId));

  // Restore blocks: remove current inline blocks and page_blocks, then recreate
  const currentPbs = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, pageId));
  for (const pb of currentPbs) {
    if (!pb.isShared) {
      await db.delete(blocks).where(eq(blocks.id, pb.blockId));
    }
  }
  await db.delete(pageBlocks).where(eq(pageBlocks.pageId, pageId));

  if (Array.isArray(rev.blocks)) {
    for (const b of rev.blocks as any[]) {
      // Look up block type by slug
      const [bt] = await db.select({ id: blockTypes.id }).from(blockTypes)
        .where(eq(blockTypes.slug, b.blockType)).limit(1);
      if (!bt) continue;

      if (b.isShared && b.blockId) {
        // Re-reference shared block
        await db.insert(pageBlocks).values({
          pageId, blockId: b.blockId, region: b.region,
          position: b.position, isShared: true, overrides: b.overrides,
        });
      } else {
        // Recreate inline block
        const [newBlock] = await db.insert(blocks).values({
          typeId: bt.id,
          title: b.title ?? null,
          fields: b.fields ?? {},
          isReusable: false,
          createdAt: now,
          updatedAt: now,
          createdBy: payload.sub,
        }).returning();

        await db.insert(pageBlocks).values({
          pageId, blockId: newBlock.id, region: b.region,
          position: b.position, isShared: false,
        });
      }
    }
  }

  const [updated] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  return c.json({ data: updated });
});

export default app;
