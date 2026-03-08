import { eq } from 'drizzle-orm';
import { getDb } from './db/index.js';
import { webhooks } from './db/schema/index.js';
import { isSafeWebhookUrl } from './security/url.js';

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

/** Compute HMAC-SHA256 hex digest. Uses Web Crypto on Workers, Node crypto otherwise. */
async function hmacSha256(secret: string, data: string): Promise<string> {
  try {
    const { createHmac } = await import('node:crypto');
    return createHmac('sha256', secret).update(data).digest('hex');
  } catch {
    // Web Crypto fallback (Workers)
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
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
    if (!isSafeWebhookUrl(hook.url)) {
      console.error(`Webhook ${hook.id} (${hook.name}) blocked: unsafe target URL`);
      continue;
    }
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
    const signature = await hmacSha256(hook.secret, body);
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
