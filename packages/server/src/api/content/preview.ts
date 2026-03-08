import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { verify } from 'hono/jwt';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { getDb } from '../../db/index.js';
import { env } from '../../env.js';
import {
  pages, contentTypes, blocks, blockTypes, pageBlocks,
} from '../../db/schema/index.js';

/**
 * Preview auth middleware: accepts JWT from Authorization header
 * or the short-lived preview session cookie.
 */
/**
 * Preview auth: accepts JWT from Authorization header, preview cookie,
 * or `token` query param (needed for cross-origin iframe preview where
 * cookies can't be shared). Query-param tokens are short-lived (10 min).
 */
const previewAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
    || getCookie(c, 'wolly_preview')
    || c.req.query('token');
  if (!token) {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Preview requires authentication' }] }, 401);
  }
  try {
    await verify(token, env.JWT_SECRET, 'HS256');
    await next();
  } catch {
    return c.json({ errors: [{ code: 'UNAUTHORIZED', message: 'Invalid token' }] }, 401);
  }
});

const app = new Hono();

app.use('/*', previewAuth);

/**
 * GET /pages/:slug - Get page with blocks regardless of status (for live preview).
 * Same response format as the public content API.
 */
app.get('/pages/:slug', async (c) => {
  const db = getDb();
  const slug = c.req.param('slug');

  const pageRows = await db
    .select({
      id: pages.id,
      typeSlug: contentTypes.slug,
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
    .where(eq(pages.slug, slug))
    .limit(1);

  if (pageRows.length === 0) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  }

  const page = pageRows[0];

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

  const regions: Record<string, unknown[]> = {};
  for (const pb of pbRows) {
    if (!regions[pb.region]) regions[pb.region] = [];
    let resolvedFields = pb.blockFields || {};
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

  return c.json({
    data: {
      id: page.id,
      type: page.typeSlug,
      title: page.title,
      slug: page.slug,
      status: page.status,
      fields: page.fields,
      regions,
      meta: {
        created_at: page.createdAt,
        updated_at: page.updatedAt,
        published_at: page.publishedAt,
      },
    },
  });
});

export default app;
