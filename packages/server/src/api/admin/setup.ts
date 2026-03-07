import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { hashPassword } from '../../auth/password.js';
import { count } from 'drizzle-orm';

const app = new Hono();

const setupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** GET /status — Check if setup is needed (no users exist). */
app.get('/status', async (c) => {
  const db = getDb();
  const [result] = await db.select({ total: count() }).from(users);
  return c.json({ data: { needsSetup: result.total === 0 } });
});

/** POST / — Create first admin user. Only works when no users exist. */
app.post('/', async (c) => {
  const db = getDb();
  const [result] = await db.select({ total: count() }).from(users);
  if (result.total > 0) {
    return c.json({ errors: [{ code: 'SETUP_COMPLETE', message: 'Setup has already been completed' }] }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join(', ');
    return c.json({ errors: [{ code: 'VALIDATION', message: messages }] }, 400);
  }

  const passwordHash = hashPassword(parsed.data.password);
  const [user] = await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    role: 'admin',
    createdAt: new Date().toISOString(),
  }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  return c.json({ data: { user } }, 201);
});

export default app;
