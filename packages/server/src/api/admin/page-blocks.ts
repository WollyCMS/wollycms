import { Hono } from 'hono';
import { eq, and, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { pages, blocks, blockTypes, pageBlocks } from '../../db/schema/index.js';
import { cacheInvalidate } from '../../cache.js';

const app = new Hono();

// Invalidate pages cache when page-block relationships change
app.use('*', async (c, next) => {
  await next();
  if (c.req.method !== 'GET' && c.res.status < 400) {
    cacheInvalidate('pages:');
  }
});

/** POST /:id/blocks - Add block to a page region */
app.post('/:id/blocks', async (c) => {
  const db = getDb();
  const pageId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    blockId: z.number().int().positive().optional(),
    blockTypeId: z.number().int().positive().optional(),
    region: z.string().min(1),
    position: z.number().int().min(0).optional(),
    isShared: z.boolean().default(false),
    fields: z.record(z.unknown()).optional(),
    title: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();
  let blockId = parsed.data.blockId;

  if (!blockId) {
    const typeId = parsed.data.blockTypeId;
    if (!typeId) return c.json({ errors: [{ code: 'VALIDATION', message: 'blockId or blockTypeId required' }] }, 400);
    const [newBlock] = await db.insert(blocks).values({
      typeId,
      title: parsed.data.title ?? null,
      fields: parsed.data.fields ?? {},
      isReusable: false,
      createdAt: now,
      updatedAt: now,
      createdBy: payload.sub,
    }).returning();
    blockId = newBlock.id;
  }

  const maxPos = await db
    .select({ max: sql<number>`coalesce(max(${pageBlocks.position}), -1)` })
    .from(pageBlocks)
    .where(and(eq(pageBlocks.pageId, pageId), eq(pageBlocks.region, parsed.data.region)));
  const position = parsed.data.position ?? (maxPos[0].max + 1);

  const [pb] = await db.insert(pageBlocks).values({
    pageId,
    blockId,
    region: parsed.data.region,
    position,
    isShared: parsed.data.isShared,
  }).returning();

  return c.json({ data: pb }, 201);
});

/** PUT /:id/blocks/:pbId - Update page block (reorder, move region) */
app.put('/:id/blocks/:pbId', async (c) => {
  const db = getDb();
  const pbId = parseInt(c.req.param('pbId'), 10);
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    region: z.string().optional(),
    position: z.number().int().min(0).optional(),
    overrides: z.record(z.unknown()).optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(pageBlocks).set(parsed.data).where(eq(pageBlocks.id, pbId));
  const [updated] = await db.select().from(pageBlocks).where(eq(pageBlocks.id, pbId)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id/blocks/:pbId - Remove block from page */
app.delete('/:id/blocks/:pbId', async (c) => {
  const db = getDb();
  const pbId = parseInt(c.req.param('pbId'), 10);

  const [pb] = await db.select().from(pageBlocks).where(eq(pageBlocks.id, pbId)).limit(1);
  if (!pb) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page block not found' }] }, 404);

  await db.delete(pageBlocks).where(eq(pageBlocks.id, pbId));

  if (!pb.isShared) {
    const refs = await db.select({ id: pageBlocks.id }).from(pageBlocks).where(eq(pageBlocks.blockId, pb.blockId)).limit(1);
    if (refs.length === 0) {
      await db.delete(blocks).where(eq(blocks.id, pb.blockId));
    }
  }

  return c.json({ data: { deleted: true } });
});

/** POST /:id/duplicate - Duplicate a page with its inline blocks */
app.post('/:id/duplicate', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();

  const [source] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!source) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  let newSlug = `${source.slug}-copy`;
  let suffix = 1;
  while (true) {
    const [dup] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, newSlug)).limit(1);
    if (!dup) break;
    suffix++;
    newSlug = `${source.slug}-copy-${suffix}`;
  }

  const [newPage] = await db.insert(pages).values({
    typeId: source.typeId,
    title: `${source.title} (Copy)`,
    slug: newSlug,
    status: 'draft' as const,
    fields: source.fields,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    createdBy: payload.sub,
  }).returning();

  const pbRows = await db.select().from(pageBlocks)
    .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
    .where(eq(pageBlocks.pageId, id))
    .orderBy(asc(pageBlocks.region), asc(pageBlocks.position));

  for (const pb of pbRows) {
    if (pb.page_blocks.isShared) {
      await db.insert(pageBlocks).values({
        pageId: newPage.id,
        blockId: pb.page_blocks.blockId,
        region: pb.page_blocks.region,
        position: pb.page_blocks.position,
        isShared: true,
        overrides: pb.page_blocks.overrides,
      });
    } else {
      const [newBlock] = await db.insert(blocks).values({
        typeId: pb.blocks.typeId,
        title: pb.blocks.title,
        fields: pb.blocks.fields,
        isReusable: false,
        createdAt: now,
        updatedAt: now,
        createdBy: payload.sub,
      }).returning();
      await db.insert(pageBlocks).values({
        pageId: newPage.id,
        blockId: newBlock.id,
        region: pb.page_blocks.region,
        position: pb.page_blocks.position,
        isShared: false,
      });
    }
  }

  return c.json({ data: newPage }, 201);
});

/** PUT /:id/blocks-order - Reorder all blocks in a region */
app.put('/:id/blocks-order', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    region: z.string().min(1),
    order: z.array(z.number().int()),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  for (let i = 0; i < parsed.data.order.length; i++) {
    await db.update(pageBlocks).set({ position: i, region: parsed.data.region }).where(eq(pageBlocks.id, parsed.data.order[i]));
  }

  return c.json({ data: { reordered: true } });
});

export default app;
