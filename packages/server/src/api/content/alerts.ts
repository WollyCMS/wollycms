import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { siteAlerts } from '../../db/schema/index.js';

const app = new Hono();

/** GET / - Returns the active site alert, or null if inactive */
app.get('/', async (c) => {
  const db = getDb();
  const [row] = await db.select().from(siteAlerts).where(eq(siteAlerts.id, 1)).limit(1);
  if (!row || !row.isActive) return c.json({ data: null });
  return c.json({ data: { message: row.message, severity: row.severity } });
});

export default app;
