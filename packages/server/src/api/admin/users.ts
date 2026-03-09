import { Hono } from 'hono';
import { eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { hashPassword } from '../../auth/password.js';
import { requireRole } from '../../auth/rbac.js';

const app = new Hono();

// All user mutations require admin role
app.post('/*', requireRole('admin'));
app.put('/*', requireRole('admin'));
app.delete('/*', requireRole('admin'));

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
});

/** GET / - List all users (no password hashes) */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.name));
  return c.json({ data: rows });
});

/** GET /:id - Get user */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'User not found' }] }, 404);
  return c.json({ data: row });
});

/** POST / - Create user */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Email already exists' }] }, 409);

  const [row] = await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash: hashPassword(parsed.data.password),
    role: parsed.data.role,
    createdAt: new Date().toISOString(),
  }).returning({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt });

  return c.json({ data: row }, 201);
});

/** PUT /:id - Update user */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const parsed = z.object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    password: z.string().min(8).optional(),
    role: z.enum(['admin', 'editor', 'viewer']).optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const updates: Record<string, unknown> = {};
  if (parsed.data.email) updates.email = parsed.data.email;
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.password) updates.passwordHash = hashPassword(parsed.data.password);

  await db.update(users).set(updates).where(eq(users.id, id));
  const [updated] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete user */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const payload = c.get('jwtPayload');
  if (payload.sub === id) {
    return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Cannot delete yourself' }] }, 403);
  }

  // Check the target user exists and is an admin
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'User not found' }] }, 404);

  // If deleting an admin, ensure at least one admin remains
  if (target.role === 'admin') {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'admin'));
    if (count <= 1) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Cannot delete the last admin account' }] }, 403);
    }
  }

  await db.delete(users).where(eq(users.id, id));
  return c.json({ data: { deleted: true } });
});

export default app;
