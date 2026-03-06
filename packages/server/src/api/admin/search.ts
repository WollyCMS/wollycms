import { Hono } from 'hono';
import { sql, or, like } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages, blocks, blockTypes, contentTypes, media, menus } from '../../db/schema/index.js';

const app = new Hono();

function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** GET / - Search across pages, blocks, media, menus */
app.get('/', async (c) => {
  const q = c.req.query('q')?.trim();
  if (!q || q.length < 2) {
    return c.json({ data: { pages: [], blocks: [], media: [], menus: [] } });
  }

  const db = getDb();
  const term = `%${escapeLike(q)}%`;
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);

  const [pageResults, blockResults, mediaResults, menuResults] = await Promise.all([
    db.select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      status: pages.status,
      typeName: contentTypes.name,
    })
      .from(pages)
      .innerJoin(contentTypes, sql`${pages.typeId} = ${contentTypes.id}`)
      .where(or(like(pages.title, term), like(pages.slug, term)))
      .limit(limit),

    db.select({
      id: blocks.id,
      title: blocks.title,
      typeName: blockTypes.name,
      typeSlug: blockTypes.slug,
    })
      .from(blocks)
      .innerJoin(blockTypes, sql`${blocks.typeId} = ${blockTypes.id}`)
      .where(like(blocks.title, term))
      .limit(limit),

    db.select({
      id: media.id,
      title: media.title,
      originalName: media.originalName,
      mimeType: media.mimeType,
    })
      .from(media)
      .where(or(like(media.title, term), like(media.originalName, term)))
      .limit(limit),

    db.select({
      id: menus.id,
      name: menus.name,
      slug: menus.slug,
    })
      .from(menus)
      .where(or(like(menus.name, term), like(menus.slug, term)))
      .limit(limit),
  ]);

  return c.json({
    data: {
      pages: pageResults.map((p) => ({ ...p, type: 'page' as const })),
      blocks: blockResults.map((b) => ({ ...b, type: 'block' as const })),
      media: mediaResults.map((m) => ({ ...m, type: 'media' as const })),
      menus: menuResults.map((m) => ({ ...m, type: 'menu' as const })),
    },
  });
});

export default app;
