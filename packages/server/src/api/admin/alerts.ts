import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { siteAlerts } from '../../db/schema/index.js';
import { logAudit } from '../../audit.js';
import { requireRole } from '../../auth/rbac.js';

const app = new Hono();
app.use('/*', requireRole('admin'));

const alertUpdateSchema = z.object({
  message: z.string().max(1000).optional(),
  severity: z.enum(['info', 'warning', 'emergency']).optional(),
  isActive: z.boolean().optional(),
});

/** GET / - Returns the current site alert (row id=1) */
app.get('/', async (c) => {
  const db = getDb();
  const [row] = await db.select().from(siteAlerts).where(eq(siteAlerts.id, 1)).limit(1);
  if (!row) return c.json({ data: { message: '', severity: 'warning', isActive: false } });
  return c.json({ data: row });
});

/** PUT / - Update the site alert (row id=1) */
app.put('/', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const parsed = alertUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (parsed.data.message !== undefined) updates.message = parsed.data.message;
  if (parsed.data.severity !== undefined) updates.severity = parsed.data.severity;
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  await db.update(siteAlerts).set(updates).where(eq(siteAlerts.id, 1));
  const [row] = await db.select().from(siteAlerts).where(eq(siteAlerts.id, 1)).limit(1);

  await logAudit(c, { action: 'update', entity: 'site_alert', entityId: 1, details: { isActive: row.isActive } });
  return c.json({ data: row });
});

export default app;
