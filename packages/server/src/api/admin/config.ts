import { Hono } from 'hono';
import { z } from 'zod';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { requireRole } from '../../auth/rbac.js';

const app = new Hono();

// Config updates require admin role
app.put('/*', requireRole('admin'));

const CONFIG_PATH = join(process.cwd(), 'data', 'config.json');

const defaultConfig = {
  siteName: 'Southside Virginia Community College',
  tagline: 'Your Future Starts Here',
  logo: null as string | null,
  adminBrandName: 'WollyCMS' as string | null,
  footer: { text: 'Southside Virginia Community College. All rights reserved.' },
  social: {
    facebook: 'https://www.facebook.com/SouthsideVirginiaCommunityCollege/' as string | null,
    twitter: null as string | null,
    instagram: 'https://www.instagram.com/southsidevacc/' as string | null,
  },
};

async function loadConfig(): Promise<typeof defaultConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return { ...defaultConfig };
  }
}

async function saveConfig(config: typeof defaultConfig): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
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
