import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { trackingScripts } from '../../db/schema/index.js';
import { logAudit } from '../../audit.js';
import { requireRole } from '../../auth/rbac.js';

const app = new Hono();
app.use('/*', requireRole('admin'));

const trackingScriptSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10000),
  position: z.enum(['head', 'body']).default('head'),
  priority: z.number().int().min(-100).max(100).default(0),
  isActive: z.boolean().default(true),
  scope: z.enum(['global', 'targeted']).default('global'),
  targetPages: z.array(z.string()).optional().default([]),
});

// Omitted update fields must not receive create defaults in Zod 4.
const trackingScriptUpdateSchema = trackingScriptSchema.partial().extend({
  position: trackingScriptSchema.shape.position.removeDefault().optional(),
  priority: trackingScriptSchema.shape.priority.removeDefault().optional(),
  isActive: trackingScriptSchema.shape.isActive.removeDefault().optional(),
  scope: trackingScriptSchema.shape.scope.removeDefault().optional(),
  targetPages: trackingScriptSchema.shape.targetPages.removeDefault().optional(),
});

function parseRow(row: typeof trackingScripts.$inferSelect) {
  return {
    ...row,
    targetPages: row.targetPages ? JSON.parse(row.targetPages) : [],
  };
}

/** GET / - List all tracking scripts */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(trackingScripts).orderBy(trackingScripts.priority);
  return c.json({ data: rows.map(parseRow) });
});

/** GET /:id - Get single tracking script */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db.select().from(trackingScripts).where(eq(trackingScripts.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Tracking script not found' }] }, 404);
  return c.json({ data: parseRow(row) });
});

/** POST / - Create tracking script */
app.post('/', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const parsed = trackingScriptSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const now = new Date().toISOString();
  const [row] = await db.insert(trackingScripts).values({
    name: parsed.data.name,
    code: parsed.data.code,
    position: parsed.data.position,
    priority: parsed.data.priority,
    isActive: parsed.data.isActive,
    scope: parsed.data.scope,
    targetPages: parsed.data.targetPages.length > 0 ? JSON.stringify(parsed.data.targetPages) : null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  await logAudit(c, { action: 'create', entity: 'tracking_script', entityId: row.id, details: { name: row.name } });
  return c.json({ data: parseRow(row) }, 201);
});

/** PUT /:id - Update tracking script */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = trackingScriptUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.code !== undefined) updates.code = parsed.data.code;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
  if (parsed.data.scope !== undefined) updates.scope = parsed.data.scope;
  if (parsed.data.targetPages !== undefined) {
    updates.targetPages = parsed.data.targetPages.length > 0 ? JSON.stringify(parsed.data.targetPages) : null;
  }

  await db.update(trackingScripts).set(updates).where(eq(trackingScripts.id, id));
  const [row] = await db.select().from(trackingScripts).where(eq(trackingScripts.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Tracking script not found' }] }, 404);

  await logAudit(c, { action: 'update', entity: 'tracking_script', entityId: id });
  return c.json({ data: parseRow(row) });
});

/** DELETE /:id - Delete tracking script */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(trackingScripts).where(eq(trackingScripts.id, id));
  await logAudit(c, { action: 'delete', entity: 'tracking_script', entityId: id });
  return c.json({ success: true });
});

export default app;
