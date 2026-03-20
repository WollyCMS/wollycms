---
title: Astro Setup
description: Install and configure the @wollycms/astro package for your Astro site.
---

The `@wollycms/astro` package provides a typed client, components, and helpers for building Astro sites powered by WollyCMS.

## Installation

```bash
npm install @wollycms/astro
```

## Create the client

Create `src/lib/wolly.ts`:

```typescript
import { createClient } from '@wollycms/astro';

export const wolly = createClient({
  apiUrl: import.meta.env.CMS_API_URL || 'http://localhost:4321/api/content',
});
```

Add the environment variable to your `.env`:

```bash
CMS_API_URL=http://localhost:4321/api/content
```

## Cloudflare Workers configuration

When deploying your Astro frontend to Cloudflare Workers, the `import.meta.env` approach works for build-time values. For runtime configuration (where the CMS URL might differ per environment), use middleware to read from `cloudflare:workers` env bindings.

### Set up the Astro adapter

```bash
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

### Create middleware for runtime env

Create `src/middleware.ts`:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@wollycms/astro';

export const onRequest = defineMiddleware(async (context, next) => {
  // On Cloudflare Workers, read the binding
  const runtime = context.locals.runtime;
  const cmsBaseUrl = runtime?.env?.CMS_API_URL
    || import.meta.env.CMS_API_URL
    || 'http://localhost:4321/api/content';

  context.locals.wolly = createClient({ apiUrl: cmsBaseUrl });

  return next();
});
```

Add the type declaration in `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    wolly: import('@wollycms/astro').WollyClient;
    runtime?: {
      env: {
        CMS_API_URL?: string;
      };
    };
  }
}
```

Then use `Astro.locals.wolly` in your pages instead of the static import:

```astro
---
const wolly = Astro.locals.wolly;
const page = await wolly.pages.getBySlug('home');
---
```

### Add the binding to wrangler.toml

```toml
[vars]
CMS_API_URL = "https://cms.example.com/api/content"
```

## Create the block mapping

Create `src/lib/blocks.ts` to map block type slugs to Astro components:

```typescript
export { default as hero } from '../blocks/Hero.astro';
export { default as rich_text } from '../blocks/RichText.astro';
export { default as image } from '../blocks/ImageBlock.astro';
export { default as cta } from '../blocks/CTA.astro';
```

:::caution
The export name **must** match the block type slug exactly. If your block type slug is `feature_grid`, the export must be `feature_grid`.
:::

## Create the catch-all route

Create `src/pages/[...slug].astro`:

```astro
---
import Layout from '../layouts/Default.astro';
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import { wolly } from '../lib/wolly';
import * as blocks from '../lib/blocks';

const slug = Astro.params.slug || 'home';
const page = await wolly.pages.getBySlug(slug);
---

<Layout title={page.title}>
  <BlockRenderer blocks={page.regions.hero ?? []} region="hero" components={blocks} />
  <BlockRenderer blocks={page.regions.content ?? []} region="content" components={blocks} />
</Layout>
```

## Client API reference

The `WollyClient` instance exposes these namespaces:

| Namespace | Methods |
|---|---|
| `pages` | `getBySlug(slug)`, `list(params?)` |
| `menus` | `get(slug, depth?)` |
| `taxonomies` | `getTerms(slug)` |
| `media` | `getInfo(id)`, `getVariant(id, variant)`, `url(id, variant?)` |
| `search` | `query(q, options?)` |
| `redirects` | `list()` |
| `config` | `get()` |
| `schemas` | `get()` |
| `trackingScripts` | `getForPage(slug?)` |

All methods return typed responses matching the interfaces exported from `@wollycms/astro`.
