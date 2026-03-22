/**
 * GraphQL API for WollyCMS — read-only content queries.
 * Mirrors the REST content API with the same data model.
 * Works on Cloudflare Workers and Node.js.
 */
import { Hono } from 'hono';
import {
  graphql,
  buildSchema,
  type GraphQLResolveInfo,
} from 'graphql';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import {
  pages, contentTypes, blocks, blockTypes, pageBlocks,
  menus, menuItems, taxonomies, terms,
} from '../../db/schema/index.js';
import { loadConfig } from '../admin/config.js';

const app = new Hono();

const schema = buildSchema(`
  type Query {
    """List published pages with optional filtering."""
    pages(type: String, locale: String, taxonomy: String, sort: String, limit: Int, offset: Int): PageList!

    """Get a single published page by slug."""
    page(slug: String!, locale: String): Page

    """Get a menu by slug with nested items."""
    menu(slug: String!): Menu

    """List all menus."""
    menus: [Menu!]!

    """List taxonomy vocabularies."""
    taxonomies: [Taxonomy!]!

    """Get terms for a taxonomy."""
    taxonomy(slug: String!): Taxonomy

    """Site configuration."""
    config: SiteConfig!
  }

  type PageList {
    data: [PageSummary!]!
    meta: ListMeta!
  }

  type ListMeta {
    total: Int!
    limit: Int!
    offset: Int!
  }

  type PageSummary {
    id: Int!
    type: String!
    title: String!
    slug: String!
    status: String!
    locale: String
    fields: JSON
    meta: PageMeta!
  }

  type Page {
    id: Int!
    type: String!
    title: String!
    slug: String!
    status: String!
    locale: String
    translationGroupId: String
    translations: [Translation!]
    fields: JSON
    seo: PageSeo
    regions: JSON
    meta: PageMeta!
  }

  type Translation {
    id: Int!
    locale: String!
    slug: String!
    title: String!
  }

  type PageSeo {
    metaTitle: String
    metaDescription: String
    ogImage: String
    canonicalUrl: String
    robots: String
  }

  type PageMeta {
    createdAt: String!
    updatedAt: String!
    publishedAt: String
  }

  type Menu {
    id: Int!
    name: String!
    slug: String!
    items: [MenuItem!]!
  }

  type MenuItem {
    id: Int!
    title: String!
    url: String
    pageSlug: String
    target: String!
    depth: Int!
    children: [MenuItem!]!
  }

  type Taxonomy {
    id: Int!
    name: String!
    slug: String!
    description: String
    hierarchical: Boolean!
    terms: [Term!]!
  }

  type Term {
    id: Int!
    name: String!
    slug: String!
    weight: Int!
  }

  type SiteConfig {
    siteName: String!
    tagline: String!
    logo: String
    defaultLocale: String!
    supportedLocales: [String!]!
  }

  """Arbitrary JSON scalar."""
  scalar JSON
`);

