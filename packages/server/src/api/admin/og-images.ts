import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages, contentTypes } from '../../db/schema/index.js';
import { logAudit } from '../../audit.js';
import { requireRole } from '../../auth/rbac.js';
import { generateAndStoreOgImage, bulkGenerateOgImages, type OgTemplateData } from '../../og/generate.js';
import { cacheInvalidate } from '../../cache.js';
import { clearOgCache } from '../content/og-image.js';

const app = new Hono();
app.use('/*', requireRole('admin'));

/**
 * POST /pages/:id/og-image - Generate (or regenerate) an OG image for a single page.
 */
app.post('/pages/:id/og-image', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [page] = await db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      metaTitle: pages.metaTitle,
      metaDescription: pages.metaDescription,
      typeId: pages.typeId,
    })
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);

  if (!page) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  }

  // Get content type name for the template
  const [ct] = await db.select({ name: contentTypes.name }).from(contentTypes).where(eq(contentTypes.id, page.typeId)).limit(1);

  const data: OgTemplateData = {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    siteName: 'WollyCMS',
    contentType: ct?.name,
  };

  let result;
  try {
    result = await generateAndStoreOgImage(page.id, data, page.slug);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ errors: [{ code: 'GENERATION_FAILED', message: msg }] }, 500);
  }
  if (!result) {
    return c.json({ errors: [{ code: 'UNAVAILABLE', message: 'Image generation unavailable (Sharp not loaded)' }] }, 503);
  }

  cacheInvalidate('pages:');
  clearOgCache();
  await logAudit(c, { action: 'create', entity: 'og_image', entityId: page.id, details: { slug: page.slug } });

  return c.json({ data: { ogImage: result.ogImageUrl, mediaId: result.mediaId } });
});

/**
 * POST /og-images/generate - Bulk generate OG images.
 * Body: { scope: "missing" | "all", contentType?: string }
 */
app.post('/og-images/generate', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({
    scope: z.enum(['missing', 'all']).default('missing'),
    contentType: z.string().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  const result = await bulkGenerateOgImages({
    force: parsed.data.scope === 'all',
    contentTypeSlug: parsed.data.contentType,
    log: () => {}, // suppress logging in API context
  });

  cacheInvalidate('pages:');
  clearOgCache();
  await logAudit(c, {
    action: 'create',
    entity: 'og_image',
    details: { scope: parsed.data.scope, generated: result.generated, skipped: result.skipped },
  });

  return c.json({ data: result });
});

export default app;
