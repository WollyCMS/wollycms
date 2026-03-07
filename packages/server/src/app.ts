import './types.js';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import contentRouter from './api/content/index.js';
import adminRouter from './api/admin/index.js';
import { env, isProduction } from './env.js';
import { cacheSize } from './cache.js';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';

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
app.use('*', cors({
  origin: env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));

app.route('/api/content', contentRouter);
app.route('/api/admin', adminRouter);

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
 */
app.get('/uploads/*', async (c) => {
  const requestedPath = c.req.path.replace(/^\/uploads\//, '');

  if (requestedPath.includes('..') || requestedPath.startsWith('/')) {
    return c.json({ errors: [{ code: 'FORBIDDEN', message: 'Invalid path' }] }, 403);
  }

  const filePath = join(env.MEDIA_DIR, requestedPath);

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

// Serve admin SPA (production: built static files)
if (env.NODE_ENV === 'production') {
  app.use('/admin/*', serveStatic({ root: './packages/admin/build', rewriteRequestPath: (p) => p.replace('/admin', '') }));
  app.get('/admin/*', serveStatic({ root: './packages/admin/build', path: '/index.html' }));
  app.get('/admin', serveStatic({ root: './packages/admin/build', path: '/index.html' }));
}

export default app;
