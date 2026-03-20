---
title: Quick Start
description: Get WollyCMS running in under 5 minutes.
---

## Create a new project

```bash
npx create-wolly my-site
cd my-site
```

This scaffolds a new WollyCMS project with:
- `package.json` with `@wollycms/server` dependency
- `.env` with a generated JWT secret
- `.gitignore`, `.env.example`, `docker-compose.yml`
- `data/` and `uploads/` directories

## Install and run

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

Your CMS is now running:
- **API**: http://localhost:4321
- **Admin UI**: http://localhost:4321/admin

Default login: `admin@wollycms.local` / `admin123`

:::caution
Change the default password immediately in a production environment.
:::

## Create your Astro frontend

In a separate directory, create an Astro project:

```bash
npm create astro@latest my-frontend
cd my-frontend
npm install @wollycms/astro
```

## Connect to WollyCMS

Create `src/lib/wolly.ts`:

```typescript
import { createClient } from '@wollycms/astro';

export const wolly = createClient({
  apiUrl: 'http://localhost:4321/api/content',
});
```

## Create the block mapping

Create `src/lib/blocks.ts`:

```typescript
// Map CMS block type slugs to Astro components
export { default as hero } from '../blocks/Hero.astro';
export { default as rich_text } from '../blocks/RichText.astro';
export { default as image } from '../blocks/ImageBlock.astro';
// Add more as you create block components
```

## Create a catch-all route

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
  <BlockRenderer
    blocks={page.regions.hero ?? []}
    components={blocks}
  />
  <BlockRenderer
    blocks={page.regions.content ?? []}
    components={blocks}
  />
</Layout>
```

## Create your first block component

Create `src/blocks/Hero.astro`:

```astro
---
const { fields } = Astro.props;
---

<section>
  <h1>{fields.heading}</h1>
  {fields.description && <p>{fields.description}</p>}
</section>
```

## Next steps

- [Core Concepts](/concepts/pages/) — Learn about pages, blocks, and regions
- [Astro Integration](/astro/setup/) — Full setup guide for the `@wollycms/astro` package
- [Deployment](/deployment/cloudflare/) — Deploy to Cloudflare Workers, Docker, or Node.js
