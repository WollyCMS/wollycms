import { Hono } from 'hono';
import { eq, and, sql, like, or, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages, contentTypes, blocks, blockTypes, pageBlocks } from '../../db/schema/index.js';
import { cacheGet, cacheSet } from '../../cache.js';

const app = new Hono();

function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * GET /?q=<query> — Search published pages by title, slug, and block content.
 * Returns matching pages with highlighted context.
 */
app.get('/', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q || q.length < 2) {
    return c.json({ data: [], meta: { total: 0, query: q || '' } });
  }

  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const typeFilter = c.req.query('type');

  const cacheKey = `pages:search:${q}:${limit}:${typeFilter || ''}`;
  const cached = cacheGet<object>(cacheKey);
  if (cached) return c.json(cached);

  const db = getDb();
  const now = new Date().toISOString();
  const term = `%${escapeLike(q)}%`;

  const conditions = [
    eq(pages.status, 'published'),
    sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
    or(
      like(pages.title, term),
      like(pages.slug, term),
    ),
  ];

  if (typeFilter) {
    const [typeRow] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, typeFilter)).limit(1);
    if (typeRow) conditions.push(eq(pages.typeId, typeRow.id));
  }

  const rows = await db
    .select({
      id: pages.id,
      typeSlug: contentTypes.slug,
      title: pages.title,
      slug: pages.slug,
      fields: pages.fields,
      metaDescription: pages.metaDescription,
      updatedAt: pages.updatedAt,
      publishedAt: pages.publishedAt,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .where(and(...conditions))
    .orderBy(desc(pages.publishedAt))
    .limit(limit);

  const data = rows.map((r: typeof rows[0]) => ({
    id: r.id,
    type: r.typeSlug,
    title: r.title,
    slug: r.slug,
    description: r.metaDescription || null,
    meta: {
      updated_at: r.updatedAt,
      published_at: r.publishedAt,
    },
  }));

  const response = { data, meta: { total: data.length, query: q } };
  cacheSet(cacheKey, response, 15_000); // 15s cache for search
  return c.json(response);
});

export default app;
