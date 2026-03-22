import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { createHash } from 'node:crypto';
import { env } from '../../env.js';
import pagesRouter from './pages.js';
import menusRouter from './menus.js';
import taxonomiesRouter from './taxonomies.js';
import mediaRouter from './media.js';
import redirectsRouter from './redirects.js';
import configRouter from './config.js';
import schemasRouter from './schemas.js';
import previewRouter from './preview.js';
import batchRouter from './batch.js';
import sitemapRouter from './sitemap.js';
import searchRouter from './search.js';
import ogImageRouter from './og-image.js';
import trackingScriptsRouter from './tracking-scripts.js';
import graphqlRouter from './graphql.js';
const app = new Hono();

// Cache-Control + ETag headers for public content API
async function cacheMiddleware(c: Context, next: Next) {
  await next();
  if (c.req.method === 'GET' && c.res.status === 200) {
    const maxAge = env.NODE_ENV === 'production' ? 60 : 0;
    c.res.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 10}, stale-while-revalidate=${maxAge * 60}`);

    if (c.res.headers.has('ETag')) return;

    const contentType = c.res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;

    const contentLength = Number(c.res.headers.get('content-length') || '0');
    if (contentLength > 512_000) return;

    // Clone response to read body without consuming the original
    const cloned = c.res.clone();
    const body = await cloned.text();
    const etag = `"${createHash('md5').update(body).digest('hex').slice(0, 16)}"`;

    const ifNoneMatch = c.req.header('If-None-Match');
    if (ifNoneMatch === etag) {
      c.res = new Response(null, { status: 304 });
      c.res.headers.set('ETag', etag);
      c.res.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 10}, stale-while-revalidate=${maxAge * 60}`);
      return;
    }

    c.res.headers.set('ETag', etag);
  }
}
app.use('*', cacheMiddleware);

app.route('/pages', pagesRouter);
app.route('/menus', menusRouter);
app.route('/taxonomies', taxonomiesRouter);
app.route('/media', mediaRouter);
app.route('/redirects', redirectsRouter);
app.route('/config', configRouter);
app.route('/schemas', schemasRouter);
app.route('/preview', previewRouter);
app.route('/batch', batchRouter);
app.route('/sitemap', sitemapRouter);
app.route('/search', searchRouter);
app.route('/og', ogImageRouter);
app.route('/tracking-scripts', trackingScriptsRouter);
app.route('/graphql', graphqlRouter);
export default app;
