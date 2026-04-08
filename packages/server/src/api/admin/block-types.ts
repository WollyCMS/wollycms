import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { blockTypes } from '../../db/schema/index.js';
import { requireRole } from '../../auth/rbac.js';

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
  settings: z.record(z.unknown()).optional(),
  fields: z.lazy(() => z.array(fieldDefSchema)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const blockTypeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().default(null),
  fieldsSchema: z.array(fieldDefSchema).default([]),
  icon: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  settings: z.record(z.unknown()).nullable().default(null),
});

/** GET / - List all block types */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(blockTypes).orderBy(asc(blockTypes.name));
  return c.json({ data: rows });
});

/** GET /:id - Get block type */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db.select().from(blockTypes).where(eq(blockTypes.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Block type not found' }] }, 404);
  return c.json({ data: row });
});

/** POST / - Create block type */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = blockTypeSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const [existing] = await db.select({ id: blockTypes.id }).from(blockTypes).where(eq(blockTypes.slug, parsed.data.slug)).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Block type slug already exists' }] }, 409);

  const [row] = await db.insert(blockTypes).values(parsed.data).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id - Update block type */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = blockTypeSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(blockTypes).set(parsed.data).where(eq(blockTypes.id, id));
  const [updated] = await db.select().from(blockTypes).where(eq(blockTypes.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete block type */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(blockTypes).where(eq(blockTypes.id, id));
  return c.json({ data: { deleted: true } });
});

export default app;
