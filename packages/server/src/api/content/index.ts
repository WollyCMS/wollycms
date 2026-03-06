import { Hono } from 'hono';
import pagesRouter from './pages.js';
import menusRouter from './menus.js';
import taxonomiesRouter from './taxonomies.js';
import mediaRouter from './media.js';
import redirectsRouter from './redirects.js';
import configRouter from './config.js';
import schemasRouter from './schemas.js';

const app = new Hono();

app.route('/pages', pagesRouter);
app.route('/menus', menusRouter);
app.route('/taxonomies', taxonomiesRouter);
app.route('/media', mediaRouter);
app.route('/redirects', redirectsRouter);
app.route('/config', configRouter);
app.route('/schemas', schemasRouter);

export default app;
