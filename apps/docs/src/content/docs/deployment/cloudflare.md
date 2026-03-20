---
title: Cloudflare Workers
description: Deploy WollyCMS to Cloudflare Workers with D1 database and R2 media storage.
---

WollyCMS runs on Cloudflare Workers with D1 (SQLite) for the database and R2 for media storage. This gives you a globally distributed CMS with no server to manage.

## Prerequisites

- A Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed (`npm install -g wrangler`)
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
compatibility_date = "2024-12-01"
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

# R2 object storage for media
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "wollycms-media"

# Environment variables (non-secret)
[vars]
NODE_ENV = "production"
DATABASE_URL = "d1:DB"
MEDIA_STORAGE = "r2"
CORS_ORIGINS = "https://your-site.example.com"
SITE_URL = "https://your-site.example.com"
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
# Build the Worker bundle and admin assets
npm run build:worker

# Run database migrations on D1
wrangler d1 execute wollycms-db --file=packages/server/drizzle/0000_init.sql

# Deploy to Cloudflare
wrangler deploy
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
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `SITE_URL` | Yes | Your frontend site URL (for sitemaps, OG images) |
| `NODE_ENV` | No | `production` recommended |

## Limitations on Workers

- **No Sharp image processing**: Workers does not support Sharp's native binaries. Uploaded images are stored as originals without automatic variant generation. Use an external image transformation service or pre-process images before upload.
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
main = "dist/_worker.js"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "dist"

[vars]
CMS_API_URL = "https://cms.example.com/api/content"
```

```bash
npm run build
wrangler deploy
```
