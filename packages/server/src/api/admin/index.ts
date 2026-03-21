import { Hono } from 'hono';
import { authMiddleware } from '../../auth/middleware.js';
import { rateLimiter } from '../../auth/rate-limit.js';
import authRouter from './auth.js';
import pagesRouter from './pages.js';
import revisionsRouter from './revisions.js';
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
import exportImportRouter from './export-import.js';
import presenceRouter from './presence.js';
import webhooksRouter from './webhooks.js';
import apiKeysRouter from './api-keys.js';
import auditRouter from './audit.js';
import searchRouter from './search.js';
import trackingScriptsRouter from './tracking-scripts.js';
import ogImagesRouter from './og-images.js';
import setupRouter from './setup.js';
import twoFactorRouter from './two-factor.js';

const app = new Hono();

// Setup routes (public, only functional when no users exist)
app.use('/setup/*', rateLimiter());
app.use('/setup', rateLimiter());
app.route('/setup', setupRouter);

// Auth routes with rate limiting (login and 2FA verification are public)
app.use('/auth/login', rateLimiter());
app.use('/auth/verify-2fa', rateLimiter());
app.route('/auth', authRouter);

// 2FA management routes (authenticated, mounted under /auth/2fa)
app.route('/auth/2fa', twoFactorRouter);

// All other admin routes require authentication
app.use('/*', authMiddleware);

// Rate limit sensitive write operations
const writeLimiter = rateLimiter({ max: 60, windowMs: 60_000 });
app.use('/media/*', writeLimiter);
app.use('/export', rateLimiter({ max: 10, windowMs: 60_000 }));
app.use('/import', rateLimiter({ max: 10, windowMs: 60_000 }));

app.route('/pages', pagesRouter);
app.route('/pages', revisionsRouter);
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
app.route('/', exportImportRouter);
app.route('/presence', presenceRouter);
app.route('/webhooks', webhooksRouter);
app.route('/api-keys', apiKeysRouter);
app.route('/audit-logs', auditRouter);
app.route('/search', searchRouter);
app.route('/tracking-scripts', trackingScriptsRouter);
app.route('/', ogImagesRouter);

export default app;
