import { Hono } from 'hono';
import { eq, and, asc, like, not } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { contentTypes, pages } from '../../db/schema/index.js';
import { requireRole } from '../../auth/rbac.js';

/**
 * Read a slug prefix from a content type settings object.
 * Returns the normalized prefix with trailing slash, or null if unset.
 */
function readSlugPrefix(settings: Record<string, unknown> | null | undefined): string | null {
  if (!settings) return null;
  const raw = settings.slugPrefix;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^\/+/, '');
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

/**
 * When a content type's slug prefix is newly enabled or changed, mark all
 * existing pages of that type whose slug does not start with the new prefix
 * as slug_override=true. This makes enabling the feature strictly
 * non-destructive: no URLs change, and future page edits on old pages
 * continue to work without violating the new rule. New pages created after
 * this point will get the prefix applied automatically.
 */
async function sweepSlugOverrideForPrefix(
  db: ReturnType<typeof getDb>,
  typeId: number,
  newPrefix: string | null,
): Promise<number> {
  if (!newPrefix) return 0;
  // Pages of this content type whose slug doesn't start with the new prefix
  // get grandfathered in via slug_override=true so enabling the feature
  // can't break an existing URL. Rows that are already overridden are left
  // alone so the audit trail stays meaningful. Using .returning() for the
  // affected rows so the count is portable across sqlite/pg drivers.
  const affected = await db.update(pages)
    .set({ slugOverride: true })
    .where(and(
      eq(pages.typeId, typeId),
      eq(pages.slugOverride, false),
      not(like(pages.slug, `${newPrefix}%`)),
    ))
    .returning({ id: pages.id });
  return affected.length;
}

const app = new Hono();

// Schema mutations require admin role
app.post('/*', requireRole('admin'));
app.put('/*', requireRole('admin'));
app.delete('/*', requireRole('admin'));

const fieldDefSchema: z.ZodType<any> = z.object({
  name: z.string().min(1),
  label: z.string().optional(),
  type: z.string().min(1),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  fields: z.lazy(() => z.array(fieldDefSchema)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const regionSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  allowed_types: z.array(z.string()).nullable().optional(),
});

const defaultBlockSchema = z.object({
  region: z.string().min(1),
  blockTypeSlug: z.string().min(1),
  position: z.number().int().min(0),
  fields: z.record(z.string(), z.unknown()).optional(),
});

const contentTypeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().default(null),
  fieldsSchema: z.array(fieldDefSchema).default([]),
  regions: z.array(regionSchema).default([]),
  defaultBlocks: z.array(defaultBlockSchema).nullable().default(null),
  settings: z.record(z.string(), z.unknown()).nullable().default(null),
});

// Omitted update fields must not receive create defaults in Zod 4.
const contentTypeUpdateSchema = contentTypeSchema.partial().extend({
  description: contentTypeSchema.shape.description.removeDefault().optional(),
  fieldsSchema: contentTypeSchema.shape.fieldsSchema.removeDefault().optional(),
  regions: contentTypeSchema.shape.regions.removeDefault().optional(),
  defaultBlocks: contentTypeSchema.shape.defaultBlocks.removeDefault().optional(),
  settings: contentTypeSchema.shape.settings.removeDefault().optional(),
});

/** GET / - List all content types */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(contentTypes).orderBy(asc(contentTypes.name));
  return c.json({ data: rows });
});

/** GET /:id - Get content type */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db.select().from(contentTypes).where(eq(contentTypes.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Content type not found' }] }, 404);
  return c.json({ data: row });
});

/** POST / - Create content type */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = contentTypeSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const [existing] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, parsed.data.slug)).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Content type slug already exists' }] }, 409);

  const [row] = await db.insert(contentTypes).values(parsed.data as typeof contentTypes.$inferInsert).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id - Update content type */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = contentTypeUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  // Capture the old slug prefix before the update so we can detect when it
  // changes and sweep existing pages below.
  const [priorRow] = await db.select({ settings: contentTypes.settings })
    .from(contentTypes).where(eq(contentTypes.id, id)).limit(1);
  const priorPrefix = readSlugPrefix(priorRow?.settings);

  await db.update(contentTypes).set(parsed.data as Partial<typeof contentTypes.$inferInsert>).where(eq(contentTypes.id, id));
  const [updated] = await db.select().from(contentTypes).where(eq(contentTypes.id, id)).limit(1);

  // If the slug prefix was newly set or changed, non-destructively
  // grandfather in existing pages whose slugs don't match.
  const newPrefix = readSlugPrefix(updated?.settings);
  let sweptOverrides = 0;
  if (newPrefix && newPrefix !== priorPrefix) {
    sweptOverrides = await sweepSlugOverrideForPrefix(db, id, newPrefix);
  }

  return c.json({ data: updated, meta: { sweptOverrides } });
});

/** DELETE /:id - Delete content type */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(contentTypes).where(eq(contentTypes.id, id));
  return c.json({ data: { deleted: true } });
});

export default app;
