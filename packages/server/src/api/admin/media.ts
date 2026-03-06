import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { media } from '../../db/schema/index.js';
import { env } from '../../env.js';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { processImage, isProcessableImage } from '../../media/processing.js';

const app = new Hono();

/** GET / - List media with filtering and pagination */
app.get('/', async (c) => {
  const db = getDb();
  const mimeFilter = c.req.query('type');
  const search = c.req.query('search');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const conditions: ReturnType<typeof eq>[] = [];
  if (mimeFilter) conditions.push(sql`${media.mimeType} LIKE ${'%' + mimeFilter + '%'}`);
  if (search) conditions.push(sql`(${media.title} LIKE ${'%' + search + '%'} OR ${media.originalName} LIKE ${'%' + search + '%'})`);

  const where = conditions.length > 0 ? sql`${conditions.map((c, i) => i === 0 ? c : sql` AND ${c}`)}` : undefined;

  const rows = await db.select().from(media).orderBy(desc(media.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(media);

  return c.json({ data: rows, meta: { total: countResult[0].count, limit, offset } });
});

/** GET /:id - Get single media */
app.get('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Media not found' }] }, 404);
  return c.json({ data: row });
});

/** POST / - Upload media */
app.post('/', async (c) => {
  const db = getDb();
  const payload = c.get('jwtPayload');
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'File is required' }] }, 400);
  }

  const originalName = file.name;
  const ext = extname(originalName);
  const filename = `${randomUUID()}${ext}`;
  const uploadDir = env.MEDIA_DIR;

  await mkdir(uploadDir, { recursive: true });
  const filePath = join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const now = new Date().toISOString();
  const altText = (body['altText'] as string) || null;
  const title = (body['title'] as string) || originalName;

  // Process image to extract dimensions and generate variants
  let width: number | null = null;
  let height: number | null = null;
  let variants: Record<string, string> = {};
  let imageMetadata: Record<string, unknown> = {};

  if (isProcessableImage(file.type)) {
    try {
      const result = await processImage(filePath, uploadDir);
      if (result) {
        width = result.width;
        height = result.height;
        variants = result.variants;
        imageMetadata = result.metadata;
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
    path: filePath,
    variants,
    metadata: imageMetadata,
    createdAt: now,
    createdBy: payload.sub,
  }).returning();

  return c.json({ data: row }, 201);
});

/** PUT /:id - Update media metadata */
app.put('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json().catch(() => null);

  const parsed = z.object({
    altText: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  await db.update(media).set(parsed.data).where(eq(media.id, id));
  const [updated] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return c.json({ data: updated });
});

/** DELETE /:id - Delete media */
app.delete('/:id', async (c) => {
  const db = getDb();
  const id = parseInt(c.req.param('id'), 10);

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Media not found' }] }, 404);

  // Delete original file from disk
  try {
    await unlink(row.path);
  } catch {
    // File may already be gone
  }

  // Delete variant files from disk
  if (row.variants && typeof row.variants === 'object') {
    for (const variantPath of Object.values(row.variants)) {
      try {
        await unlink(variantPath);
      } catch {
        // Variant file may already be gone
      }
    }
  }

  await db.delete(media).where(eq(media.id, id));
  return c.json({ data: { deleted: true } });
});

export default app;
