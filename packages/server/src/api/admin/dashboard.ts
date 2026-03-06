import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages, blocks, media, menus, contentTypes, users } from '../../db/schema/index.js';

const app = new Hono();

/** GET / - Dashboard stats and recent activity */
app.get('/', async (c) => {
  const db = getDb();

  const [pageCount] = await db.select({ count: sql<number>`count(*)` }).from(pages);
  const [publishedCount] = await db.select({ count: sql<number>`count(*)` }).from(pages).where(eq(pages.status, 'published'));
  const [draftCount] = await db.select({ count: sql<number>`count(*)` }).from(pages).where(eq(pages.status, 'draft'));
  const [blockCount] = await db.select({ count: sql<number>`count(*)` }).from(blocks).where(eq(blocks.isReusable, true));
  const [mediaCount] = await db.select({ count: sql<number>`count(*)` }).from(media);
  const [menuCount] = await db.select({ count: sql<number>`count(*)` }).from(menus);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);

  const recentPages = await db
    .select({
      id: pages.id, title: pages.title, slug: pages.slug,
      status: pages.status, updatedAt: pages.updatedAt,
      typeName: contentTypes.name,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .orderBy(desc(pages.updatedAt))
    .limit(10);

  return c.json({
    data: {
      stats: {
        pages: pageCount.count,
        published: publishedCount.count,
        drafts: draftCount.count,
        blocks: blockCount.count,
        media: mediaCount.count,
        menus: menuCount.count,
        users: userCount.count,
      },
      recentPages,
    },
  });
});

export default app;
