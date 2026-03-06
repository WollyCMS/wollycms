import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import contentRouter from './api/content/index.js';
import adminRouter from './api/admin/index.js';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.route('/api/content', contentRouter);
app.route('/api/admin', adminRouter);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
