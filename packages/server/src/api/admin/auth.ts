import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { users } from '../../db/schema/index.js';
import { verifyPassword } from '../../auth/password.js';
import { env } from '../../env.js';
import { authMiddleware } from '../../auth/middleware.js';

const app = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Invalid email or password' }] }, 400);
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid email or password' }] }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: user.id, email: user.email, role: user.role, exp: now + 86400 },
    env.JWT_SECRET,
    'HS256',
  );

  return c.json({
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
});

app.get('/me', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'User not found' }] }, 404);
  }

  return c.json({ data: user });
});

export default app;
