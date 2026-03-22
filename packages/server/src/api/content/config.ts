import { Hono } from 'hono';
import { loadConfig } from '../admin/config.js';

const app = new Hono();

/** GET / - Return public site configuration (includes locale settings). */
app.get('/', async (c) => {
  const config = await loadConfig();
  return c.json({
    data: {
      siteName: config.siteName,
      tagline: config.tagline,
      logo: config.logo,
      footer: config.footer,
      social: config.social,
      defaultLocale: config.defaultLocale,
      supportedLocales: config.supportedLocales,
    },
  });
});

export default app;
