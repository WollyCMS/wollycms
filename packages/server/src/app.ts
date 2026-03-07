import './types.js';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
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

app.use('*', logger());
app.use('*', bodyLimit({ maxSize: 50 * 1024 * 1024 })); // 50MB max request body

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
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

app.get('/api/health', (c) => c.json({
  status: 'ok',
  version: '0.1.0',
  uptime: Math.floor(process.uptime()),
  timestamp: new Date().toISOString(),
  cache: { entries: cacheSize() },
}));

/**
 * GET /uploads/* - Serve uploaded files from MEDIA_DIR with correct content
 * types and long-lived cache headers (filenames contain UUIDs).
 * Only mounted for local storage — S3/R2 media is served directly from CDN.
 */
if (!getStorage().isExternal) {
  app.get('/uploads/*', async (c) => {
    const requestedPath = c.req.path.replace(/^\/uploads\//, '');

    if (requestedPath.includes('..') || requestedPath.startsWith('/') || requestedPath.includes('\0')) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Invalid path' }] }, 403);
    }

    const mediaRoot = resolve(env.MEDIA_DIR);
    const filePath = resolve(join(env.MEDIA_DIR, requestedPath));

    if (!filePath.startsWith(mediaRoot)) {
      return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Invalid path' }] }, 403);
    }

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        return c.notFound();
      }
    } catch {
      return c.notFound();
    }

    const fileBuffer = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    c.header('Content-Type', contentType);
    c.header('Content-Length', String(fileBuffer.length));
    c.header('Cache-Control', 'public, max-age=31536000, immutable');

    return c.body(fileBuffer);
  });
}

// Serve admin SPA (production: built static files)
if (env.NODE_ENV === 'production') {
  app.use('/admin/*', serveStatic({ root: './packages/admin/build', rewriteRequestPath: (p) => p.replace('/admin', '') }));
  app.get('/admin/*', serveStatic({ root: './packages/admin/build', path: '/index.html' }));
  app.get('/admin', serveStatic({ root: './packages/admin/build', path: '/index.html' }));
}

export default app;
