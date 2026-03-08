import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';
import { getDb } from '../db/index.js';
import { apiKeys } from '../db/schema/index.js';

/** SHA-256 hash a string. Uses Node crypto when available, Web Crypto otherwise. */
async function sha256Hex(input: string): Promise<string> {
  try {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(input).digest('hex');
  } catch {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(input));
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

/** Generate a random API key. Uses Node crypto when available, Web Crypto otherwise. */
function generateRandomBytes(size: number): Uint8Array {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('node:crypto');
    return randomBytes(size);
  } catch {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
  }
}

export function hashApiKey(key: string): Promise<string> {
  return sha256Hex(key);
}

export function generateApiKey(): { key: string; prefix: string } {
  const bytes = generateRandomBytes(32);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const key = `sk_${hex}`;
  const prefix = key.slice(0, 11); // "sk_" + first 8 hex chars
  return { key, prefix };
}

/**
 * Middleware that accepts either JWT auth OR API key auth.
 * API key is passed via `Authorization: Bearer sk_...` or `X-API-Key: sk_...` header.
 * If the token starts with "sk_", it's treated as an API key.
 */
export function apiKeyAuth(requiredPermission: string) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization') || '';
    const apiKeyHeader = c.req.header('X-API-Key') || '';
    const token = apiKeyHeader || authHeader.replace('Bearer ', '');

    if (!token.startsWith('sk_')) {
      // Not an API key — let the normal JWT middleware handle it
      await next();
      return;
    }

    const db = getDb();
    const hash = await hashApiKey(token);
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);

    if (!key) {
      return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid API key' }] }, 401);
    }

    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'API key expired' }] }, 401);
    }

    const permissions = key.permissions.split(',').map((p: string) => p.trim());
    if (!permissions.includes('*') && !permissions.includes(requiredPermission)) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Insufficient permissions' }] }, 403);
    }

    // Update last used
    await db.update(apiKeys)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(apiKeys.id, key.id));

    // Set a minimal JWT-like payload for downstream handlers
    c.set('jwtPayload', { sub: 0, email: `apikey:${key.name}`, role: 'admin', exp: 0 });
    await next();
  };
}
