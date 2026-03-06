import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { menus, menuItems, pages } from '../../db/schema/index.js';
import { cacheInvalidate } from '../../cache.js';

const app = new Hono();

// Invalidate menu cache on any write operation
app.use('*', async (c, next) => {
  await next();
  if (c.req.method !== 'GET' && c.res.status < 400) {
    cacheInvalidate('menus:');
  }
});

/** GET / - List all menus */
app.get('/', async (c) => {
  const db = getDb();
  const rows = await db.select().from(menus).orderBy(asc(menus.name));
  return c.json({ data: rows });
});

/** GET /:id - Get menu with items tree */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [menu] = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
  if (!menu) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Menu not found' }] }, 404);

  const items = await db
    .select({
      id: menuItems.id, menuId: menuItems.menuId, parentId: menuItems.parentId,
      title: menuItems.title, url: menuItems.url, pageId: menuItems.pageId,
      pageSlug: pages.slug, target: menuItems.target, position: menuItems.position,
      depth: menuItems.depth, isExpanded: menuItems.isExpanded, attributes: menuItems.attributes,
    })
    .from(menuItems)
    .leftJoin(pages, eq(menuItems.pageId, pages.id))
    .where(eq(menuItems.menuId, id))
    .orderBy(asc(menuItems.position));

  // Build tree
  const itemMap = new Map<number, any>();
  const tree: any[] = [];
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] });
  }
  for (const item of items) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else {
      tree.push(node);
    }
  }

  return c.json({ data: { ...menu, items: tree } });
});

/** POST / - Create menu */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ name: z.string().min(1), slug: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const db = getDb();
  const [existing] = await db.select({ id: menus.id }).from(menus).where(eq(menus.slug, parsed.data.slug)).limit(1);
  if (existing) return c.json({ errors: [{ code: 'CONFLICT', message: 'Menu slug already exists' }] }, 409);

  const [row] = await db.insert(menus).values(parsed.data).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id - Update menu */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional() }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(menus).set(parsed.data).where(eq(menus.id, id));
  const [updated] = await db.select().from(menus).where(eq(menus.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete menu (cascades items) */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  await db.delete(menus).where(eq(menus.id, id));
  return c.json({ data: { deleted: true } });
});

/** POST /:id/items - Add menu item */
app.post('/:id/items', async (c) => {
  const db = getDb();
  const menuId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    title: z.string().min(1),
    url: z.string().nullable().default(null),
    pageId: z.number().int().nullable().default(null),
    parentId: z.number().int().nullable().default(null),
    target: z.string().default('_self'),
    position: z.number().int().default(0),
    depth: z.number().int().default(0),
    isExpanded: z.boolean().default(false),
    attributes: z.record(z.unknown()).nullable().default(null),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const [row] = await db.insert(menuItems).values({ menuId, ...parsed.data }).returning();
  return c.json({ data: row }, 201);
});

/** PUT /:id/items/:itemId - Update menu item */
app.put('/:id/items/:itemId', async (c) => {
  const db = getDb();
  const itemId = parseInt(c.req.param('itemId'), 10);
  const body = await c.req.json().catch(() => null);

  const schema = z.object({
    title: z.string().min(1).optional(),
    url: z.string().nullable().optional(),
    pageId: z.number().int().nullable().optional(),
    parentId: z.number().int().nullable().optional(),
    target: z.string().optional(),
    position: z.number().int().optional(),
    depth: z.number().int().optional(),
    isExpanded: z.boolean().optional(),
    attributes: z.record(z.unknown()).nullable().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(menuItems).set(parsed.data).where(eq(menuItems.id, itemId));
  const [updated] = await db.select().from(menuItems).where(eq(menuItems.id, itemId)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id/items/:itemId - Delete menu item */
app.delete('/:id/items/:itemId', async (c) => {
  const db = getDb();
  const itemId = parseInt(c.req.param('itemId'), 10);
  await db.delete(menuItems).where(eq(menuItems.id, itemId));
  return c.json({ data: { deleted: true } });
});

/** PUT /:id/items-order - Reorder menu items */
app.put('/:id/items-order', async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    items: z.array(z.object({
      id: z.number().int(),
      parentId: z.number().int().nullable(),
      position: z.number().int(),
      depth: z.number().int(),
    })),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  for (const item of parsed.data.items) {
    await db.update(menuItems).set({
      parentId: item.parentId,
      position: item.position,
      depth: item.depth,
    }).where(eq(menuItems.id, item.id));
  }

  return c.json({ data: { reordered: true } });
});

export default app;
