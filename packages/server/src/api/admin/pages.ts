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
import { clearOgCache } from '../content/og-image.js';
import pageBlocksRouter from './page-blocks.js';
import pageTermsRouter from './page-terms.js';
import { requireRole } from '../../auth/rbac.js';
import { loadConfig } from './config.js';
import { hooks } from '../../hooks.js';
import { indexPage, deindexPage, extractPageBody } from '../../search-index.js';

/** Validate a workflow status transition. Returns error message or null if valid. */
async function validateTransition(
  fromStatus: string,
  toStatus: string,
  userRole: string,
): Promise<string | null> {
  if (fromStatus === toStatus) return null; // No transition
  const config = await loadConfig();
  const stages = config.workflow?.stages;
  if (!stages || stages.length === 0) return null; // No workflow configured

  const fromStage = stages.find((s: { slug: string }) => s.slug === fromStatus);
  if (!fromStage) return null; // Unknown source status, allow (backward compat)

  const toStage = stages.find((s: { slug: string }) => s.slug === toStatus);
  if (!toStage) return `Invalid status: "${toStatus}"`;

  // Check transition is allowed
  if (!fromStage.transitions.includes(toStatus)) {
    return `Cannot transition from "${fromStage.label}" to "${toStage.label}"`;
  }

  // Check role requirement
  if (toStage.requiredRole) {
    const roleWeight: Record<string, number> = { viewer: 0, editor: 1, admin: 2 };
    const userWeight = roleWeight[userRole] ?? 0;
    const requiredWeight = roleWeight[toStage.requiredRole] ?? 0;
    if (userWeight < requiredWeight) {
      return `"${toStage.label}" requires ${toStage.requiredRole} role`;
    }
  }

  return null;
}

const app = new Hono();

app.post('/*', requireRole('editor'));
app.put('/*', requireRole('editor'));
app.delete('/*', requireRole('editor'));

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  typeId: z.number().int().positive(),
  status: z.string().min(1).default('draft'),
  fields: z.record(z.unknown()).default({}),
  scheduledAt: z.string().nullable().optional(),
  unpublishAt: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonicalUrl: z.string().nullable().optional(),
  robots: z.string().nullable().optional(),
  locale: z.string().min(2).max(10).optional(),
  translationGroupId: z.string().nullable().optional(),
});

