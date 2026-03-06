import { Hono } from 'hono';
import type { Context, Next } from 'hono';
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

const app = new Hono();

// Cache-Control headers for public content API
async function cacheHeaders(c: Context, next: Next) {
  await next();
  if (c.req.method === 'GET' && c.res.status === 200) {
    const maxAge = env.NODE_ENV === 'production' ? 60 : 0;
    c.header('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 10}, stale-while-revalidate=${maxAge * 60}`);
  }
}
app.use('*', cacheHeaders);

app.route('/pages', pagesRouter);
app.route('/menus', menusRouter);
app.route('/taxonomies', taxonomiesRouter);
app.route('/media', mediaRouter);
app.route('/redirects', redirectsRouter);
app.route('/config', configRouter);
app.route('/schemas', schemasRouter);
app.route('/preview', previewRouter);
app.route('/batch', batchRouter);

export default app;
