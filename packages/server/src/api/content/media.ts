import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { media } from '../../db/schema/index.js';

const VALID_VARIANTS = ['original', 'thumbnail', 'medium', 'large', 'info'] as const;
type Variant = (typeof VALID_VARIANTS)[number];

const app = new Hono();

/**
 * GET /:id/:variant - Serve media file info by id and variant.
 * Variants: original, thumbnail, medium, large, info.
 * For now, returns media record as JSON. Actual file serving comes later.
 */
app.get('/:id/:variant', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const variant = c.req.param('variant') as string;

  if (isNaN(id)) {
    return c.json(
      { errors: [{ code: 'INVALID_ID', message: 'Invalid media ID' }] },
      400,
    );
  }

  if (!VALID_VARIANTS.includes(variant as Variant)) {
    return c.json(
      { errors: [{ code: 'INVALID_VARIANT', message: `Invalid variant. Must be one of: ${VALID_VARIANTS.join(', ')}` }] },
      400,
    );
  }

  const rows = await db
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  if (rows.length === 0) {
    return c.json(
      { errors: [{ code: 'NOT_FOUND', message: 'Media not found' }] },
      404,
    );
  }

  const record = rows[0];

  // For "info" variant, return full metadata
  if (variant === 'info') {
    return c.json({
      data: {
        id: record.id,
        filename: record.filename,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
        width: record.width,
        height: record.height,
        altText: record.altText,
        title: record.title,
        variants: record.variants,
        metadata: record.metadata,
        createdAt: record.createdAt,
      },
    });
  }

  // For other variants, return file reference info (actual streaming comes later)
  const variantPath =
    variant === 'original'
      ? record.path
      : record.variants?.[variant] || null;

  return c.json({
    data: {
      id: record.id,
      variant,
      mimeType: record.mimeType,
      path: variantPath,
      width: record.width,
      height: record.height,
      altText: record.altText,
      title: record.title,
    },
  });
});

export default app;