const pageUpdateSchema = pageSchema.partial().extend({
  revisionNote: z.string().optional(),
});

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** GET / - List all pages (any status) with filtering and pagination */
app.get('/', async (c) => {
  const db = getDb();
  const typeSlug = c.req.query('type');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const locale = c.req.query('locale');
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
      unpublishAt: pages.unpublishAt,
      locale: pages.locale,
      translationGroupId: pages.translationGroupId,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .$dynamic();

  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(pages.status, status as 'draft' | 'published' | 'archived'));
  if (locale) conditions.push(eq(pages.locale, locale));

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
    data: rows.map((r: typeof rows[0]) => ({
      id: r.id, type: r.typeSlug, typeName: r.typeName, title: r.title, slug: r.slug,
      status: r.status, fields: r.fields,
      scheduledAt: r.scheduledAt,
      unpublishAt: r.unpublishAt,
      locale: r.locale,
      translationGroupId: r.translationGroupId,
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
  clearOgCache();
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
      metaTitle: pages.metaTitle, metaDescription: pages.metaDescription,
      ogImage: pages.ogImage, canonicalUrl: pages.canonicalUrl, robots: pages.robots,
      locale: pages.locale, translationGroupId: pages.translationGroupId,
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
      unpublishAt: page.unpublishAt,
      metaTitle: page.metaTitle, metaDescription: page.metaDescription,
      ogImage: page.ogImage, canonicalUrl: page.canonicalUrl, robots: page.robots,
      locale: page.locale, translationGroupId: page.translationGroupId,
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
  const config = await loadConfig();
  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();
  const slug = parsed.data.slug || slugify(parsed.data.title);
  const pageLocale = parsed.data.locale || config.defaultLocale;

  const existing = await db.select({ id: pages.id }).from(pages).where(and(eq(pages.slug, slug), eq(pages.locale, pageLocale))).limit(1);
  if (existing.length > 0) return c.json({ errors: [{ code: 'CONFLICT', message: 'Slug already exists' }] }, 409);

  // Lifecycle hook: beforeCreate (can throw to abort, can modify data)
  const hookCtx = { data: parsed.data as Record<string, unknown>, user: { id: payload.sub, email: payload.email, role: payload.role } };
  try { await hooks.runBefore('beforeCreate', hookCtx); } catch (err: any) {
    return c.json({ errors: [{ code: 'HOOK_REJECTED', message: err.message || 'Blocked by beforeCreate hook' }] }, 400);
  }

  const [row] = await db.insert(pages).values({
    typeId: parsed.data.typeId,
    title: parsed.data.title,
    slug,
    status: parsed.data.status,
    locale: pageLocale,
    translationGroupId: parsed.data.translationGroupId || null,
    fields: parsed.data.fields,
    scheduledAt: parsed.data.scheduledAt ?? null,
    unpublishAt: parsed.data.unpublishAt ?? null,
    createdAt: now,
    updatedAt: now,
    publishedAt: parsed.data.status === 'published' ? now : null,
    createdBy: payload.sub,
  }).returning();

  // Auto-populate default blocks from content type
  const [ct] = await db.select({ defaultBlocks: contentTypes.defaultBlocks })
    .from(contentTypes).where(eq(contentTypes.id, parsed.data.typeId)).limit(1);
  const defaults = (ct?.defaultBlocks as import('../../db/schema/content-types.js').DefaultBlockDefinition[] | null) ?? [];
  if (defaults.length > 0) {
    // Resolve block type slugs to IDs
    const slugs = [...new Set(defaults.map((d) => d.blockTypeSlug))];
    const btRows = await db.select({ id: blockTypes.id, slug: blockTypes.slug })
      .from(blockTypes).where(inArray(blockTypes.slug, slugs));
    const slugToId = Object.fromEntries(btRows.map((bt: typeof btRows[number]) => [bt.slug, bt.id]));

    for (const def of defaults) {
      const typeId = slugToId[def.blockTypeSlug];
      if (!typeId) continue; // skip if block type not found
      const [newBlock] = await db.insert(blocks).values({
        typeId,
        title: null,
        fields: def.fields ?? {},
        isReusable: false,
        createdAt: now,
        updatedAt: now,
        createdBy: payload.sub,
      }).returning();
      await db.insert(pageBlocks).values({
        pageId: row.id,
        blockId: newBlock.id,
        region: def.region,
        position: def.position,
        isShared: false,
      });
    }
  }

  await logAudit(c, { action: 'create', entity: 'page', entityId: row.id, details: { title: row.title, slug } });
  fireWebhooks('page.created', { id: row.id, title: row.title, slug });
  if (row.status === 'published') {
    fireWebhooks('page.published', { id: row.id, title: row.title, slug });
  }
  cacheInvalidate('pages:');
  clearOgCache();

  // Lifecycle hook: afterCreate
  hooks.runAfter('afterCreate', { entity: row as unknown as Record<string, unknown>, id: row.id, user: { id: payload.sub, email: payload.email, role: payload.role } });

  // Index for full-text search (best-effort, don't block response)
  indexPage(row.id, row.title, slug, '', row.metaDescription || null).catch(() => {});

  return c.json({ data: row }, 201);
});

/** POST /upsert - Create or update page by slug */
app.post('/upsert', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = pageSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message, path: i.path })) }, 400);

  const db = getDb();
  const config = await loadConfig();
  const payload = c.get('jwtPayload');
  const now = new Date().toISOString();
  const slug = parsed.data.slug || slugify(parsed.data.title);
  const pageLocale = parsed.data.locale || config.defaultLocale;

  const [existing] = await db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.locale, pageLocale))).limit(1);

  if (!existing) {
    // Create — same logic as POST /
    const [row] = await db.insert(pages).values({
      typeId: parsed.data.typeId,
      title: parsed.data.title,
      slug,
      status: parsed.data.status,
      locale: pageLocale,
      translationGroupId: parsed.data.translationGroupId || null,
      fields: parsed.data.fields,
      scheduledAt: parsed.data.scheduledAt ?? null,
      createdAt: now,
      updatedAt: now,
      publishedAt: parsed.data.status === 'published' ? now : null,
      createdBy: payload.sub,
    }).returning();

    // Auto-populate default blocks from content type
    const [ct] = await db.select({ defaultBlocks: contentTypes.defaultBlocks })
      .from(contentTypes).where(eq(contentTypes.id, parsed.data.typeId)).limit(1);
    const defaults = (ct?.defaultBlocks as import('../../db/schema/content-types.js').DefaultBlockDefinition[] | null) ?? [];
    if (defaults.length > 0) {
      const slugs = [...new Set(defaults.map((d) => d.blockTypeSlug))];
      const btRows = await db.select({ id: blockTypes.id, slug: blockTypes.slug })
        .from(blockTypes).where(inArray(blockTypes.slug, slugs));
      const slugToId = Object.fromEntries(btRows.map((bt: typeof btRows[number]) => [bt.slug, bt.id]));

      for (const def of defaults) {
        const typeId = slugToId[def.blockTypeSlug];
        if (!typeId) continue;
        const [newBlock] = await db.insert(blocks).values({
          typeId,
          title: null,
          fields: def.fields ?? {},
          isReusable: false,
          createdAt: now,
          updatedAt: now,
          createdBy: payload.sub,
        }).returning();
        await db.insert(pageBlocks).values({
          pageId: row.id,
          blockId: newBlock.id,
          region: def.region,
          position: def.position,
          isShared: false,
        });
      }
    }

    await logAudit(c, { action: 'create', entity: 'page', entityId: row.id, details: { title: row.title, slug } });
    fireWebhooks('page.created', { id: row.id, title: row.title, slug });
    if (row.status === 'published') {
      fireWebhooks('page.published', { id: row.id, title: row.title, slug });
    }
    cacheInvalidate('pages:');
    clearOgCache();

    return c.json({ data: row, created: true }, 201);
  }

  // Update — same logic as PUT /:id
  const id = existing.id;

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
    blocks: currentBlocks.map((b: typeof currentBlocks[0]) => ({
      region: b.region, position: b.position, isShared: b.isShared,
      overrides: b.overrides, blockId: b.isShared ? b.blockId : undefined,
      blockType: b.blockTypeSlug, title: b.blockTitle, fields: b.blockFields,
    })),
    note: null,
    createdAt: now,
    createdBy: payload.sub,
  });

  const updates: Record<string, unknown> = {
    typeId: parsed.data.typeId,
    title: parsed.data.title,
    slug,
    status: parsed.data.status,
    fields: parsed.data.fields,
    scheduledAt: parsed.data.scheduledAt ?? null,
    unpublishAt: parsed.data.unpublishAt ?? null,
    metaTitle: parsed.data.metaTitle ?? null,
    metaDescription: parsed.data.metaDescription ?? null,
    ogImage: parsed.data.ogImage ?? null,
    canonicalUrl: parsed.data.canonicalUrl ?? null,
    robots: parsed.data.robots ?? null,
    updatedAt: now,
  };
  if (parsed.data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = now;
  }

  await db.update(pages).set(updates).where(eq(pages.id, id));
  const [updated] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);

  await logAudit(c, { action: 'update', entity: 'page', entityId: id, details: { title: updated.title } });
  fireWebhooks('page.updated', { id, title: updated.title, slug: updated.slug });

  // Detect publish/unpublish transitions
  if (parsed.data.status === 'published' && existing.status !== 'published') {
    fireWebhooks('page.published', { id, title: updated.title, slug: updated.slug });

    // Auto-generate OG image on first publish if none exists
    if (!updated.ogImage) {
      const [ct] = await db.select({ name: contentTypes.name }).from(contentTypes).where(eq(contentTypes.id, updated.typeId)).limit(1);
      import('../../og/generate.js').then(({ generateAndStoreOgImage }) => {
        generateAndStoreOgImage(id, {
          title: updated.metaTitle || updated.title,
          description: updated.metaDescription,
          siteName: 'WollyCMS',
          contentType: ct?.name,
        }, updated.slug).catch(() => { /* best-effort */ });
      }).catch(() => {});
    }
  } else if (parsed.data.status !== 'published' && existing.status === 'published') {
    fireWebhooks('page.unpublished', { id, title: updated.title, slug: updated.slug });
  }

  cacheInvalidate('pages:');
  clearOgCache();
  return c.json({ data: updated, created: false });
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
    const checkLocale = parsed.data.locale || existing.locale;
    const dup = await db.select({ id: pages.id }).from(pages).where(and(eq(pages.slug, parsed.data.slug), eq(pages.locale, checkLocale))).limit(1);
    if (dup.length > 0) return c.json({ errors: [{ code: 'CONFLICT', message: 'Slug already exists' }] }, 409);
  }

  const now = new Date().toISOString();
  const payload = c.get('jwtPayload');

  // Validate workflow transition
  if (parsed.data.status && parsed.data.status !== existing.status) {
    const transErr = await validateTransition(existing.status!, parsed.data.status, payload.role);
    if (transErr) return c.json({ errors: [{ code: 'WORKFLOW', message: transErr }] }, 400);
  }

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
    blocks: currentBlocks.map((b: typeof currentBlocks[0]) => ({
      region: b.region, position: b.position, isShared: b.isShared,
      overrides: b.overrides, blockId: b.isShared ? b.blockId : undefined,
      blockType: b.blockTypeSlug, title: b.blockTitle, fields: b.blockFields,
    })),
    note: parsed.data.revisionNote || null,
    createdAt: now,
    createdBy: payload.sub,
  });

  // Lifecycle hook: beforeUpdate
  const updateHookCtx = { data: parsed.data as Record<string, unknown>, entity: existing as unknown as Record<string, unknown>, id, user: { id: payload.sub, email: payload.email, role: payload.role } };
  try { await hooks.runBefore('beforeUpdate', updateHookCtx); } catch (err: any) {
    return c.json({ errors: [{ code: 'HOOK_REJECTED', message: err.message || 'Blocked by beforeUpdate hook' }] }, 400);
  }

  // Detect publish/unpublish transitions for hooks
  const isPublishing = parsed.data.status === 'published' && existing.status !== 'published';
  const isUnpublishing = parsed.data.status && parsed.data.status !== 'published' && existing.status === 'published';

  if (isPublishing) {
    try { await hooks.runBefore('beforePublish', updateHookCtx); } catch (err: any) {
      return c.json({ errors: [{ code: 'HOOK_REJECTED', message: err.message || 'Blocked by beforePublish hook' }] }, 400);
    }
  }
  if (isUnpublishing) {
    try { await hooks.runBefore('beforeUnpublish', updateHookCtx); } catch (err: any) {
      return c.json({ errors: [{ code: 'HOOK_REJECTED', message: err.message || 'Blocked by beforeUnpublish hook' }] }, 400);
    }
  }

  const { revisionNote: _note, ...pageFields } = parsed.data;
  const updates: Record<string, unknown> = { ...pageFields, updatedAt: now };
  if (parsed.data.translationGroupId !== undefined) {
    updates.translationGroupId = parsed.data.translationGroupId;
  }
  if (parsed.data.status === 'published' && !existing.publishedAt) {
    updates.publishedAt = now;
  }

  await db.update(pages).set(updates).where(eq(pages.id, id));
  const [updated] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);

  await logAudit(c, { action: 'update', entity: 'page', entityId: id, details: { title: updated.title } });
  fireWebhooks('page.updated', { id, title: updated.title, slug: updated.slug });

  if (isPublishing) {
    fireWebhooks('page.published', { id, title: updated.title, slug: updated.slug });
    hooks.runAfter('afterPublish', { entity: updated as unknown as Record<string, unknown>, id, user: { id: payload.sub, email: payload.email, role: payload.role } });

    // Auto-generate OG image on first publish if none exists
    if (!updated.ogImage) {
      const [ct] = await db.select({ name: contentTypes.name }).from(contentTypes).where(eq(contentTypes.id, updated.typeId)).limit(1);
      import('../../og/generate.js').then(({ generateAndStoreOgImage }) => {
        generateAndStoreOgImage(id, {
          title: updated.metaTitle || updated.title,
          description: updated.metaDescription,
          siteName: 'WollyCMS',
          contentType: ct?.name,
        }, updated.slug).catch(() => { /* best-effort */ });
      }).catch(() => {});
    }
  } else if (isUnpublishing) {
    fireWebhooks('page.unpublished', { id, title: updated.title, slug: updated.slug });
    hooks.runAfter('afterUnpublish', { entity: updated as unknown as Record<string, unknown>, id, user: { id: payload.sub, email: payload.email, role: payload.role } });
  }

  // Lifecycle hook: afterUpdate
  hooks.runAfter('afterUpdate', { entity: updated as unknown as Record<string, unknown>, id, user: { id: payload.sub, email: payload.email, role: payload.role } });

  // Re-index for full-text search (fetch block content for body text)
  db.select({ fields: blocks.fields })
    .from(pageBlocks)
    .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
    .where(eq(pageBlocks.pageId, id))
    .then((blockRows: Array<{ fields: Record<string, unknown> | null }>) => {
      const bx = blockRows.map((r: { fields: Record<string, unknown> | null }) => ({ fields: (r.fields || {}) as Record<string, unknown> }));
      return indexPage(id, updated.title, updated.slug, extractPageBody(bx), updated.metaDescription || null);
    }).catch(() => {});

  cacheInvalidate('pages:');
  clearOgCache();
  return c.json({ data: updated });
});

