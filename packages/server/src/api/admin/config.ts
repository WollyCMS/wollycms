import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireRole } from '../../auth/rbac.js';
import { getDb } from '../../db/index.js';
import { siteConfig } from '../../db/schema/index.js';

const app = new Hono();

// Config reads require at least viewer role; updates require admin
app.get('/*', requireRole('viewer'));
app.put('/*', requireRole('admin'));

const defaultConfig = {
  siteName: 'My Site',
  tagline: 'Welcome to your site',
  logo: null as string | null,
  adminBrandName: 'WollyCMS' as string | null,
  footer: { text: 'Built with WollyCMS' },
  social: {
    facebook: null as string | null,
    twitter: null as string | null,
    instagram: null as string | null,
  },
  defaultLocale: 'en',
  supportedLocales: ['en'] as string[],
};

export async function loadConfig(): Promise<typeof defaultConfig> {
  const db = getDb();
  const row = await db.select().from(siteConfig).where(eq(siteConfig.id, 1)).get?.()
    ?? (await db.select().from(siteConfig).where(eq(siteConfig.id, 1)))[0];
  if (!row) return { ...defaultConfig };
  try {
    return { ...defaultConfig, ...JSON.parse(row.value) };
  } catch {
    return { ...defaultConfig };
  }
}

async function saveConfig(config: typeof defaultConfig): Promise<void> {
  const db = getDb();
  const json = JSON.stringify(config);
  // Upsert: insert or update the single config row
  const existing = await db.select().from(siteConfig).where(eq(siteConfig.id, 1)).get?.()
    ?? (await db.select().from(siteConfig).where(eq(siteConfig.id, 1)))[0];
  if (existing) {
    await db.update(siteConfig).set({ value: json }).where(eq(siteConfig.id, 1));
  } else {
    await db.insert(siteConfig).values({ id: 1, value: json });
  }
}

/** GET / - Get site config (includes runtime server settings) */
app.get('/', async (c) => {
  const { env: serverEnv } = await import('../../env.js');
  const config = await loadConfig();
  return c.json({
    data: {
      ...config,
      siteUrl: serverEnv.SITE_URL,
    },
  });
});

/** PUT / - Update site config */
app.put('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({
    siteName: z.string().min(1).optional(),
    tagline: z.string().optional(),
    logo: z.string().nullable().optional(),
    adminBrandName: z.string().nullable().optional(),
    footer: z.object({ text: z.string() }).optional(),
    social: z.object({
      facebook: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      instagram: z.string().nullable().optional(),
    }).optional(),
    defaultLocale: z.string().min(2).max(10).optional(),
    supportedLocales: z.array(z.string().min(2).max(10)).min(1).optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ errors: parsed.error.issues.map((i) => ({ code: 'VALIDATION', message: i.message })) }, 400);

  const current = await loadConfig();
  const updated = {
    ...current,
    ...parsed.data,
    footer: parsed.data.footer ? { ...current.footer, ...parsed.data.footer } : current.footer,
    social: parsed.data.social ? { ...current.social, ...parsed.data.social } : current.social,
  };
  await saveConfig(updated);

  return c.json({ data: updated });
});

export default app;
