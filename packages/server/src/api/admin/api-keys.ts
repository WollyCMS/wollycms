import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { apiKeys } from '../../db/schema/index.js';
import { generateApiKey, hashApiKey } from '../../auth/api-key.js';
import { logAudit } from '../../audit.js';
import { requireRole } from '../../auth/rbac.js';

const app = new Hono();
app.use('/*', requireRole('admin'));

const createSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.string().default('content:read'),
  expiresAt: z.string().nullable().optional(),
});

/** GET / - List all API keys (no secrets exposed) */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(apiKeys);
  return c.json({
    data: rows.map((r: typeof rows[0]) => ({
      id: r.id,
      name: r.name,
      keyPrefix: r.keyPrefix,
      permissions: r.permissions,
      expiresAt: r.expiresAt,
      lastUsedAt: r.lastUsedAt,
      createdAt: r.createdAt,
    })),
  });
});

/** POST / - Create new API key (returns the key ONCE) */
app.post('/', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const { key, prefix } = generateApiKey();
  const hash = await hashApiKey(key);

  const [row] = await db.insert(apiKeys).values({
    name: parsed.data.name,
    keyHash: hash,
    keyPrefix: prefix,
    permissions: parsed.data.permissions,
    expiresAt: parsed.data.expiresAt || null,
    createdAt: new Date().toISOString(),
  }).returning();

  await logAudit(c, { action: 'create', entity: 'api_key', entityId: row.id, details: { name: row.name } });

  // Return the full key only on creation
  return c.json({
    data: {
      id: row.id,
      name: row.name,
      key, // Only returned once!
      keyPrefix: prefix,
      permissions: row.permissions,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    },
  }, 201);
});

/** PUT /:id - Update API key metadata (not the key itself) */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    permissions: z.string().optional(),
    expiresAt: z.string().nullable().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.permissions !== undefined) updates.permissions = parsed.data.permissions;
  if (parsed.data.expiresAt !== undefined) updates.expiresAt = parsed.data.expiresAt;

  await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id));
  await logAudit(c, { action: 'update', entity: 'api_key', entityId: id });
  return c.json({ success: true });
});

/** DELETE /:id - Revoke API key */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(apiKeys).where(eq(apiKeys.id, id));
  await logAudit(c, { action: 'delete', entity: 'api_key', entityId: id });
  return c.json({ success: true });
});

export default app;
