import { Hono } from 'hono';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import {
  pages, pageRevisions, contentTypes, blocks, blockTypes, pageBlocks,
} from '../../db/schema/index.js';
import { fireWebhooks } from '../../webhooks.js';
import { logAudit } from '../../audit.js';
import { cacheInvalidate } from '../../cache.js';
import pageBlocksRouter from './page-blocks.js';

const app = new Hono();

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  typeId: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  fields: z.record(z.unknown()).default({}),
  scheduledAt: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  robots: z.string().nullable().optional(),
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
      scheduledAt: pages.scheduledAt,
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
    const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    conditions.push(sql`(${pages.title} LIKE ${'%' + escaped + '%'} OR ${pages.slug} LIKE ${'%' + escaped + '%'})`);
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
      scheduledAt: r.scheduledAt,
      meta: { created_at: r.createdAt, updated_at: r.updatedAt, published_at: r.publishedAt },
    })),
    meta: { total: countResult[0].count, limit, offset },
  });
});

/** POST /bulk - Bulk operations on pages */
app.post('/bulk', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    ids: z.array(z.number().int().positive()).min(1),
    action: z.enum(['publish', 'unpublish', 'archive', 'delete']),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const { ids, action } = parsed.data;
  const now = new Date().toISOString();

  if (action === 'delete') {
    await db.delete(pageBlocks).where(inArray(pageBlocks.pageId, ids));
    await db.delete(pages).where(inArray(pages.id, ids));
  } else {
    const statusMap = { publish: 'published', unpublish: 'draft', archive: 'archived' } as const;
    const updates: Record<string, unknown> = { status: statusMap[action], updatedAt: now };
    if (action === 'publish') updates.publishedAt = now;
    await db.update(pages).set(updates).where(inArray(pages.id, ids));
  }

  cacheInvalidate('pages:');
  return c.json({ data: { affected: ids.length, action } });
});

/** GET /:id - Get single page by ID with resolved blocks */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [page] = await db
    .select({
      id: pages.id, typeId: pages.typeId, typeSlug: contentTypes.slug,
      title: pages.title, slug: pages.slug, status: pages.status, fields: pages.fields,
      scheduledAt: pages.scheduledAt,
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
      scheduledAt: page.scheduledAt,
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
    scheduledAt: parsed.data.scheduledAt ?? null,
    createdAt: now,
    updatedAt: now,
    publishedAt: parsed.data.status === 'published' ? now : null,
    createdBy: payload.sub,
  }).returning();

  logAudit(c, { action: 'create', entity: 'page', entityId: row.id, details: { title: row.title, slug } });
  fireWebhooks('page.created', { id: row.id, title: row.title, slug });
  if (row.status === 'published') {
    fireWebhooks('page.published', { id: row.id, title: row.title, slug });
  }
  cacheInvalidate('pages:');

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
  const payload = c.get('jwtPayload');

  // Snapshot current state as a revision
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
    .where(eq(pageBlocks.pageId, id))
    .orderBy(asc(pageBlocks.region), asc(pageBlocks.position));

  await db.insert(pageRevisions).values({
    pageId: id,
    title: existing.title,
    slug: existing.slug,
    status: existing.status!,
    fields: existing.fields,
    blocks: currentBlocks.map((b) => ({
      region: b.region, position: b.position, isShared: b.isShared,
      overrides: b.overrides, blockId: b.isShared ? b.blockId : undefined,
      blockType: b.blockTypeSlug, title: b.blockTitle, fields: b.blockFields,
    })),
    createdAt: now,
    createdBy: payload.sub,
  });

  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: now };
  if (parsed.data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = now;
  }

  await db.update(pages).set(updates).where(eq(pages.id, id));
  const [updated] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);

  logAudit(c, { action: 'update', entity: 'page', entityId: id, details: { title: updated.title } });
  fireWebhooks('page.updated', { id, title: updated.title, slug: updated.slug });

  // Detect publish/unpublish transitions
  if (parsed.data.status === 'published' && existing.status !== 'published') {
    fireWebhooks('page.published', { id, title: updated.title, slug: updated.slug });
  } else if (parsed.data.status && parsed.data.status !== 'published' && existing.status === 'published') {
    fireWebhooks('page.unpublished', { id, title: updated.title, slug: updated.slug });
  }

  cacheInvalidate('pages:');
  return c.json({ data: updated });
});

/** DELETE /:id - Delete page */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [existing] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!existing) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  await db.delete(pageBlocks).where(eq(pageBlocks.pageId, id));
  await db.delete(pages).where(eq(pages.id, id));
  logAudit(c, { action: 'delete', entity: 'page', entityId: id, details: { title: existing.title } });
  fireWebhooks('page.deleted', { id, title: existing.title, slug: existing.slug });
  cacheInvalidate('pages:');
  return c.json({ data: { deleted: true } });
});

// Mount page-block sub-routes (add/update/delete blocks, duplicate, reorder)
app.route('/', pageBlocksRouter);

export default app;
