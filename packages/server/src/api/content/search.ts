import { Hono } from 'hono';
import { eq, and, sql, like, or, desc, inArray } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages, contentTypes } from '../../db/schema/index.js';
import { cacheGet, cacheSet } from '../../cache.js';
import { ftsSearch } from '../../search-index.js';
import { loadConfig } from '../admin/config.js';

const app = new Hono();

function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * GET /?q=<query> — Search published pages.
 * Uses FTS5 full-text search when available, falls back to LIKE matching.
 */
app.get('/', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q || q.length < 2) {
    return c.json({ data: [], meta: { total: 0, query: q || '' } });
  }

  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const typeFilter = c.req.query('type');
  const localeParam = c.req.query('locale');

  const config = await loadConfig();
  const locale = localeParam || config.defaultLocale;

  const cacheKey = `pages:search:${locale}:${q}:${limit}:${typeFilter || ''}`;
  const cached = cacheGet<object>(cacheKey);
  if (cached) return c.json(cached);

  const db = getDb();

  // Try FTS5 first
  const ftsResults = await ftsSearch(q, limit * 2); // fetch extra to allow filtering

  type SearchRow = { id: number; typeSlug: string; title: string; slug: string; locale: string; metaDescription: string | null; updatedAt: string; publishedAt: string | null };
  let rows: SearchRow[];

  if (ftsResults.length > 0) {
    // FTS matched — fetch page data for matched IDs
    const matchedIds = ftsResults.map((r) => r.pageId);
    const now = new Date().toISOString();

    const conditions = [
      eq(pages.status, 'published'),
      eq(pages.locale, locale),
      sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
      sql`${pages.id} IN (${sql.raw(matchedIds.join(','))})`,
    ];

    if (typeFilter) {
      const [typeRow] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, typeFilter)).limit(1);
      if (typeRow) conditions.push(eq(pages.typeId, typeRow.id));
    }

    rows = await db
      .select({
        id: pages.id,
        typeSlug: contentTypes.slug,
        title: pages.title,
        slug: pages.slug,
        locale: pages.locale,
        metaDescription: pages.metaDescription,
        updatedAt: pages.updatedAt,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
      .where(and(...conditions))
      .limit(limit);

    // Sort by FTS rank
    const rankMap = new Map(ftsResults.map((r) => [r.pageId, r.rank]));
    rows.sort((a: typeof rows[0], b: typeof rows[0]) => (rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0));
  } else {
    // Fallback: LIKE matching on title and slug
    const now = new Date().toISOString();
    const term = `%${escapeLike(q)}%`;

    const conditions = [
      eq(pages.status, 'published'),
      eq(pages.locale, locale),
      sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
      or(
        like(pages.title, term),
        like(pages.slug, term),
        like(pages.metaDescription, term),
      ),
    ];

    if (typeFilter) {
      const [typeRow] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, typeFilter)).limit(1);
      if (typeRow) conditions.push(eq(pages.typeId, typeRow.id));
    }

    rows = await db
      .select({
        id: pages.id,
        typeSlug: contentTypes.slug,
        title: pages.title,
        slug: pages.slug,
        locale: pages.locale,
        metaDescription: pages.metaDescription,
        updatedAt: pages.updatedAt,
        publishedAt: pages.publishedAt,
      })
      .from(pages)
      .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
      .where(and(...conditions))
      .orderBy(desc(pages.publishedAt))
      .limit(limit);
  }

  const data = rows.map((r: typeof rows[0]) => ({
    id: r.id,
    type: r.typeSlug,
    title: r.title,
    slug: r.slug,
    locale: r.locale,
    description: r.metaDescription || null,
    meta: {
      updated_at: r.updatedAt,
      published_at: r.publishedAt,
    },
  }));

  const response = { data, meta: { total: data.length, query: q } };
  cacheSet(cacheKey, response, 15_000);
  return c.json(response);
});

export default app;
