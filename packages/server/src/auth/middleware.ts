import type { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { getDb } from '../db/index.js';
import { apiKeys } from '../db/schema/index.js';
import { hashApiKey } from './api-key.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  exp: number;
}

const jwtMiddleware = jwt({ secret: env.JWT_SECRET, alg: 'HS256' });

/**
 * Combined auth middleware: accepts API keys (sk_*) or JWT tokens.
 * API keys are validated against the database; JWTs use HS256 signature check.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization') || '';
  const apiKeyHeader = c.req.header('X-API-Key') || '';
  const token = apiKeyHeader || authHeader.replace('Bearer ', '');

  if (token.startsWith('sk_')) {
    const db = getDb();
    const hash = await hashApiKey(token);
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);

    if (!key) {
      return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid API key' }] }, 401);
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'API key expired' }] }, 401);
    }

    // Update last used timestamp
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, key.id));

    c.set('jwtPayload', { sub: 0, email: `apikey:${key.name}`, role: 'admin', exp: 0 });
    return next();
  }

  // Fall back to JWT validation
  return jwtMiddleware(c, next);
}
