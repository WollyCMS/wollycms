import { Hono } from 'hono';
import { authMiddleware } from '../../auth/middleware.js';
import authRouter from './auth.js';
import pagesRouter from './pages.js';
import blocksRouter from './blocks.js';
import menusRouter from './menus.js';
import taxonomiesRouter from './taxonomies.js';
import mediaRouter from './media.js';
import redirectsRouter from './redirects.js';
import contentTypesRouter from './content-types.js';
import blockTypesRouter from './block-types.js';
import usersRouter from './users.js';
import dashboardRouter from './dashboard.js';
import configRouter from './config.js';

const app = new Hono();

// Auth routes (login is public, /me is protected inside the router)
app.route('/auth', authRouter);

// All other admin routes require authentication
app.use('/*', authMiddleware);

app.route('/pages', pagesRouter);
app.route('/blocks', blocksRouter);
app.route('/menus', menusRouter);
app.route('/taxonomies', taxonomiesRouter);
app.route('/media', mediaRouter);
app.route('/redirects', redirectsRouter);
app.route('/content-types', contentTypesRouter);
app.route('/block-types', blockTypesRouter);
app.route('/users', usersRouter);
app.route('/dashboard', dashboardRouter);
app.route('/config', configRouter);

export default app;
