import { Hono } from 'hono';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import {
  pages, contentTypes, blocks, blockTypes, pageBlocks,
} from '../../db/schema/index.js';

const app = new Hono();

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  typeId: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  fields: z.record(z.unknown()).default({}),
});

const pageUpdateSchema = pageSchema.partial();

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** GET / - List all pages (any status) with filtering and pagination */
app.get('/', async (c) => {
  const db = getDb();
  const typeSlug = c.req.query('type');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const sortParam = c.req.query('sort') || 'updated_at:desc';
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let query = db
    .select({
      id: pages.id,
      typeSlug: contentTypes.slug,
      typeName: contentTypes.name,
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
    .$dynamic();

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(pages.status, status as 'draft' | 'published' | 'archived'));

  if (typeSlug) {
    const [typeRow] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, typeSlug)).limit(1);
    if (typeRow) conditions.push(eq(pages.typeId, typeRow.id));
  }

  if (search) {
    conditions.push(sql`${pages.title} LIKE ${'%' + search + '%'}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const [sortField, sortDir] = sortParam.split(':');
  const sortFn = sortDir === 'asc' ? asc : desc;
  const sortCol = sortField === 'title' ? pages.title : sortField === 'created_at' ? pages.createdAt : pages.updatedAt;

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(pages).where(conditions.length > 0 ? and(...conditions) : undefined);

  const rows = await query.orderBy(sortFn(sortCol)).limit(limit).offset(offset);

  return c.json({
    data: rows.map((r) => ({
      id: r.id, type: r.typeSlug, typeName: r.typeName, title: r.title, slug: r.slug,
      status: r.status, fields: r.fields,
      meta: { created_at: r.createdAt, updated_at: r.updatedAt, published_at: r.publishedAt },
    })),
    meta: { total: countResult[0].count, limit, offset },
  });
});

/** GET /:id - Get single page by ID with resolved blocks */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [page] = await db
    .select({
      id: pages.id, typeId: pages.typeId, typeSlug: contentTypes.slug,
      title: pages.title, slug: pages.slug, status: pages.status, fields: pages.fields,
      createdAt: pages.createdAt, updatedAt: pages.updatedAt, publishedAt: pages.publishedAt,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .where(eq(pages.id, id))
    .limit(1);

  if (!page) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  const pbRows = await db
    .select({
      pbId: pageBlocks.id, region: pageBlocks.region, position: pageBlocks.position,
      isShared: pageBlocks.isShared, overrides: pageBlocks.overrides,
      blockId: blocks.id, blockFields: blocks.fields, blockTitle: blocks.title,
      blockTypeSlug: blockTypes.slug, blockTypeId: blocks.typeId,
    })
    .from(pageBlocks)
    .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
    .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
    .where(eq(pageBlocks.pageId, page.id))
    .orderBy(asc(pageBlocks.region), asc(pageBlocks.position));

  const regions: Record<string, unknown[]> = {};
  for (const pb of pbRows) {
    if (!regions[pb.region]) regions[pb.region] = [];
    let resolvedFields = pb.blockFields || {};
    if (pb.isShared && pb.overrides) resolvedFields = { ...resolvedFields, ...pb.overrides };
    const entry: Record<string, unknown> = {
      id: `pb_${pb.pbId}`, pb_id: pb.pbId, block_id: pb.blockId,
      block_type: pb.blockTypeSlug, block_type_id: pb.blockTypeId,
      title: pb.blockTitle, fields: resolvedFields, is_shared: pb.isShared,
    };
    regions[pb.region].push(entry);
  }

  return c.json({
    data: {
      id: page.id, typeId: page.typeId, type: page.typeSlug,
      title: page.title, slug: page.slug, status: page.status, fields: page.fields,
      regions,
      meta: { created_at: page.createdAt, updated_at: page.updatedAt, published_at: page.publishedAt },
    },
  });
});

/** POST / - Create page */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = pageSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message, path: i.path })) }, 400);

  const db = getDb();
  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();
  const slug = parsed.data.slug || slugify(parsed.data.title);

  const existing = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1);
  if (existing.length > 0) return c.json({ errors: [{ code: 'CONFLICT', message: 'Slug already exists' }] }, 409);

  const [row] = await db.insert(pages).values({
    typeId: parsed.data.typeId,
    title: parsed.data.title,
    slug,
    status: parsed.data.status,
    fields: parsed.data.fields,
    createdAt: now,
    updatedAt: now,
    publishedAt: parsed.data.status === 'published' ? now : null,
    createdBy: payload.sub,
  }).returning();

  return c.json({ data: row }, 201);
});

/** PUT /:id - Update page */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = pageUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message, path: i.path })) }, 400);

  const [existing] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!existing) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const dup = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, parsed.data.slug)).limit(1);
    if (dup.length > 0) return c.json({ errors: [{ code: 'CONFLICT', message: 'Slug already exists' }] }, 409);
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: now };
  if (parsed.data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = now;
  }

  await db.update(pages).set(updates).where(eq(pages.id, id));
  const [updated] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete page */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.id, id)).limit(1);
  if (!existing) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  await db.delete(pages).where(eq(pages.id, id));
  return c.json({ data: { deleted: true } });
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

  // Delete inline (non-shared) blocks that are no longer referenced
  if (!pb.isShared) {
    const refs = await db.select({ id: pageBlocks.id }).from(pageBlocks).where(eq(pageBlocks.blockId, pb.blockId)).limit(1);
    if (refs.length === 0) {
      await db.delete(blocks).where(eq(blocks.id, pb.blockId));
    }
  }

  return c.json({ data: { deleted: true } });
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
