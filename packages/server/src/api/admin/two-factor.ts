import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { users, userTotp, userRecoveryCodes } from '../../db/schema/index.js';
import { authMiddleware } from '../../auth/middleware.js';
import { generateTotpSecret, generateTotpUri, verifyTotp } from '../../auth/totp.js';
import { encrypt, decrypt } from '../../auth/encryption.js';
import { generateRecoveryCodes, hashRecoveryCode } from '../../auth/recovery-codes.js';
import { verifyPassword } from '../../auth/password.js';
import { env } from '../../env.js';
import { logAudit } from '../../audit.js';

const app = new Hono();

// All 2FA management routes require authentication
app.use('/*', authMiddleware);

/** Begin 2FA setup — generate secret and return QR code data. */
app.post('/setup', async (c) => {
  const payload = c.get('jwtPayload');
  const db = getDb();

  // Check if 2FA is already enabled
  const [existing] = await db.select().from(userTotp)
    .where(and(eq(userTotp.userId, payload.sub), eq(userTotp.verified, true)))
    .limit(1);

  if (existing) {
    return c.json({ errors: [{ code: 'CONFLICT', message: '2FA is already enabled' }] }, 409);
  }

  // Delete any unverified setup (user abandoned previous setup)
  await db.delete(userTotp).where(
    and(eq(userTotp.userId, payload.sub), eq(userTotp.verified, false)),
  );

  const secret = generateTotpSecret();
  const encrypted = await encrypt(secret, env.JWT_SECRET);

  await db.insert(userTotp).values({
    userId: payload.sub,
    secret: encrypted,
    verified: false,
    createdAt: new Date().toISOString(),
  });

  const uri = generateTotpUri(secret, payload.email);

  return c.json({ data: { secret, uri } });
});

/** Verify setup — confirm user can generate valid codes. */
app.post('/verify-setup', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ code: z.string().length(6) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'A 6-digit code is required' }] }, 400);
  }

  const payload = c.get('jwtPayload');
  const db = getDb();

  const [totp] = await db.select().from(userTotp)
    .where(and(eq(userTotp.userId, payload.sub), eq(userTotp.verified, false)))
    .limit(1);

  if (!totp) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'No pending 2FA setup found' }] }, 404);
  }

  const secret = await decrypt(totp.secret, env.JWT_SECRET);
  const valid = await verifyTotp(secret, parsed.data.code);

  if (!valid) {
    return c.json({ errors: [{ code: 'INVALID_CODE', message: 'Invalid verification code' }] }, 400);
  }

  // Mark as verified
  await db.update(userTotp)
    .set({ verified: true })
    .where(eq(userTotp.id, totp.id));

  // Generate recovery codes
  const { plaintext, hashed } = await generateRecoveryCodes();

  // Delete any old recovery codes
  await db.delete(userRecoveryCodes).where(eq(userRecoveryCodes.userId, payload.sub));

  // Store hashed recovery codes
  const now = new Date().toISOString();
  for (const codeHash of hashed) {
    await db.insert(userRecoveryCodes).values({
      userId: payload.sub,
      codeHash,
      createdAt: now,
    });
  }

  await logAudit(c, { action: '2fa-enabled', entity: 'user', entityId: payload.sub });

  return c.json({ data: { recoveryCodes: plaintext } });
});

/** Disable 2FA — requires current password. */
app.delete('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ password: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Password is required' }] }, 400);
  }

  const payload = c.get('jwtPayload');
  const db = getDb();

  const [user] = await db.select().from(users)
    .where(eq(users.id, payload.sub)).limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid password' }] }, 401);
  }

  await db.delete(userTotp).where(eq(userTotp.userId, payload.sub));
  await db.delete(userRecoveryCodes).where(eq(userRecoveryCodes.userId, payload.sub));

  await logAudit(c, { action: '2fa-disabled', entity: 'user', entityId: payload.sub });

  return c.json({ data: { ok: true } });
});

/** Regenerate recovery codes — requires current password. */
app.post('/recovery-codes', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ password: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Password is required' }] }, 400);
  }

  const payload = c.get('jwtPayload');
  const db = getDb();

  const [user] = await db.select().from(users)
    .where(eq(users.id, payload.sub)).limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid password' }] }, 401);
  }

  // Verify 2FA is actually enabled
  const [totp] = await db.select().from(userTotp)
    .where(and(eq(userTotp.userId, payload.sub), eq(userTotp.verified, true)))
    .limit(1);

  if (!totp) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: '2FA is not enabled' }] }, 404);
  }

  const { plaintext, hashed } = await generateRecoveryCodes();

  await db.delete(userRecoveryCodes).where(eq(userRecoveryCodes.userId, payload.sub));

  const now = new Date().toISOString();
  for (const codeHash of hashed) {
    await db.insert(userRecoveryCodes).values({
      userId: payload.sub,
      codeHash,
      createdAt: now,
    });
  }

  return c.json({ data: { recoveryCodes: plaintext } });
});

export default app;
