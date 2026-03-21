import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { setCookie } from 'hono/cookie';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { users, userTotp, userRecoveryCodes } from '../../db/schema/index.js';
import { verifyPassword } from '../../auth/password.js';
import { env } from '../../env.js';
import { authMiddleware } from '../../auth/middleware.js';
import { verifyTotp } from '../../auth/totp.js';
import { decrypt } from '../../auth/encryption.js';
import { hashRecoveryCode } from '../../auth/recovery-codes.js';
import { logAudit } from '../../audit.js';

const app = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verify2faSchema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(1),
});

/** Issue a full 24h session JWT. */
async function issueSessionToken(user: { id: number; email: string; role: string }) {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: user.id, email: user.email, role: user.role, exp: now + 86400 },
    env.JWT_SECRET,
    'HS256',
  );
}

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

  // Check if user has verified 2FA
  const [totp] = await db.select().from(userTotp)
    .where(and(eq(userTotp.userId, user.id), eq(userTotp.verified, true)))
    .limit(1);

  if (totp) {
    // 2FA enabled — issue a short-lived challenge token instead of a session
    const now = Math.floor(Date.now() / 1000);
    const challengeToken = await sign(
      { sub: user.id, email: user.email, role: user.role, purpose: '2fa-challenge', exp: now + 300 },
      env.JWT_SECRET,
      'HS256',
    );
    return c.json({
      data: {
        requiresTwoFactor: true,
        challengeToken,
      },
    });
  }

  // No 2FA — issue session token directly (backward compatible)
  const token = await issueSessionToken(user);
  return c.json({
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
});

/** Verify 2FA code after password login. */
app.post('/verify-2fa', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = verify2faSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Challenge token and code are required' }] }, 400);
  }

  // Verify the challenge token
  let payload: { sub: number; email: string; role: string; purpose?: string };
  try {
    payload = await verify(parsed.data.challengeToken, env.JWT_SECRET, 'HS256') as typeof payload;
  } catch {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid or expired challenge' }] }, 401);
  }

  if (payload.purpose !== '2fa-challenge') {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid challenge token' }] }, 401);
  }

  const db = getDb();
  const [totp] = await db.select().from(userTotp)
    .where(and(eq(userTotp.userId, payload.sub), eq(userTotp.verified, true)))
    .limit(1);

  if (!totp) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: '2FA configuration not found' }] }, 404);
  }

  const secret = await decrypt(totp.secret, env.JWT_SECRET);
  const code = parsed.data.code.replace(/-/g, '');

  // Try TOTP code first
  if (code.length === 6 && /^\d{6}$/.test(code)) {
    const valid = await verifyTotp(secret, code);
    if (valid) {
      const [user] = await db.select().from(users)
        .where(eq(users.id, payload.sub)).limit(1);
      if (!user) {
        return c.json({ errors: [{ code: 'NOT_FOUND', message: 'User not found' }] }, 404);
      }

      const token = await issueSessionToken(user);
      await logAudit(c, { action: '2fa-verified', entity: 'user', entityId: user.id });
      return c.json({
        data: {
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        },
      });
    }
  }

  // Try recovery code (format: XXXX-XXXX or XXXXXXXX)
  const codeHash = await hashRecoveryCode(code);
  const [recoveryCode] = await db.select().from(userRecoveryCodes)
    .where(and(
      eq(userRecoveryCodes.userId, payload.sub),
      eq(userRecoveryCodes.codeHash, codeHash),
      isNull(userRecoveryCodes.usedAt),
    ))
    .limit(1);

  if (recoveryCode) {
    // Mark recovery code as used
    await db.update(userRecoveryCodes)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(userRecoveryCodes.id, recoveryCode.id));

    const [user] = await db.select().from(users)
      .where(eq(users.id, payload.sub)).limit(1);
    if (!user) {
      return c.json({ errors: [{ code: 'NOT_FOUND', message: 'User not found' }] }, 404);
    }

    const token = await issueSessionToken(user);
    await logAudit(c, { action: '2fa-recovery-used', entity: 'user', entityId: user.id });
    return c.json({
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  }

  return c.json({ errors: [{ code: 'INVALID_CODE', message: 'Invalid verification code' }] }, 401);
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

  // Check if user has 2FA enabled
  const [totp] = await db.select({ id: userTotp.id }).from(userTotp)
    .where(and(eq(userTotp.userId, user.id), eq(userTotp.verified, true)))
    .limit(1);

  return c.json({ data: { ...user, twoFactorEnabled: !!totp } });
});

app.post('/preview-session', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: payload.sub, email: payload.email, role: payload.role, exp: now + 600 },
    env.JWT_SECRET,
    'HS256',
  );
  setCookie(c, 'wolly_preview', token, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
  return c.json({ data: { ok: true, token, expiresIn: 600 } });
});

export default app;
