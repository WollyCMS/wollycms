import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { contentTypes } from '../../db/schema/index.js';

const app = new Hono();

const fieldDefSchema: z.ZodType<any> = z.object({
  name: z.string().min(1),
  label: z.string().optional(),
  type: z.string().min(1),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  settings: z.record(z.unknown()).optional(),
  fields: z.lazy(() => z.array(fieldDefSchema)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const regionSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  allowed_types: z.array(z.string()).nullable().optional(),
});

const contentTypeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().default(null),
  fieldsSchema: z.array(fieldDefSchema).default([]),
  regions: z.array(regionSchema).default([]),
  settings: z.record(z.unknown()).nullable().default(null),
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

  const [row] = await db.insert(contentTypes).values(parsed.data).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id - Update content type */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = contentTypeSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(contentTypes).set(parsed.data).where(eq(contentTypes.id, id));
  const [updated] = await db.select().from(contentTypes).where(eq(contentTypes.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete content type */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(contentTypes).where(eq(contentTypes.id, id));
  return c.json({ data: { deleted: true } });
});

export default app;