// Resolvers
const root = {
  pages: async (args: { type?: string; locale?: string; taxonomy?: string; sort?: string; limit?: number; offset?: number }) => {
    const db = getDb();
    const config = await loadConfig();
    const locale = args.locale || config.defaultLocale;
    const limit = Math.min(args.limit || 20, 50);
    const offset = args.offset || 0;
    const now = new Date().toISOString();

    const conditions: ReturnType<typeof eq>[] = [
      eq(pages.status, 'published'),
      eq(pages.locale, locale),
      sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
    ];

    if (args.type) {
      const [typeRow] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, args.type)).limit(1);
      if (typeRow) conditions.push(eq(pages.typeId, typeRow.id));
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(pages).where(and(...conditions));
    const total = countResult[0].count;

    const [sortField, sortDir] = (args.sort || 'published_at:desc').split(':');
    const sortFn = sortDir === 'asc' ? asc : desc;
    const sortCol = sortField === 'title' ? pages.title : sortField === 'created_at' ? pages.createdAt : pages.publishedAt;

    const rows = await db.select({
      id: pages.id, typeSlug: contentTypes.slug, title: pages.title, slug: pages.slug,
      status: pages.status, locale: pages.locale, fields: pages.fields,
      createdAt: pages.createdAt, updatedAt: pages.updatedAt, publishedAt: pages.publishedAt,
    }).from(pages)
      .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
      .where(and(...conditions))
      .orderBy(sortFn(sortCol))
      .limit(limit).offset(offset);

    return {
      data: rows.map((r: typeof rows[0]) => ({
        id: r.id, type: r.typeSlug, title: r.title, slug: r.slug,
        status: r.status, locale: r.locale, fields: r.fields,
        meta: { createdAt: r.createdAt, updatedAt: r.updatedAt, publishedAt: r.publishedAt },
      })),
      meta: { total, limit, offset },
    };
  },

  page: async (args: { slug: string; locale?: string }) => {
    const db = getDb();
    const config = await loadConfig();
    const locale = args.locale || config.defaultLocale;
    const now = new Date().toISOString();

    const [row] = await db.select({
      id: pages.id, typeSlug: contentTypes.slug, title: pages.title, slug: pages.slug,
      status: pages.status, locale: pages.locale, translationGroupId: pages.translationGroupId,
      fields: pages.fields, metaTitle: pages.metaTitle, metaDescription: pages.metaDescription,
      ogImage: pages.ogImage, canonicalUrl: pages.canonicalUrl, robots: pages.robots,
      createdAt: pages.createdAt, updatedAt: pages.updatedAt, publishedAt: pages.publishedAt,
    }).from(pages)
      .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
      .where(and(
        eq(pages.slug, args.slug), eq(pages.locale, locale),
        eq(pages.status, 'published'),
        sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
      )).limit(1);

    if (!row) return null;

    // Fetch blocks grouped by region
    const pbRows = await db.select({
      region: pageBlocks.region, position: pageBlocks.position,
      isShared: pageBlocks.isShared, overrides: pageBlocks.overrides,
      blockId: blocks.id, blockFields: blocks.fields, blockTypeSlug: blockTypes.slug,
    }).from(pageBlocks)
      .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
      .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
      .where(eq(pageBlocks.pageId, row.id))
      .orderBy(asc(pageBlocks.region), asc(pageBlocks.position));

    const regions: Record<string, unknown[]> = {};
    for (const pb of pbRows) {
      if (!regions[pb.region]) regions[pb.region] = [];
      let resolvedFields = pb.blockFields || {};
      if (pb.isShared && pb.overrides) resolvedFields = { ...resolvedFields, ...pb.overrides };
      regions[pb.region].push({ block_type: pb.blockTypeSlug, fields: resolvedFields });
    }

    // Fetch translations
    let translationsList: Array<{ id: number; locale: string; slug: string; title: string }> = [];
    if (row.translationGroupId) {
      translationsList = await db.select({
        id: pages.id, locale: pages.locale, slug: pages.slug, title: pages.title,
      }).from(pages).where(and(
        eq(pages.translationGroupId, row.translationGroupId),
        eq(pages.status, 'published'),
        sql`${pages.id} != ${row.id}`,
      ));
    }

    return {
      id: row.id, type: row.typeSlug, title: row.title, slug: row.slug,
      status: row.status, locale: row.locale, translationGroupId: row.translationGroupId,
      translations: translationsList, fields: row.fields,
      seo: {
        metaTitle: row.metaTitle, metaDescription: row.metaDescription,
        ogImage: row.ogImage, canonicalUrl: row.canonicalUrl, robots: row.robots,
      },
      regions,
      meta: { createdAt: row.createdAt, updatedAt: row.updatedAt, publishedAt: row.publishedAt },
    };
  },

  menu: async (args: { slug: string }) => {
    const db = getDb();
    const [m] = await db.select().from(menus).where(eq(menus.slug, args.slug)).limit(1);
    if (!m) return null;

    const items = await db.select({
      id: menuItems.id, title: menuItems.title, url: menuItems.url,
      pageId: menuItems.pageId, target: menuItems.target,
      position: menuItems.position, depth: menuItems.depth, parentId: menuItems.parentId,
    }).from(menuItems).where(eq(menuItems.menuId, m.id)).orderBy(asc(menuItems.position));

    // Resolve page slugs
    const pageIds = items.filter((i: typeof items[0]) => i.pageId).map((i: typeof items[0]) => i.pageId!);
    const pageSlugs = new Map<number, string>();
    if (pageIds.length > 0) {
      const pageRows = await db.select({ id: pages.id, slug: pages.slug }).from(pages)
        .where(sql`${pages.id} IN (${sql.raw(pageIds.join(','))})`);
      for (const p of pageRows) pageSlugs.set(p.id, p.slug);
    }

    // Build tree
    type Item = { id: number; title: string; url: string | null; pageSlug: string | null; target: string; depth: number; children: Item[] };
    const itemMap = new Map<number, Item>();
    const topLevel: Item[] = [];

    for (const i of items) {
      const item: Item = {
        id: i.id, title: i.title, url: i.url,
        pageSlug: i.pageId ? pageSlugs.get(i.pageId) || null : null,
        target: i.target || '_self', depth: i.depth || 0, children: [],
      };
      itemMap.set(i.id, item);
      if (i.parentId && itemMap.has(i.parentId)) {
        itemMap.get(i.parentId)!.children.push(item);
      } else {
        topLevel.push(item);
      }
    }

    return { id: m.id, name: m.name, slug: m.slug, items: topLevel };
  },

  menus: async () => {
    const db = getDb();
    const allMenus = await db.select().from(menus);
    return allMenus.map((m: typeof allMenus[0]) => ({ id: m.id, name: m.name, slug: m.slug, items: [] }));
  },

  taxonomies: async () => {
    const db = getDb();
    const rows = await db.select().from(taxonomies);
    return rows.map((t: typeof rows[0]) => ({
      id: t.id, name: t.name, slug: t.slug, description: t.description,
      hierarchical: !!t.hierarchical, terms: [],
    }));
  },

  taxonomy: async (args: { slug: string }) => {
    const db = getDb();
    const [tax] = await db.select().from(taxonomies).where(eq(taxonomies.slug, args.slug)).limit(1);
    if (!tax) return null;

    const termRows = await db.select().from(terms).where(eq(terms.taxonomyId, tax.id)).orderBy(asc(terms.weight));
    return {
      id: tax.id, name: tax.name, slug: tax.slug, description: tax.description,
      hierarchical: !!tax.hierarchical,
      terms: termRows.map((t: typeof termRows[0]) => ({ id: t.id, name: t.name, slug: t.slug, weight: t.weight })),
    };
  },

  config: async () => {
    const config = await loadConfig();
    return {
      siteName: config.siteName, tagline: config.tagline, logo: config.logo,
      defaultLocale: config.defaultLocale, supportedLocales: config.supportedLocales,
    };
  },
};

/**
 * POST /graphql — Execute a GraphQL query.
 * GET /graphql?query=... — Execute via query string (for tools like GraphiQL).
 */
app.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.query) {
    return c.json({ errors: [{ message: 'Query is required' }] }, 400);
  }

  const result = await graphql({
    schema,
    source: body.query,
    rootValue: root,
    variableValues: body.variables || {},
  });

  return c.json(result);
});

app.get('/', async (c) => {
  const query = c.req.query('query');
  if (!query) {
    return c.json({ errors: [{ message: 'Query parameter required' }] }, 400);
  }

  const result = await graphql({
    schema,
    source: query,
    rootValue: root,
  });

  return c.json(result);
});

export default app;
