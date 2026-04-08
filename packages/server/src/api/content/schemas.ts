import { Hono } from 'hono';
import { getDb } from '../../db/index.js';
import { contentTypes, blockTypes } from '../../db/schema/index.js';

const app = new Hono();

/**
 * GET / - Return all content type and block type schemas.
 * Used by @wollycms/astro to generate TypeScript types.
 */
app.get('/', async (c) => {
  const db = getDb();

  const [ctRows, btRows] = await Promise.all([
    db
      .select({
        id: contentTypes.id,
        name: contentTypes.name,
        slug: contentTypes.slug,
        description: contentTypes.description,
        fieldsSchema: contentTypes.fieldsSchema,
        regions: contentTypes.regions,
        defaultBlocks: contentTypes.defaultBlocks,
      })
      .from(contentTypes),
    db
      .select({
        id: blockTypes.id,
        name: blockTypes.name,
        slug: blockTypes.slug,
        description: blockTypes.description,
        fieldsSchema: blockTypes.fieldsSchema,
        icon: blockTypes.icon,
        category: blockTypes.category,
      })
      .from(blockTypes),
  ]);

  return c.json({
    data: {
      contentTypes: ctRows,
      blockTypes: btRows,
    },
  });
});

export default app;
