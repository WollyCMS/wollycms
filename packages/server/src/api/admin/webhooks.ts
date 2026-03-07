import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { webhooks } from '../../db/schema/index.js';
import { logAudit } from '../../audit.js';
import { rateLimiter } from '../../auth/rate-limit.js';

const app = new Hono();

const webhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
});

/** GET / - List all webhooks */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(webhooks);
  return c.json({
    data: rows.map((r: typeof rows[0]) => ({
      ...r,
      events: JSON.parse(r.events),
      secret: r.secret ? '***' : null,
    })),
  });
});

/** GET /:id - Get single webhook */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Webhook not found' }] }, 404);
  return c.json({ data: { ...row, events: JSON.parse(row.events), secret: row.secret ? '***' : null } });
});

/** POST / - Create webhook */
app.post('/', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const [row] = await db.insert(webhooks).values({
    name: parsed.data.name,
    url: parsed.data.url,
    secret: parsed.data.secret || null,
    events: JSON.stringify(parsed.data.events),
    isActive: parsed.data.isActive,
    createdAt: new Date().toISOString(),
  }).returning();

  await logAudit(c, { action: 'create', entity: 'webhook', entityId: row.id, details: { name: row.name } });
  return c.json({ data: { ...row, events: JSON.parse(row.events) } }, 201);
});

/** PUT /:id - Update webhook */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = webhookSchema.partial().safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.url !== undefined) updates.url = parsed.data.url;
  if (parsed.data.secret !== undefined) updates.secret = parsed.data.secret || null;
  if (parsed.data.events !== undefined) updates.events = JSON.stringify(parsed.data.events);
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

  await db.update(webhooks).set(updates).where(eq(webhooks.id, id));
  const [row] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Webhook not found' }] }, 404);

  await logAudit(c, { action: 'update', entity: 'webhook', entityId: id });
  return c.json({ data: { ...row, events: JSON.parse(row.events), secret: row.secret ? '***' : null } });
});

/** DELETE /:id - Delete webhook */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(webhooks).where(eq(webhooks.id, id));
  await logAudit(c, { action: 'delete', entity: 'webhook', entityId: id });
  return c.json({ success: true });
});

/** POST /:id/test - Send test webhook */
app.post('/:id/test', rateLimiter({ max: 5, windowMs: 60_000 }), async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id') || '0', 10);
  const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
  if (!hook) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Webhook not found' }] }, 404);

  const { fireWebhooks } = await import('../../webhooks.js');
  // Send a test event directly to this one webhook
  const { createHmac } = await import('node:crypto');
  const payload = JSON.stringify({
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test webhook from WollyCMS' },
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'WollyCMS-Webhook/1.0' };
  if (hook.secret) {
    headers['X-Wolly-Signature'] = `sha256=${createHmac('sha256', hook.secret).update(payload).digest('hex')}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(hook.url, { method: 'POST', headers, body: payload, signal: controller.signal });
    clearTimeout(timeout);
    await db.update(webhooks).set({ lastTriggeredAt: new Date().toISOString(), lastStatus: res.status }).where(eq(webhooks.id, id));
    return c.json({ data: { status: res.status, ok: res.ok } });
  } catch {
    return c.json({ errors: [{ code: 'DELIVERY_FAILED', message: 'Webhook delivery failed — check the URL and try again' }] }, 502);
  }
});

export default app;
