import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pages } from '../../db/schema/index.js';
import { env } from '../../env.js';
import sharp from 'sharp';

const app = new Hono();

/** Cache generated OG images in memory (slug → PNG buffer). */
const ogCache = new Map<string, { buffer: Buffer; generatedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Default site name for branding */
const SITE_NAME = 'SpacelyCMS';

/**
 * Generate an OG image SVG using raw SVG markup.
 * This avoids the need for font files that satori requires.
 */
function generateOgSvg(title: string, description?: string | null, siteName?: string): string {
  // Truncate title if too long
  const displayTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
  const displayDesc = description
    ? (description.length > 120 ? description.slice(0, 117) + '...' : description)
    : null;
  const brand = siteName || SITE_NAME;

  // Split title into lines if needed (rough estimate: ~30 chars per line at this font size)
  const titleLines: string[] = [];
  if (displayTitle.length > 30) {
    const mid = displayTitle.lastIndexOf(' ', 30);
    if (mid > 10) {
      titleLines.push(displayTitle.slice(0, mid));
      titleLines.push(displayTitle.slice(mid + 1));
    } else {
      titleLines.push(displayTitle);
    }
  } else {
    titleLines.push(displayTitle);
  }

  const titleY = displayDesc ? 280 : 320;
  const titleSvg = titleLines
    .map((line, i) => `<text x="80" y="${titleY + i * 60}" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="white">${escapeXml(line)}</text>`)
    .join('\n    ');

  const descSvg = displayDesc
    ? `<text x="80" y="${titleY + titleLines.length * 60 + 30}" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="rgba(255,255,255,0.85)">${escapeXml(displayDesc)}</text>`
    : '';

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A0E1C;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#6B1D2A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B3A4A;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#C4962C;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D4A63C;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="0" y="0" width="8" height="630" fill="url(#accent)" />
  <rect x="80" y="${titleY - 70}" width="60" height="4" fill="#C4962C" rx="2" />
  <text x="80" y="580" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)">${escapeXml(brand)}</text>
  ${titleSvg}
  ${descSvg}
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GET /og/:slug - Generate an Open Graph image for a page.
 * Returns a 1200x630 PNG suitable for social sharing.
 */
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = getDb();

  // Check cache first
  const cached = ogCache.get(slug);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    c.header('Content-Type', 'image/png');
    c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    c.header('X-OG-Cache', 'hit');
    return c.body(cached.buffer as unknown as ArrayBuffer);
  }

  // Find the page
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))
    .limit(1);

  if (!page) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Page not found' }] }, 404);
  }

  // If page has an explicit OG image set, redirect to it
  if (page.ogImage) {
    return c.redirect(page.ogImage, 302);
  }

  // Generate the OG image
  const svg = generateOgSvg(
    page.metaTitle || page.title,
    page.metaDescription,
  );

  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .png({ quality: 90 })
    .toBuffer();

  // Cache the result
  ogCache.set(slug, { buffer: pngBuffer, generatedAt: Date.now() });

  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  c.header('X-OG-Cache', 'miss');
  return c.body(pngBuffer as unknown as ArrayBuffer);
});

/** Invalidate cached OG image for a slug. Called when a page is updated. */
export function invalidateOgCache(slug: string): void {
  ogCache.delete(slug);
}

/** Invalidate all OG images. */
export function clearOgCache(): void {
  ogCache.clear();
}

export default app;
