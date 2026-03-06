import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { redirects } from '../../db/schema/index.js';

const app = new Hono();

/**
 * GET / - Return all active redirects.
 * Used by Astro to generate _redirects file.
 */
app.get('/', async (c) => {
  const db = getDb();

  const rows = await db
    .select({
      id: redirects.id,
      fromPath: redirects.fromPath,
      toPath: redirects.toPath,
      statusCode: redirects.statusCode,
    })
    .from(redirects)
    .where(eq(redirects.isActive, true));

  return c.json({ data: rows });
});

export default app;
