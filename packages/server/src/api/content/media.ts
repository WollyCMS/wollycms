import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { media } from '../../db/schema/index.js';
import { getStorage } from '../../media/storage.js';

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
 * - "info" returns JSON metadata with public URLs.
 * - For S3/R2 storage: redirects to the public CDN URL.
 * - For local storage: serves the file binary with correct headers.
 */
app.get('/:id/:variant', async (c) => {
  const db = getDb();
  const storage = getStorage();
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

  // For "info" variant, return full metadata as JSON with public URLs
  if (variant === 'info') {
    const variantUrls = record.variants && typeof record.variants === 'object'
      ? Object.fromEntries(Object.entries(record.variants as Record<string, string>).map(([k, v]) => [k, storage.getUrl(v)]))
      : {};

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
        url: storage.getUrl(record.path),
        variantUrls,
        variants: record.variants,
        metadata: record.metadata,
        createdAt: record.createdAt,
      },
    });
  }

  // Resolve the file path/key for the requested variant.
  // Fall back to the original when the variant hasn't been generated
  // (e.g. Workers environments where sharp is unavailable).
  const variantPath =
    variant === 'original'
      ? record.path
      : (record.variants as Record<string, string> | null)?.[variant] || null;

  const filePath = variantPath || record.path;
  const effectiveVariant = variantPath ? variant : 'original';

  // For external storage (S3/R2), redirect to the public CDN URL
  if (storage.isExternal) {
    const publicUrl = storage.getUrl(filePath);
    return c.redirect(publicUrl, 302);
  }

  // For local storage, read and serve the file
  const fileBuffer = await storage.read(filePath);
  if (!fileBuffer) {
    return c.json(
      { errors: [{ code: 'FILE_NOT_FOUND', message: 'File not found on disk' }] },
      404,
    );
  }

  const contentType = getContentType(effectiveVariant, record.mimeType);

  c.header('Content-Type', contentType);
  c.header('Content-Length', String(fileBuffer.length));
  c.header('Cache-Control', `public, max-age=${CACHE_MAX_AGE}, immutable`);

  return c.body(fileBuffer as unknown as ArrayBuffer);
});

export default app;
