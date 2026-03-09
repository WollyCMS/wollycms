import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { trackingScripts } from '../../db/schema/index.js';

const app = new Hono();

/**
 * GET / - Returns active tracking scripts, optionally filtered by page slug.
 * Query params: ?page=admissions (optional)
 * Returns scripts grouped by position (head/body), sorted by priority.
 */
app.get('/', async (c) => {
  const db = getDb();
  const pageSlug = c.req.query('page');

  const rows = await db
    .select()
    .from(trackingScripts)
    .where(eq(trackingScripts.isActive, true))
    .orderBy(trackingScripts.priority);

  const filtered = rows.filter((row: typeof rows[0]) => {
    if (row.scope === 'global') return true;
    if (row.scope === 'targeted' && pageSlug && row.targetPages) {
      const targets: string[] = JSON.parse(row.targetPages);
      return targets.includes(pageSlug);
    }
    return false;
  });

  const head = filtered
    .filter((r: typeof rows[0]) => r.position === 'head')
    .map((r: typeof rows[0]) => ({ id: r.id, name: r.name, code: r.code }));

  const body = filtered
    .filter((r: typeof rows[0]) => r.position === 'body')
    .map((r: typeof rows[0]) => ({ id: r.id, name: r.name, code: r.code }));

  return c.json({ data: { head, body } });
});

export default app;