/** DELETE /:id - Delete page */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const payload = c.get('jwtPayload');
  const [existing] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!existing) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  // Lifecycle hook: beforeDelete
  try { await hooks.runBefore('beforeDelete', { entity: existing as unknown as Record<string, unknown>, id, user: { id: payload.sub, email: payload.email, role: payload.role } }); } catch (err: any) {
    return c.json({ errors: [{ code: 'HOOK_REJECTED', message: err.message || 'Blocked by beforeDelete hook' }] }, 400);
  }

  await db.delete(pageBlocks).where(eq(pageBlocks.pageId, id));
  await db.delete(pages).where(eq(pages.id, id));
  await logAudit(c, { action: 'delete', entity: 'page', entityId: id, details: { title: existing.title } });
  fireWebhooks('page.deleted', { id, title: existing.title, slug: existing.slug });
  cacheInvalidate('pages:');
  clearOgCache();

  // Lifecycle hook: afterDelete
  hooks.runAfter('afterDelete', { entity: existing as unknown as Record<string, unknown>, id, user: { id: payload.sub, email: payload.email, role: payload.role } });

  // Remove from search index
  deindexPage(id).catch(() => {});

  return c.json({ data: { deleted: true } });
});

/** POST /:id/translate - Create a translation of an existing page. */
app.post('/:id/translate', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ locale: z.string().min(2).max(10) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Target locale required' }] }, 400);
  }

  const db = getDb();
  const [source] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
  if (!source) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);

  // Check target locale doesn't already exist for this slug
  const [existing] = await db.select({ id: pages.id }).from(pages)
    .where(and(eq(pages.slug, source.slug), eq(pages.locale, parsed.data.locale)))
    .limit(1);
  if (existing) {
    return c.json({ errors: [{ code: 'CONFLICT', message: 'Translation already exists for this locale' }] }, 409);
  }

  // Ensure source has a translationGroupId
  let groupId = source.translationGroupId;
  if (!groupId) {
    groupId = crypto.randomUUID();
    await db.update(pages).set({ translationGroupId: groupId }).where(eq(pages.id, id));
  }

  // Check if a translation already exists in this group for the target locale
  const [groupExisting] = await db.select({ id: pages.id }).from(pages)
    .where(and(eq(pages.translationGroupId, groupId), eq(pages.locale, parsed.data.locale)))
    .limit(1);
  if (groupExisting) {
    return c.json({ errors: [{ code: 'CONFLICT', message: 'Translation already exists in this group' }] }, 409);
  }

  const now = new Date().toISOString();
  const payload = c.get('jwtPayload');
  const [newPage] = await db.insert(pages).values({
    typeId: source.typeId,
    title: source.title,
    slug: source.slug,
    status: 'draft',
    locale: parsed.data.locale,
    translationGroupId: groupId,
    fields: source.fields,
    metaTitle: source.metaTitle,
    metaDescription: source.metaDescription,
    ogImage: source.ogImage,
    canonicalUrl: source.canonicalUrl,
    robots: source.robots,
    createdAt: now,
    updatedAt: now,
    createdBy: payload.sub,
  }).returning();

  return c.json({ data: { id: newPage.id, locale: parsed.data.locale, translationGroupId: groupId } }, 201);
});

/** GET /:id/translations - Get all translations of a page. */
app.get('/:id/translations', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const db = getDb();
  const [page] = await db.select({ translationGroupId: pages.translationGroupId }).from(pages)
    .where(eq(pages.id, id)).limit(1);
  if (!page) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  if (!page.translationGroupId) return c.json({ data: [] });

  const siblings = await db.select({
    id: pages.id, locale: pages.locale, title: pages.title, slug: pages.slug, status: pages.status,
  }).from(pages).where(eq(pages.translationGroupId, page.translationGroupId));

  return c.json({ data: siblings });
});

// Mount page-block sub-routes (add/update/delete blocks, duplicate, reorder)
app.route('/', pageBlocksRouter);

// Mount page-terms sub-routes (get/set taxonomy terms for a page)
app.route('/', pageTermsRouter);

export default app;
