import { Hono } from 'hono';
import { eq, asc, and } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { taxonomies, terms, contentTerms } from '../../db/schema/index.js';

const app = new Hono();

/** GET / - List all taxonomies */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(taxonomies).orderBy(asc(taxonomies.name));
  return c.json({ data: rows });
});

/** GET /:id - Get taxonomy with terms */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [tax] = await db.select().from(taxonomies).where(eq(taxonomies.id, id)).limit(1);
  if (!tax) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Taxonomy not found' }] }, 404);

  const termRows = await db.select().from(terms).where(eq(terms.taxonomyId, id)).orderBy(asc(terms.weight), asc(terms.name));

  let termData: any[];
  if (tax.hierarchical) {
    const map = new Map<number, any>();
    termData = [];
    for (const t of termRows) map.set(t.id, { ...t, children: [] });
    for (const t of termRows) {
      const node = map.get(t.id)!;
      if (t.parentId && map.has(t.parentId)) {
        map.get(t.parentId)!.children.push(node);
      } else {
        termData.push(node);
      }
    }
  } else {
    termData = termRows;
  }

  return c.json({ data: { ...tax, terms: termData } });
});

/** POST / - Create taxonomy */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().nullable().default(null),
    hierarchical: z.boolean().default(false),
    settings: z.record(z.unknown()).nullable().default(null),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const [existing] = await db.select({ id: taxonomies.id }).from(taxonomies).where(eq(taxonomies.slug, parsed.data.slug)).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Taxonomy slug already exists' }] }, 409);

  const [row] = await db.insert(taxonomies).values(parsed.data).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id - Update taxonomy */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    hierarchical: z.boolean().optional(),
    settings: z.record(z.unknown()).nullable().optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(taxonomies).set(parsed.data).where(eq(taxonomies.id, id));
  const [updated] = await db.select().from(taxonomies).where(eq(taxonomies.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete taxonomy (cascades terms) */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(taxonomies).where(eq(taxonomies.id, id));
  return c.json({ data: { deleted: true } });
});

/** POST /:id/terms - Create term */
app.post('/:id/terms', async (c) => {
  const db = getDb();
  const taxonomyId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const parsed = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    parentId: z.number().int().nullable().default(null),
    weight: z.number().int().default(0),
    fields: z.record(z.unknown()).nullable().default(null),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const [existing] = await db.select({ id: terms.id }).from(terms)
    .where(and(eq(terms.taxonomyId, taxonomyId), eq(terms.slug, parsed.data.slug))).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Term slug already exists in this taxonomy' }] }, 409);

  const [row] = await db.insert(terms).values({ taxonomyId, ...parsed.data }).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id/terms/:termId - Update term */
app.put('/:id/terms/:termId', async (c) => {
  const db = getDb();
  const termId = parseInt(c.req.param('termId'), 10);
  const body = await c.req.json().catch(() => null);

  const parsed = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    parentId: z.number().int().nullable().optional(),
    weight: z.number().int().optional(),
    fields: z.record(z.unknown()).nullable().optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(terms).set(parsed.data).where(eq(terms.id, termId));
  const [updated] = await db.select().from(terms).where(eq(terms.id, termId)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id/terms/:termId - Delete term (cascades content_terms) */
app.delete('/:id/terms/:termId', async (c) => {
  const db = getDb();
  const termId = parseInt(c.req.param('termId'), 10);
  await db.delete(terms).where(eq(terms.id, termId));
  return c.json({ data: { deleted: true } });
});

export default app;
