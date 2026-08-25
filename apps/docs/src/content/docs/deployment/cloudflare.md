---
title: Cloudflare Workers
description: Deploy WollyCMS to Cloudflare Workers with D1 database and R2 media storage.
---

WollyCMS runs on Cloudflare Workers with D1 (SQLite) for the database and R2 for media storage. This gives you a globally distributed CMS with no server to manage.

## Prerequisites

- A Cloudflare account
- Node.js 22 LTS
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) available in the project (`npx wrangler --version`)
- The WollyCMS repository cloned locally

## Create cloud resources

```bash
# Create the D1 database
wrangler d1 create wollycms-db

# Create the R2 bucket
wrangler r2 create wollycms-media
```

Note the database ID from the D1 create command — you will need it for `wrangler.toml`.

## Configure wrangler.toml

Copy the example and fill in your values:

```bash
cp wrangler.toml.example wrangler.toml
```

```toml
name = "wollycms"
main = "packages/server/dist-worker/worker.js"
compatibility_date = "2026-07-31"
compatibility_flags = ["nodejs_compat"]

# Serve the admin UI as static assets
[assets]
directory = "packages/admin/build-assets"
not_found_handling = "single-page-application"
run_worker_first = ["/", "/sitemap.xml", "/api/*", "/media/*"]

# D1 SQLite database
[[d1_databases]]
binding = "DB"
database_name = "wollycms-db"
database_id = "<your-d1-database-id>"
migrations_dir = "packages/server/drizzle"

# R2 object storage for media
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "wollycms-media"

# Environment variables (non-secret)
[vars]
NODE_ENV = "production"
DATABASE_URL = "d1:DB"
MEDIA_STORAGE = "r2"
# Optional: change this value to force browsers to request fresh media URLs.
MEDIA_CACHE_VERSION = ""
CORS_ORIGINS = "https://your-site.example.com"
SITE_URL = "https://your-site.example.com"

[triggers]
crons = ["* * * * *"]
```

## Set secrets

```bash
# Generate and set a strong JWT secret
wrangler secret put JWT_SECRET
```

:::caution
The JWT secret must be a strong random string. Generate one with `openssl rand -base64 32`. Never reuse the development default.
:::

## Build and deploy

```bash
# Build the admin UI
npm run build:admin
mkdir -p packages/admin/build-assets/admin
cp -r packages/admin/build/* packages/admin/build-assets/admin/
cp packages/admin/build/index.html packages/admin/build-assets/index.html

# Build the Worker bundle
npm run build:worker

# Apply every pending D1 migration
npx wrangler d1 migrations apply wollycms-db --remote

# Deploy to Cloudflare
npx wrangler deploy
```

## Custom domain

In the Cloudflare dashboard:

1. Go to **Workers & Pages** > your worker
2. Click **Settings** > **Triggers**
3. Add a custom domain (e.g., `cms.example.com`)

Make sure the domain's DNS is managed by Cloudflare.

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (set as secret) |
| `DATABASE_URL` | Yes | `d1:DB` for D1 binding |
| `MEDIA_STORAGE` | Yes | `r2` for R2 storage |
| `MEDIA_CACHE_VERSION` | No | Recovery key appended to media URLs; change it to bypass stale browser caches |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `SITE_URL` | Yes | Your frontend site URL (for sitemaps, OG images) |
| `NODE_ENV` | No | `production` recommended |

## Limitations on Workers

- **No server-side Sharp processing**: Workers does not support Sharp's native binaries. The admin UI generates normal image variants in the browser before upload. API uploads that omit variants retain the original; pre-process those images or use an external transformation service.
- **D1 size limits**: D1 databases have row and database size limits. Check [Cloudflare's D1 limits](https://developers.cloudflare.com/d1/platform/limits/) for current numbers.
- **R2 egress**: R2 has free egress, making it cost-effective for media serving.

## Deploying the Astro frontend

Your Astro frontend is a separate deployment. For Cloudflare Workers:

```bash
# In your Astro frontend project
npm install @astrojs/cloudflare
```

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

```toml
# wrangler.toml for the Astro frontend
name = "my-site"
compatibility_date = "2026-07-31"
compatibility_flags = ["nodejs_compat"]

[vars]
CMS_API_URL = "https://cms.example.com/api/content"
```

```bash
npm run build
npx wrangler deploy dist/server/entry.mjs --assets dist/client
```
