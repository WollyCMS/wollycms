import { Hono } from 'hono';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages } from '../../db/schema/index.js';
import { env } from '../../env.js';
import { cacheGet, cacheSet } from '../../cache.js';

const app = new Hono();

/**
 * GET / — Generate sitemap.xml from published pages.
 * Pages with robots="noindex" are excluded.
 */
app.get('/', async (c) => {
  const cached = cacheGet<string>('pages:sitemap');
  if (cached) {
    c.header('Content-Type', 'application/xml');
    return c.body(cached);
  }

  const db = getDb();
  const now = new Date().toISOString();

  const rows = await db
    .select({
      slug: pages.slug,
      updatedAt: pages.updatedAt,
      robots: pages.robots,
    })
    .from(pages)
    .where(and(
      eq(pages.status, 'published'),
      sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
    ))
    .orderBy(desc(pages.updatedAt));

  const siteUrl = env.SITE_URL.replace(/\/$/, '');

  const urls = rows
    .filter((r: typeof rows[0]) => !r.robots?.includes('noindex'))
    .map((r: typeof rows[0]) => {
      const loc = r.slug === 'home' ? siteUrl + '/' : `${siteUrl}/${r.slug}`;
      const lastmod = r.updatedAt.split('T')[0];
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  cacheSet('pages:sitemap', xml, 300_000); // 5 min cache
  c.header('Content-Type', 'application/xml');
  return c.body(xml);
});

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default app;
