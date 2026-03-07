import { eq } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { getDb } from './db/index.js';
import { webhooks } from './db/schema/index.js';

export type WebhookEvent =
  | 'page.published'
  | 'page.unpublished'
  | 'page.created'
  | 'page.updated'
  | 'page.deleted'
  | 'media.uploaded'
  | 'media.deleted';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function fireWebhooks(event: WebhookEvent, data: Record<string, unknown>) {
  const db = getDb();
  const allHooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.isActive, true));

  const matching = allHooks.filter((h: typeof allHooks[0]) => {
    const events: string[] = JSON.parse(h.events);
    return events.includes(event) || events.includes('*');
  });

  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  // Fire all webhooks concurrently, don't block the response
  for (const hook of matching) {
    deliverWebhook(hook, body).catch((err) => {
      console.error(`Webhook ${hook.id} (${hook.name}) delivery failed:`, err.message);
    });
  }
}

async function deliverWebhook(
  hook: { id: number; url: string; secret: string | null; name: string },
  body: string,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'WollyCMS-Webhook/1.0',
  };

  if (hook.secret) {
    const signature = createHmac('sha256', hook.secret).update(body).digest('hex');
    headers['X-Wolly-Signature'] = `sha256=${signature}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(hook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    const db = getDb();
    await db.update(webhooks)
      .set({ lastTriggeredAt: new Date().toISOString(), lastStatus: res.status })
      .where(eq(webhooks.id, hook.id));
  } finally {
    clearTimeout(timeout);
  }
}
