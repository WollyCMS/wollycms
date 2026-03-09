import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { defaultTemplate, type OgTemplateData } from './template.js';
export type { OgTemplateData } from './template.js';
import { getStorage } from '../media/storage.js';
import { getDb } from '../db/index.js';
import { media, pages } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

/** Satori element node (subset of React.createElement format) */
export interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: SatoriNode | SatoriNode[] | string;
    [key: string]: unknown;
  };
}

let fontsCache: Array<{ name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900; style: 'normal' | 'italic' }> | null = null;

function loadFonts() {
  if (fontsCache) return fontsCache;
  // Resolve __dirname lazily — import.meta.url is undefined on Workers
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const regular = readFileSync(join(__dirname, 'fonts', 'Inter-Regular.woff2'));
  const bold = readFileSync(join(__dirname, 'fonts', 'Inter-Bold.woff2'));
  fontsCache = [
    { name: 'Inter', data: regular.buffer.slice(regular.byteOffset, regular.byteOffset + regular.byteLength), weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: bold.buffer.slice(bold.byteOffset, bold.byteOffset + bold.byteLength), weight: 700 as const, style: 'normal' as const },
  ];
  return fontsCache;
}

/** Try to load sharp. Returns null if unavailable (Workers). */
async function loadSharp(): Promise<any | null> {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * Generate a 1200×630 OG image PNG buffer from template data.
 * Returns null if sharp is unavailable (Workers environment).
 */
export async function generateOgBuffer(data: OgTemplateData): Promise<Buffer | null> {
  const sharp = await loadSharp();
  if (!sharp) return null;

  const satori = (await import('satori')).default;
  const fonts = loadFonts();
  const element = defaultTemplate(data);

  const svg = await satori(element as any, {
    width: 1200,
    height: 630,
    fonts,
  });

  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .png({ quality: 90 })
    .toBuffer();

  return pngBuffer;
}

export interface OgGenerateResult {
  ogImageUrl: string;
  mediaId: number;
}

/**
 * Generate an OG image for a page, upload it to media storage,
 * create a media record, and update the page's ogImage field.
 */
export async function generateAndStoreOgImage(
  pageId: number,
  data: OgTemplateData,
  pageSlug: string,
): Promise<OgGenerateResult | null> {
  const buffer = await generateOgBuffer(data);
  if (!buffer) return null;

  const storage = getStorage();
  const db = getDb();

  // Generate a unique filename
  const shortId = randomUUID().slice(0, 8);
  const filename = `og-${pageSlug}-${shortId}.png`;

  // Upload to storage
  const storedPath = await storage.upload(filename, buffer, 'image/png');
  const ogImageUrl = storage.getUrl(storedPath);

  // Create media record
  const now = new Date().toISOString();
  const [mediaRow] = await db.insert(media).values({
    filename,
    originalName: `og-${pageSlug}.png`,
    mimeType: 'image/png',
    size: buffer.length,
    width: 1200,
    height: 630,
    altText: `Open Graph image for ${data.title}`,
    title: `OG: ${data.title}`,
    folder: 'og-images',
    path: storedPath,
    variants: '{}',
    createdAt: now,
  }).returning();

  // Update page's ogImage field
  await db.update(pages).set({ ogImage: ogImageUrl, updatedAt: now }).where(eq(pages.id, pageId));

  return { ogImageUrl, mediaId: mediaRow.id };
}

export interface BulkOgResult {
  generated: number;
  skipped: number;
  errors: string[];
}

/**
 * Bulk generate OG images for pages missing them.
 * @param force - Regenerate even if ogImage already exists
 * @param contentTypeSlug - Filter by content type slug
 * @param dryRun - Log what would happen without generating
 * @param log - Optional logger (defaults to console.log)
 */
export async function bulkGenerateOgImages(options: {
  force?: boolean;
  contentTypeSlug?: string;
  dryRun?: boolean;
  siteName?: string;
  log?: (msg: string) => void;
}): Promise<BulkOgResult> {
  const { force = false, contentTypeSlug, dryRun = false, siteName = 'WollyCMS' } = options;
  const log = options.log || console.log;
  const db = getDb();

  // Import contentTypes for join
  const { contentTypes } = await import('../db/schema/index.js');

  // Build query for published pages
  let query = db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      metaTitle: pages.metaTitle,
      metaDescription: pages.metaDescription,
      ogImage: pages.ogImage,
      typeSlug: contentTypes.slug,
      typeName: contentTypes.name,
    })
    .from(pages)
    .innerJoin(contentTypes, eq(pages.typeId, contentTypes.id))
    .where(eq(pages.status, 'published'))
    .$dynamic();

  if (contentTypeSlug) {
    const { and } = await import('drizzle-orm');
    query = query.where(and(eq(pages.status, 'published'), eq(contentTypes.slug, contentTypeSlug)));
  }

  const allPages = await query;
  const result: BulkOgResult = { generated: 0, skipped: 0, errors: [] };
  const batchSize = 10;

  for (let i = 0; i < allPages.length; i += batchSize) {
    const batch = allPages.slice(i, i + batchSize);

    for (const page of batch) {
      if (page.ogImage && !force) {
        result.skipped++;
        continue;
      }

      const data: OgTemplateData = {
        title: page.metaTitle || page.title,
        description: page.metaDescription,
        siteName,
        contentType: page.typeName,
      };

      if (dryRun) {
        log(`  [dry-run] Would generate: ${page.slug} — "${data.title}"`);
        result.generated++;
        continue;
      }

      try {
        const ogResult = await generateAndStoreOgImage(page.id, data, page.slug);
        if (ogResult) {
          result.generated++;
          log(`  Generated: ${page.slug} → ${ogResult.ogImageUrl}`);
        } else {
          result.errors.push(`${page.slug}: Sharp unavailable`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${page.slug}: ${msg}`);
        log(`  Error: ${page.slug} — ${msg}`);
      }
    }

    if (!dryRun && i + batchSize < allPages.length) {
      log(`  Progress: ${Math.min(i + batchSize, allPages.length)}/${allPages.length} pages...`);
    }
  }

  return result;
}
