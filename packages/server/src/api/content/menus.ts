import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { menus, menuItems, pages } from '../../db/schema/index.js';

interface MenuTreeItem {
  id: number;
  title: string;
  url: string | null;
  page_slug: string | null;
  target: string;
  attributes: Record<string, unknown> | null;
  children: MenuTreeItem[];
}

const app = new Hono();

/**
 * GET /:slug - Get menu by slug with full nested tree.
 * Supports ?depth=N to limit tree depth.
 */
app.get('/:slug', async (c) => {
  const db = getDb();
  const slug = c.req.param('slug');
  const maxDepth = c.req.query('depth')
    ? parseInt(c.req.query('depth')!, 10)
    : null;

  // Fetch the menu
  const menuRows = await db
    .select()
    .from(menus)
    .where(eq(menus.slug, slug))
    .limit(1);

  if (menuRows.length === 0) {
    return c.json(
      { errors: [{ code: 'NOT_FOUND', message: 'Menu not found' }] },
      404,
    );
  }

  const menu = menuRows[0];

  // Fetch all items for this menu, left join pages to resolve page slugs
  const itemRows = await db
    .select({
      id: menuItems.id,
      parentId: menuItems.parentId,
      title: menuItems.title,
      url: menuItems.url,
      pageSlug: pages.slug,
      target: menuItems.target,
      position: menuItems.position,
      depth: menuItems.depth,
      attributes: menuItems.attributes,
    })
    .from(menuItems)
    .leftJoin(pages, eq(menuItems.pageId, pages.id))
    .where(eq(menuItems.menuId, menu.id))
    .orderBy(asc(menuItems.position));

  // Build tree from flat list
  const tree = buildMenuTree(itemRows, maxDepth);

  return c.json({
    data: {
      id: menu.id,
      name: menu.name,
      slug: menu.slug,
      items: tree,
    },
  });
});

interface FlatMenuItem {
  id: number;
  parentId: number | null;
  title: string;
  url: string | null;
  pageSlug: string | null;
  target: string;
  position: number;
  depth: number;
  attributes: Record<string, unknown> | null;
}

function buildMenuTree(
  items: FlatMenuItem[],
  maxDepth: number | null,
): MenuTreeItem[] {
  const itemMap = new Map<number, MenuTreeItem>();
  const roots: MenuTreeItem[] = [];

  // Create all nodes first
  for (const item of items) {
    itemMap.set(item.id, {
      id: item.id,
      title: item.title,
      url: item.url,
      page_slug: item.pageSlug,
      target: item.target,
      attributes: item.attributes,
      children: [],
    });
  }

  // Build parent-child relationships
  for (const item of items) {
    const node = itemMap.get(item.id)!;
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Trim tree to max depth if specified
  if (maxDepth !== null) {
    trimTree(roots, 0, maxDepth);
  }

  return roots;
}

function trimTree(
  items: MenuTreeItem[],
  currentDepth: number,
  maxDepth: number,
): void {
  for (const item of items) {
    if (currentDepth + 1 >= maxDepth) {
      item.children = [];
    } else {
      trimTree(item.children, currentDepth + 1, maxDepth);
    }
  }
}

export default app;
