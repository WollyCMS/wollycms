import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { readFile, stat } from 'node:fs/promises';
import { getDb } from '../../db/index.js';
import { media } from '../../db/schema/index.js';

const VALID_VARIANTS = ['original', 'thumbnail', 'medium', 'large', 'info'] as const;
type Variant = (typeof VALID_VARIANTS)[number];

/** One year in seconds for immutable cache headers. */
const CACHE_MAX_AGE = 31536000;

/**
 * Determine Content-Type for a variant file.
 * Generated variants are always WebP; originals keep their stored mimeType.
 */
function getContentType(variant: string, originalMimeType: string): string {
  return variant === 'original' ? originalMimeType : 'image/webp';
}

const app = new Hono();

/**
 * GET /:id/:variant - Serve media files or metadata.
 * Variants: original, thumbnail, medium, large, info.
 * - "info" returns JSON metadata.
 * - All other variants serve the actual file binary with correct headers.
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

  // For "info" variant, return full metadata as JSON
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

  // Resolve the file path for the requested variant
  const filePath =
    variant === 'original'
      ? record.path
      : record.variants?.[variant] || null;

  if (!filePath) {
    return c.json(
      { errors: [{ code: 'VARIANT_NOT_FOUND', message: `Variant "${variant}" not available for this media` }] },
      404,
    );
  }

  // Read and serve the file
  try {
    await stat(filePath);
  } catch {
    return c.json(
      { errors: [{ code: 'FILE_NOT_FOUND', message: 'File not found on disk' }] },
      404,
    );
  }

  const fileBuffer = await readFile(filePath);
  const contentType = getContentType(variant, record.mimeType);

  c.header('Content-Type', contentType);
  c.header('Content-Length', String(fileBuffer.length));
  c.header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, immutable`);

  return c.body(fileBuffer);
});

export default app;
