import { Hono } from 'hono';
import { eq, desc, sql, and, like, or, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { media } from '../../db/schema/index.js';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { processImage, isProcessableImage } from '../../media/processing.js';
import { getStorage } from '../../media/storage.js';
import { fireWebhooks } from '../../webhooks.js';
import { logAudit } from '../../audit.js';

const app = new Hono();

/** Allowed MIME types for uploads */
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
  'image/svg+xml', 'image/bmp', 'image/tiff', 'image/x-icon',
  // Documents
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Video
  'video/mp4', 'video/webm', 'video/ogg',
  // Audio
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  // Archives
  'application/zip', 'application/gzip',
  // Text
  'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
  'application/json', 'application/xml',
]);

/** Max upload size: 50 MB */
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/** Allowed file extensions (must match MIME allowlist) */
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.bmp', '.tiff', '.ico',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp4', '.webm', '.ogg', '.ogv',
  '.mp3', '.wav',
  '.zip', '.gz',
  '.txt', '.csv', '.html', '.css', '.js', '.json', '.xml',
]);

/** Escape SQL LIKE wildcards in user input */
function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/** GET / - List media with filtering and pagination */
app.get('/', async (c) => {
  const db = getDb();
  const storage = getStorage();
  const mimeFilter = c.req.query('type');
  const search = c.req.query('search');
  const folder = c.req.query('folder');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const conditions = [];
  if (mimeFilter) conditions.push(like(media.mimeType, `%${escapeLike(mimeFilter)}%`));
  if (search) conditions.push(or(like(media.title, `%${escapeLike(search)}%`), like(media.originalName, `%${escapeLike(search)}%`)));
  if (folder === '') {
    conditions.push(or(isNull(media.folder), eq(media.folder, '')));
  } else if (folder) {
    conditions.push(eq(media.folder, folder));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(media).where(where).orderBy(desc(media.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(media).where(where);

  // Add public URLs to each row
  const data = rows.map((row: typeof rows[0]) => ({
    ...row,
    url: storage.getUrl(row.path),
    variantUrls: row.variants && typeof row.variants === 'object'
      ? Object.fromEntries(Object.entries(row.variants as Record<string, string>).map(([k, v]) => [k, storage.getUrl(v)]))
      : {},
  }));

  return c.json({ data, meta: { total: countResult[0].count, limit, offset } });
});

/** GET /folders - List distinct folders */
app.get('/folders', async (c) => {
  const db = getDb();
  const rows = await db.selectDistinct({ folder: media.folder }).from(media).where(sql`${media.folder} IS NOT NULL AND ${media.folder} != ''`).orderBy(media.folder);
  return c.json({ data: rows.map((r: typeof rows[0]) => r.folder) });
});

/** GET /:id - Get single media */
app.get('/:id', async (c) => {
  const db = getDb();
  const storage = getStorage();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Media not found' }] }, 404);

  return c.json({
    data: {
      ...row,
      url: storage.getUrl(row.path),
      variantUrls: row.variants && typeof row.variants === 'object'
        ? Object.fromEntries(Object.entries(row.variants as Record<string, string>).map(([k, v]) => [k, storage.getUrl(v)]))
        : {},
    },
  });
});

/** POST / - Upload media */
app.post('/', async (c) => {
  const db = getDb();
  const storage = getStorage();
  const payload = c.get('jwtPayload');
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'File is required' }] }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json({ errors: [{ code: 'VALIDATION', message: `File type "${file.type}" is not allowed` }] }, 400);
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return c.json({ errors: [{ code: 'VALIDATION', message: `File exceeds maximum size of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB` }] }, 400);
  }

  const originalName = file.name;
  const ext = extname(originalName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return c.json({ errors: [{ code: 'VALIDATION', message: `File extension "${ext}" is not allowed` }] }, 400);
  }

  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload original to storage
  const storedPath = await storage.upload(filename, buffer, file.type);

  const now = new Date().toISOString();
  const altText = (body['altText'] as string) || null;
  const title = (body['title'] as string) || originalName;
  const folder = (body['folder'] as string) || null;

  // Process image to extract dimensions and generate variants
  let width: number | null = null;
  let height: number | null = null;
  let variants: Record<string, string> = {};
  let imageMetadata: Record<string, unknown> = {};

  if (isProcessableImage(file.type)) {
    try {
      const result = await processImage(buffer, filename.replace(ext, ''));
      if (result) {
        width = result.width;
        height = result.height;
        imageMetadata = result.metadata;

        // Upload each variant to storage
        for (const variant of result.variants) {
          const variantPath = await storage.uploadVariant(variant.filename, variant.buffer, 'image/webp');
          variants[variant.name] = variantPath;
        }
      }
    } catch (err) {
      console.error('Image processing failed, saving original only:', err);
    }
  }

  const [row] = await db.insert(media).values({
    filename,
    originalName,
    mimeType: file.type,
    size: buffer.length,
    width,
    height,
    altText,
    title,
    folder,
    path: storedPath,
    variants,
    metadata: imageMetadata,
    createdAt: now,
    createdBy: payload.sub,
  }).returning();

  await logAudit(c, { action: 'create', entity: 'media', entityId: row.id, details: { filename: originalName } });
  fireWebhooks('media.uploaded', { id: row.id, filename: originalName, mimeType: file.type });

  return c.json({
    data: {
      ...row,
      url: storage.getUrl(row.path),
      variantUrls: variants && typeof variants === 'object'
        ? Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, storage.getUrl(v)]))
        : {},
    },
  }, 201);
});

/** PUT /:id - Update media metadata */
app.put('/:id', async (c) => {
  const db = getDb();
  const storage = getStorage();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const parsed = z.object({
    altText: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    folder: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(media).set(parsed.data).where(eq(media.id, id));
  const [updated] = await db.select().from(media).where(eq(media.id, id)).limit(1);

  return c.json({
    data: {
      ...updated,
      url: storage.getUrl(updated.path),
      variantUrls: updated.variants && typeof updated.variants === 'object'
        ? Object.fromEntries(Object.entries(updated.variants as Record<string, string>).map(([k, v]) => [k, storage.getUrl(v)]))
        : {},
    },
  });
});

/** DELETE /:id - Delete media */
app.delete('/:id', async (c) => {
  const db = getDb();
  const storage = getStorage();
  const id = parseInt(c.req.param('id'), 10);

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Media not found' }] }, 404);

  // Delete original from storage
  await storage.delete(row.path);

  // Delete variant files from storage
  if (row.variants && typeof row.variants === 'object') {
    for (const variantPath of Object.values(row.variants as Record<string, string>)) {
      await storage.delete(variantPath);
    }
  }

  await db.delete(media).where(eq(media.id, id));
  await logAudit(c, { action: 'delete', entity: 'media', entityId: id, details: { filename: row.originalName } });
  fireWebhooks('media.deleted', { id, filename: row.originalName });
  return c.json({ data: { deleted: true } });
});

export default app;
