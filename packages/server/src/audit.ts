import { getDb } from './db/index.js';
import { auditLogs } from './db/schema/index.js';
import type { Context } from 'hono';

interface AuditEntry {
  action: string;
  entity: string;
  entityId?: number;
  details?: Record<string, unknown>;
}

export async function logAudit(c: Context, entry: AuditEntry) {
  const db = getDb();
  const payload = c.get('jwtPayload') as { sub: number; email: string } | undefined;

  await db.insert(auditLogs).values({
    userId: payload?.sub || null,
    userName: payload?.email || 'system',
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId || null,
    details: entry.details ? JSON.stringify(entry.details) : null,
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null,
    createdAt: new Date().toISOString(),
  });
}
