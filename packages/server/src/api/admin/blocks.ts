import { Hono } from 'hono';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { blocks, blockTypes, pageBlocks, pages } from '../../db/schema/index.js';
import { cacheInvalidate } from '../../cache.js';

const app = new Hono();

// Invalidate pages cache when blocks change (pages include block content)
app.use('*', async (c, next) => {
  await next();
  if (c.req.method !== 'GET' && c.res.status < 400) {
    cacheInvalidate('pages:');
  }
});

const blockSchema = z.object({
  typeId: z.number().int().positive(),
  title: z.string().min(1),
  fields: z.record(z.unknown()).default({}),
  isReusable: z.boolean().default(true),
});

/** GET / - List blocks (reusable library) */
app.get('/', async (c) => {
  const db = getDb();
  const typeSlug = c.req.query('type');
  const search = c.req.query('search');
  const reusableOnly = c.req.query('reusable') !== 'false';
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const conditions: ReturnType<typeof eq>[] = [];
  if (reusableOnly) conditions.push(eq(blocks.isReusable, true));
  if (search) conditions.push(sql`${blocks.title} LIKE ${'%' + search + '%'}`);

  if (typeSlug) {
    const [bt] = await db.select({ id: blockTypes.id }).from(blockTypes).where(eq(blockTypes.slug, typeSlug)).limit(1);
    if (bt) conditions.push(eq(blocks.typeId, bt.id));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(blocks).where(where);

  const rows = await db
    .select({
      id: blocks.id, typeId: blocks.typeId, typeSlug: blockTypes.slug, typeName: blockTypes.name,
      title: blocks.title, fields: blocks.fields, isReusable: blocks.isReusable,
      createdAt: blocks.createdAt, updatedAt: blocks.updatedAt,
      usageCount: sql<number>`(SELECT count(*) FROM page_blocks WHERE page_blocks.block_id = ${blocks.id})`,
    })
    .from(blocks)
    .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
    .where(where)
    .orderBy(desc(blocks.updatedAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows, meta: { total: countResult[0].count, limit, offset } });
});

/** GET /:id - Get single block */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [block] = await db
    .select({
      id: blocks.id, typeId: blocks.typeId, typeSlug: blockTypes.slug, typeName: blockTypes.name,
      title: blocks.title, fields: blocks.fields, isReusable: blocks.isReusable,
      createdAt: blocks.createdAt, updatedAt: blocks.updatedAt,
    })
    .from(blocks)
    .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
    .where(eq(blocks.id, id))
    .limit(1);

  if (!block) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Block not found' }] }, 404);

  // Get usage info for reusable blocks
  const usage = await db
    .select({ pageId: pageBlocks.pageId, pageTitle: pages.title, pageSlug: pages.slug })
    .from(pageBlocks)
    .innerJoin(pages, eq(pageBlocks.pageId, pages.id))
    .where(eq(pageBlocks.blockId, id));

  return c.json({ data: { ...block, usage } });
});

/** POST / - Create block */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();

  const [row] = await db.insert(blocks).values({
    typeId: parsed.data.typeId,
    title: parsed.data.title,
    fields: parsed.data.fields,
    isReusable: parsed.data.isReusable,
    createdAt: now,
    updatedAt: now,
    createdBy: payload.sub,
  }).returning();

  return c.json({ data: row }, 201);
});

/** PUT /:id - Update block */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = blockSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const [existing] = await db.select({ id: blocks.id }).from(blocks).where(eq(blocks.id, id)).limit(1);
  if (!existing) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Block not found' }] }, 404);

  await db.update(blocks).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(blocks.id, id));
  const [updated] = await db.select().from(blocks).where(eq(blocks.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete block (only if not in use) */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const refs = await db.select({ id: pageBlocks.id }).from(pageBlocks).where(eq(pageBlocks.blockId, id)).limit(1);
  if (refs.length > 0) {
    return c.json({ errors: [{ code: 'IN_USE', message: 'Block is still referenced by pages' }] }, 409);
  }

  await db.delete(blocks).where(eq(blocks.id, id));
  return c.json({ data: { deleted: true } });
});

export default app;
