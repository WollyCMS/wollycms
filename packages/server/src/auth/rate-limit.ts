import type { Context, Next } from 'hono';
import { env } from '../env.js';

const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 300_000);

export function rateLimiter(opts?: { max?: number; windowMs?: number }) {
  const max = opts?.max ?? env.RATE_LIMIT_AUTH;
  const windowMs = opts?.windowMs ?? env.RATE_LIMIT_WINDOW_MS;

  return async (c: Context, next: Next) => {
    const key = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return c.json(
        { errors: [{ code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }] },
        429,
      );
    }

    await next();
  };
}
