import './types.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import contentRouter from './api/content/index.js';
import adminRouter from './api/admin/index.js';
import { env, isProduction } from './env.js';
import { cacheSize } from './cache.js';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { getStorage } from './media/storage.js';

/** Map common file extensions to MIME types for static serving. */
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
};

const INLINE_SAFE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
]);

const app = new Hono();

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  console.error('Unhandled error:', err);
  return c.json({
    errors: [{ code: 'INTERNAL_ERROR', message: isProduction() ? 'Internal server error' : err.message }],
  }, 500);
});

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  // Log path without query to avoid leaking credentials in URLs.
  console.log(`<-- ${c.req.method} ${c.req.path}`);
  console.log(`--> ${c.req.method} ${c.req.path} ${c.res.status} ${Date.now() - start}ms`);
});
app.use('*', bodyLimit({ maxSize: 50 * 1024 * 1024 })); // 50MB max request body

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  // Allow framing from the configured SITE_URL (for admin preview iframe).
  // All other origins are blocked via Content-Security-Policy frame-ancestors.
  const siteOrigin = new URL(env.SITE_URL).origin;
  c.header('Content-Security-Policy', `frame-ancestors 'self' ${siteOrigin}`);
  c.header('X-XSS-Protection', '0');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProduction()) {
    c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
});

app.use('*', cors({
  origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));

app.route('/api/content', contentRouter);
app.route('/api/admin', adminRouter);

// Root redirects to admin UI
app.get('/', (c) => c.redirect('/admin'));

// Convenience redirect for /sitemap.xml
app.get('/sitemap.xml', (c) => c.redirect('/api/content/sitemap'));

app.get('/api/health', (c) => {
  const uptime = typeof process !== 'undefined' && typeof process.uptime === 'function'
    ? Math.floor(process.uptime()) : 0;
  return c.json({
    status: 'ok',
    version: '0.1.0',
    uptime,
    timestamp: new Date().toISOString(),
    cache: { entries: cacheSize() },
  });
});

/**
 * GET /uploads/* - Serve uploaded files from MEDIA_DIR (local storage only).
 */
if (!getStorage().isExternal) {
  app.get('/uploads/*', async (c) => {
    const requestedPath = c.req.path.replace(/^\/uploads\//, '');

    if (requestedPath.includes('..') || requestedPath.startsWith('/') || requestedPath.includes('\0')) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Invalid path' }] }, 403);
    }

    const { resolve, join, extname } = await import('node:path');
    const { createReadStream } = await import('node:fs');
    const { stat } = await import('node:fs/promises');

    const mediaRoot = resolve(env.MEDIA_DIR);
    const filePath = resolve(join(env.MEDIA_DIR, requestedPath));

    if (!filePath.startsWith(mediaRoot)) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Invalid path' }] }, 403);
    }

    let fileStat: import('node:fs').Stats;
    try {
      fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        return c.notFound();
      }
    } catch {
      return c.notFound();
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileStream = createReadStream(filePath);

    c.header('Content-Type', contentType);
    c.header('Content-Length', String(fileStat.size));
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('Content-Security-Policy', "default-src 'none'; sandbox");
    if (!INLINE_SAFE_CONTENT_TYPES.has(contentType)) {
      c.header('Content-Disposition', 'attachment');
    }

    return c.body(fileStream as unknown as ReadableStream);
  });
}

/**
 * GET /media/* - Serve media files from R2/S3 storage.
 * Reads the file from the storage backend and streams it with correct
 * content type and long-lived cache headers (filenames contain UUIDs).
 */
if (getStorage().isExternal) {
  app.get('/media/*', async (c) => {
    const requestedPath = c.req.path.replace(/^\/media\//, '');

    if (requestedPath.includes('..') || requestedPath.startsWith('/') || requestedPath.includes('\0') || !requestedPath) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Invalid path' }] }, 403);
    }

    const fileData = await getStorage().read(requestedPath);
    if (!fileData) {
      return c.notFound();
    }

    const ext = '.' + (requestedPath.split('.').pop() || '').toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    c.header('Content-Type', contentType);
    c.header('Content-Length', String(fileData.byteLength));
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    c.header('Content-Security-Policy', "default-src 'none'; sandbox");
    if (!INLINE_SAFE_CONTENT_TYPES.has(contentType)) {
      c.header('Content-Disposition', 'attachment');
    }

    const ab = new ArrayBuffer(fileData.byteLength);
    new Uint8Array(ab).set(fileData);
    return c.body(ab);
  });
}

// Serve admin SPA (production: built static files, Node.js only)
// On Workers, admin assets are served via wrangler [assets] config.
if (env.NODE_ENV === 'production' && typeof process !== 'undefined' && process.release?.name === 'node') {
  const { serveStatic } = await import('@hono/node-server/serve-static');
  app.use('/admin/*', serveStatic({ root: './packages/admin/build', rewriteRequestPath: (p) => p.replace('/admin', '') }));
  app.get('/admin/*', serveStatic({ root: './packages/admin/build', path: '/index.html' }));
  app.get('/admin', serveStatic({ root: './packages/admin/build', path: '/index.html' }));
}

export default app;
