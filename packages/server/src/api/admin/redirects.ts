import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { redirects } from '../../db/schema/index.js';

const app = new Hono();

const redirectSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  statusCode: z.number().int().min(300).max(399).default(301),
  isActive: z.boolean().default(true),
});

/** GET / - List all redirects */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(redirects).orderBy(asc(redirects.fromPath));
  return c.json({ data: rows });
});

/** POST / - Create redirect */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = redirectSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const [existing] = await db.select({ id: redirects.id }).from(redirects).where(eq(redirects.fromPath, parsed.data.fromPath)).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Redirect from this path already exists' }] }, 409);

  const [row] = await db.insert(redirects).values(parsed.data).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id - Update redirect */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = redirectSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(redirects).set(parsed.data).where(eq(redirects.id, id));
  const [updated] = await db.select().from(redirects).where(eq(redirects.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete redirect */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(redirects).where(eq(redirects.id, id));
  return c.json({ data: { deleted: true } });
});

/** POST /import - Bulk import redirects from JSON array */
app.post('/import', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.array(redirectSchema).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  let imported = 0;
  for (const item of parsed.data) {
    const [existing] = await db.select({ id: redirects.id }).from(redirects).where(eq(redirects.fromPath, item.fromPath)).limit(1);
    if (!existing) {
      await db.insert(redirects).values(item);
      imported++;
    }
  }

  return c.json({ data: { imported, skipped: parsed.data.length - imported } }, 201);
});

export default app;
