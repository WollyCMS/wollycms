import { eq, and, sql, lte } from 'drizzle-orm';
import { getDb } from './db/index.js';
import { pages } from './db/schema/index.js';
import { fireWebhooks } from './webhooks.js';
import { cacheInvalidate } from './cache.js';

const INTERVAL_MS = 60_000; // Check every minute
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Check for pages with scheduledAt <= now that are still in draft status,
 * and auto-publish them.
 */
export async function runScheduledPublishing(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();

  const due = await db
    .select({ id: pages.id, title: pages.title, slug: pages.slug })
    .from(pages)
    .where(and(
      eq(pages.status, 'draft'),
      sql`${pages.scheduledAt} IS NOT NULL`,
      lte(pages.scheduledAt, now),
    ));

  if (due.length === 0) return 0;

  await db
    .update(pages)
    .set({ status: 'published', publishedAt: now, updatedAt: now })
    .where(sql`${pages.id} IN (${sql.join(due.map((p: typeof due[0]) => sql`${p.id}`), sql`, `)})`);

  cacheInvalidate('pages:');

  for (const page of due) {
    console.log(`[scheduler] Auto-published: "${page.title}" (/${page.slug})`);
    fireWebhooks('page.published', { id: page.id, title: page.title, slug: page.slug });
  }

  return due.length;
}

/** Start the scheduled publishing interval. */
export function startScheduler(): void {
  if (timer) return;
  console.log('[scheduler] Started — checking for scheduled pages every 60s');
  timer = setInterval(() => {
    runScheduledPublishing().catch((err) => {
      console.error('[scheduler] Error:', err);
    });
  }, INTERVAL_MS);
  // Run immediately on startup
  runScheduledPublishing().catch((err) => {
    console.error('[scheduler] Error on initial run:', err);
  });
}

/** Stop the scheduler (for tests/cleanup). */
export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
