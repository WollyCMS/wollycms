import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { contentTerms, terms, taxonomies } from '../../db/schema/index.js';
import { requireRole } from '../../auth/rbac.js';
import { cacheInvalidate } from '../../cache.js';

const app = new Hono();

app.put('/*', requireRole('editor'));

/** GET /:id/terms - List terms assigned to a page */
app.get('/:id/terms', async (c) => {
  const db = getDb();
  const pageId = parseInt(c.req.param('id'), 10);

  const rows = await db
    .select({
      id: contentTerms.id,
      termId: terms.id,
      termName: terms.name,
      termSlug: terms.slug,
      taxonomyId: taxonomies.id,
      taxonomyName: taxonomies.name,
      taxonomySlug: taxonomies.slug,
    })
    .from(contentTerms)
    .innerJoin(terms, eq(contentTerms.termId, terms.id))
    .innerJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id))
    .where(and(eq(contentTerms.entityType, 'page'), eq(contentTerms.entityId, pageId)));

  return c.json({ data: rows });
});

/** PUT /:id/terms - Replace all terms for a page */
app.put('/:id/terms', async (c) => {
  const db = getDb();
  const pageId = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const parsed = z.object({
    termIds: z.array(z.number().int().positive()),
  }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);
  }

  // Delete existing term links for this page
  await db.delete(contentTerms).where(
    and(eq(contentTerms.entityType, 'page'), eq(contentTerms.entityId, pageId))
  );

  // Insert new term links
  if (parsed.data.termIds.length > 0) {
    await db.insert(contentTerms).values(
      parsed.data.termIds.map((termId) => ({
        entityType: 'page' as const,
        entityId: pageId,
        termId,
      }))
    );
  }

  cacheInvalidate('pages:');

  // Return the updated terms
  const rows = await db
    .select({
      id: contentTerms.id,
      termId: terms.id,
      termName: terms.name,
      termSlug: terms.slug,
      taxonomyId: taxonomies.id,
      taxonomyName: taxonomies.name,
      taxonomySlug: taxonomies.slug,
    })
    .from(contentTerms)
    .innerJoin(terms, eq(contentTerms.termId, terms.id))
    .innerJoin(taxonomies, eq(terms.taxonomyId, taxonomies.id))
    .where(and(eq(contentTerms.entityType, 'page'), eq(contentTerms.entityId, pageId)));

  return c.json({ data: rows });
});

export default app;
