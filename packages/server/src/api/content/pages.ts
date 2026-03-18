import { Hono } from 'hono';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import {
  pages,
  contentTypes,
  blocks,
  blockTypes,
  pageBlocks,
  contentTerms,
  terms,
  taxonomies,
} from '../../db/schema/index.js';
import { cacheGet, cacheSet } from '../../cache.js';

const app = new Hono();

/**
 * GET / - List published pages with filtering, sorting, pagination.
 */
app.get('/', async (c) => {
  const db = getDb();

  const typeSlug = c.req.query('type');
  const taxonomyFilter = c.req.query('taxonomy');
  const sortParam = c.req.query('sort') || 'published_at:desc';
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const now = new Date().toISOString();
  const conditions: ReturnType<typeof eq>[] = [
    eq(pages.status, 'published'),
    sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${now})`,
  ];

  // Filter by content type slug via subquery
  if (typeSlug) {
    const typeRow = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(eq(contentTypes.slug, typeSlug))
      .limit(1);

    if (typeRow.length === 0) {
      return c.json({ data: [], meta: { total: 0, limit, offset } });
    }
    conditions.push(eq(pages.typeId, typeRow[0].id));
  }

  // Filter by taxonomy term (format: vocabulary:term or just vocabulary)
  // Uses raw SQL subquery to avoid D1's 100 bind-parameter limit with inArray
  if (taxonomyFilter) {
    const [vocabSlug, termSlug] = taxonomyFilter.split(':');
    if (vocabSlug && termSlug) {
      conditions.push(
        sql`${pages.id} IN (
          SELECT ${contentTerms.entityId} FROM ${contentTerms}
          INNER JOIN ${terms} ON ${contentTerms.termId} = ${terms.id}
          INNER JOIN ${taxonomies} ON ${terms.taxonomyId} = ${taxonomies.id}
          WHERE ${contentTerms.entityType} = 'page'
            AND ${taxonomies.slug} = ${vocabSlug}
            AND ${terms.slug} = ${termSlug}
        )`
      );
    } else if (vocabSlug) {
      // Filter by any term in the taxonomy (no specific term)
      conditions.push(
        sql`${pages.id} IN (
          SELECT ${contentTerms.entityId} FROM ${contentTerms}
          INNER JOIN ${terms} ON ${contentTerms.termId} = ${terms.id}
          INNER JOIN ${taxonomies} ON ${terms.taxonomyId} = ${taxonomies.id}
          WHERE ${contentTerms.entityType} = 'page'
            AND ${taxonomies.slug} = ${vocabSlug}
        )`
      );
    }
  }

  const whereClause = and(...conditions);

  // Sorting
  const [sortField, sortDir] = sortParam.split(':');
  const sortFn = sortDir === 'asc' ? asc : desc;
  const sortColumn = getSortColumn(sortField);

  // Count total
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pages)
    .where(whereClause);
  const total = countResult[0].count;

  // Fetch pages with content type info
  const rows = await db
    .select({
      id: pages.id,
      typeId: pages.typeId,
      typeSlug: contentTypes.slug,
      typeName: contentTypes.name,
      title: pages.title,
      slug: pages.slug,
      status: pages.status,
      fields: pages.fields,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
      publishedAt: pages.publishedAt,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .where(whereClause)
    .orderBy(sortFn(sortColumn))
    .limit(limit)
    .offset(offset);

  // Batch-fetch taxonomy terms for all returned pages
  // Uses raw SQL IN clause to avoid D1's bind-parameter limit
  const pageIds = rows.map((r: typeof rows[0]) => r.id);
  const termsMap: Record<number, Array<{ taxonomy: string; term: string; weight: number }>> = {};
  if (pageIds.length > 0) {
    const termRows = await db
      .select({
        entityId: contentTerms.entityId,
        taxonomySlug: taxonomies.slug,
        termSlug: terms.slug,
        termName: terms.name,
        weight: terms.weight,
      })
      .from(contentTerms)
      .innerJoin(terms, eq(contentTerms.termId, terms.id))
      .innerJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id))
      .where(
        and(
          eq(contentTerms.entityType, 'page'),
          sql`${contentTerms.entityId} IN (${sql.raw(pageIds.join(','))})`
        )
      );
    for (const tr of termRows) {
      if (!termsMap[tr.entityId]) termsMap[tr.entityId] = [];
      termsMap[tr.entityId].push({ taxonomy: tr.taxonomySlug, term: tr.termSlug, weight: tr.weight });
    }
  }

  const data = rows.map((row: typeof rows[0]) => ({
    id: row.id,
    type: row.typeSlug,
    title: row.title,
    slug: row.slug,
    status: row.status,
    fields: row.fields,
    terms: termsMap[row.id] || [],
    meta: {
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      published_at: row.publishedAt,
    },
  }));

  return c.json({ data, meta: { total, limit, offset } });
});

/**
 * GET /:slug - Get single published page with resolved blocks per region.
 */
app.get('/:slug{.+}', async (c) => {
  const db = getDb();
  const slug = c.req.param('slug');

  const cacheKey = `pages:${slug}`;
  const cached = cacheGet<object>(cacheKey);
  if (cached) return c.json(cached);

  // Fetch the page
  const pageRows = await db
    .select({
      id: pages.id,
      typeId: pages.typeId,
      typeSlug: contentTypes.slug,
      title: pages.title,
      slug: pages.slug,
      status: pages.status,
      fields: pages.fields,
      metaTitle: pages.metaTitle,
      metaDescription: pages.metaDescription,
      ogImage: pages.ogImage,
      canonicalUrl: pages.canonicalUrl,
      robots: pages.robots,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
      publishedAt: pages.publishedAt,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .where(and(
      eq(pages.slug, slug),
      eq(pages.status, 'published'),
      sql`(${pages.scheduledAt} IS NULL OR ${pages.scheduledAt} <= ${new Date().toISOString()})`,
    ))
    .limit(1);

  if (pageRows.length === 0) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  }

  const page = pageRows[0];

  // Fetch all page_blocks with block and blockType data, ordered by region + position
  const pbRows = await db
    .select({
      pbId: pageBlocks.id,
      region: pageBlocks.region,
      position: pageBlocks.position,
      isShared: pageBlocks.isShared,
      overrides: pageBlocks.overrides,
      blockId: blocks.id,
      blockFields: blocks.fields,
      blockTitle: blocks.title,
      blockTypeSlug: blockTypes.slug,
    })
    .from(pageBlocks)
    .innerJoin(blocks, eq(pageBlocks.blockId, blocks.id))
    .innerJoin(blockTypes, eq(blocks.typeId, blockTypes.id))
    .where(eq(pageBlocks.pageId, page.id))
    .orderBy(asc(pageBlocks.region), asc(pageBlocks.position));

  // Group blocks by region and merge overrides for shared blocks
  const regions: Record<string, unknown[]> = {};

  for (const pb of pbRows) {
    if (!regions[pb.region]) {
      regions[pb.region] = [];
    }

    let resolvedFields = pb.blockFields || {};

    // For shared blocks, merge overrides on top of the base block fields
    if (pb.isShared && pb.overrides) {
      resolvedFields = { ...resolvedFields, ...pb.overrides };
    }

    const blockEntry: Record<string, unknown> = {
      id: `pb_${pb.pbId}`,
      block_type: pb.blockTypeSlug,
      fields: resolvedFields,
    };

    if (pb.isShared) {
      blockEntry.is_shared = true;
      blockEntry.block_id = pb.blockId;
    }

    regions[pb.region].push(blockEntry);
  }

  // Fetch taxonomy terms for this page
  const termRows = await db
    .select({
      taxonomySlug: taxonomies.slug,
      termSlug: terms.slug,
      termName: terms.name,
      weight: terms.weight,
    })
    .from(contentTerms)
    .innerJoin(terms, eq(contentTerms.termId, terms.id))
    .innerJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id))
    .where(
      and(eq(contentTerms.entityType, 'page'), eq(contentTerms.entityId, page.id))
    );

  const data = {
    id: page.id,
    type: page.typeSlug,
    title: page.title,
    slug: page.slug,
    status: page.status,
    fields: page.fields,
    terms: termRows.map((tr: typeof termRows[0]) => ({ taxonomy: tr.taxonomySlug, term: tr.termSlug, weight: tr.weight })),
    seo: {
      meta_title: page.metaTitle,
      meta_description: page.metaDescription,
      og_image: page.ogImage,
      canonical_url: page.canonicalUrl,
      robots: page.robots,
    },
    regions,
    meta: {
      created_at: page.createdAt,
      updated_at: page.updatedAt,
      published_at: page.publishedAt,
    },
  };

  const response = { data };
  cacheSet(cacheKey, response);
  return c.json(response);
});

function getSortColumn(field: string) {
  switch (field) {
    case 'title':
      return pages.title;
    case 'slug':
      return pages.slug;
    case 'created_at':
      return pages.createdAt;
    case 'updated_at':
      return pages.updatedAt;
    case 'published_at':
    default:
      return pages.publishedAt;
  }
}

export default app;
