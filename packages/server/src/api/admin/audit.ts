import { Hono } from 'hono';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { auditLogs } from '../../db/schema/index.js';

const app = new Hono();

/** GET / - List audit logs with filtering */
app.get('/', async (c) => {
  const db = getDb();
  const entity = c.req.query('entity');
  const action = c.req.query('action');
  const userId = c.req.query('userId');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const conditions = [];
  if (entity) conditions.push(eq(auditLogs.entity, entity));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (userId) conditions.push(eq(auditLogs.userId, parseInt(userId, 10)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where);

  return c.json({
    data: rows.map((r) => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null,
    })),
    meta: { total: count, limit, offset },
  });
});

export default app;
