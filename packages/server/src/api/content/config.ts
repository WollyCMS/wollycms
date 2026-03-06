import { Hono } from 'hono';

const app = new Hono();

/**
 * GET / - Return site configuration.
 * Hardcoded for now; will be backed by a settings table later.
 */
app.get('/', (c) => {
  return c.json({
    data: {
      siteName: 'Southside College',
      tagline: 'Your Future Starts Here',
      logo: null,
      footer: {
        text: 'Southside College. All rights reserved.',
      },
      social: {
        facebook: null,
        twitter: null,
        instagram: null,
      },
    },
  });
});

export default app;
