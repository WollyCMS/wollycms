# WollyCMS — Astro Integration (`@wollycms/astro`)

## Overview

The Astro integration is a separate npm package that any Astro project can
install. It provides:

1. **Client** — Fetches content from the WollyCMS API
2. **BlockRenderer** — Maps block types to Astro components
3. **Route generation** — Dynamic routes from CMS page slugs
4. **Menu helpers** — Tree traversal, active state detection
5. **Image helpers** — Responsive `<img>` / `<picture>` from CMS media
6. **Rich text renderer** — Converts TipTap JSON to HTML/Astro components
7. **Type generation** — TypeScript types from CMS schemas
8. **Redirect config** — Generates platform-specific redirect rules

---

## Installation & Setup

```bash
npm install @wollycms/astro
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import wolly from '@wollycms/astro';

export default defineConfig({
  integrations: [
    wolly({
      apiUrl: 'http://localhost:4321/api/content',
      // Optional: for preview/draft mode
      adminApiUrl: 'http://localhost:4321/api/admin',
      previewSecret: 'your-preview-secret',
    })
  ]
});
```

---

## Client Usage

```astro
---
// In any .astro file
import { wolly } from '@wollycms/astro';

// Fetch a single page by slug
const page = await wolly.pages.getBySlug('cite-resource-wizard');

// Fetch pages by type
const articles = await wolly.pages.list({
  type: 'article',
  sort: 'published_at:desc',
  limit: 10
});

// Fetch a menu
const mainMenu = await wolly.menus.get('main');

// Fetch taxonomy terms
const departments = await wolly.taxonomies.getTerms('department');

// Fetch site config
const config = await wolly.config.get();
---
```

---

## BlockRenderer Component

The core component that renders a list of blocks using registered Astro
components:

```astro
---
// src/components/BlockRenderer.astro
import { BlockRenderer } from '@wollycms/astro';
---

<!-- Render all blocks in a region -->
<BlockRenderer blocks={page.regions.content} />
```

### Block Component Registration

By convention, components in `src/blocks/` are auto-discovered:

```
src/blocks/
  RichText.astro          → "rich_text"
  Accordion.astro         → "accordion"
  ContactList.astro       → "contact_list"
  Location.astro          → "location"
  CtaButton.astro         → "cta_button"
  ContentListing.astro    → "content_listing"
  CardGrid.astro          → "card_grid"
```

Slug mapping: PascalCase filename → snake_case block type slug.

Or configure explicitly:

```js
// wolly.config.ts
export default {
  blocks: {
    'rich_text': './src/blocks/RichText.astro',
    'accordion': './src/components/custom/MyAccordion.astro',
  }
}
```

### Block Component Props

Every block component receives these props:

```ts
interface BlockProps {
  /** The resolved block fields (with overrides merged) */
  fields: Record<string, any>;
  /** Block metadata */
  block: {
    id: string;
    type: string;
    title: string;
    is_shared: boolean;
  };
  /** The region this block is in */
  region: string;
  /** Position index within the region */
  position: number;
}
```

### Example Block Component

```astro
---
// src/blocks/Location.astro
import type { BlockProps } from '@wollycms/astro';

interface Props extends BlockProps {
  fields: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    map_url?: string;
  };
}

const { fields } = Astro.props;
---

<div class="location-block">
  <h3>{fields.name}</h3>
  <address>
    {fields.address}<br />
    {fields.city}, {fields.state} {fields.zip}
  </address>
  {fields.phone && <p>Phone: <a href={`tel:${fields.phone}`}>{fields.phone}</a></p>}
  {fields.map_url && <a href={fields.map_url}>Get Directions</a>}
</div>
```

---

## Dynamic Route Generation

### Catch-All Route

```astro
---
// src/pages/[...slug].astro
import { wolly } from '@wollycms/astro';
import BlockRenderer from '../components/BlockRenderer.astro';
import Layout from '../layouts/Default.astro';

export async function getStaticPaths() {
  const pages = await wolly.pages.list({ status: 'published' });
  return pages.map(page => ({
    params: { slug: page.slug || undefined },
    props: { page }
  }));
}

const { page } = Astro.props;
const mainMenu = await wolly.menus.get('main');
---

<Layout title={page.title} menu={mainMenu}>
  <div class="page-content">
    <div class="main-content">
      <h1>{page.title}</h1>
      <BlockRenderer blocks={page.regions.content} />
    </div>

    {page.regions.sidebar?.length > 0 && (
      <aside class="sidebar">
        <BlockRenderer blocks={page.regions.sidebar} />
      </aside>
    )}
  </div>

  {page.regions.bottom?.length > 0 && (
    <section class="bottom-content">
      <BlockRenderer blocks={page.regions.bottom} />
    </section>
  )}
</Layout>
```

### Content Type-Specific Routes

For content types that need different layouts:

```astro
---
// src/pages/event/[slug].astro
import { wolly } from '@wollycms/astro';
import EventLayout from '../../layouts/Event.astro';

export async function getStaticPaths() {
  const events = await wolly.pages.list({ type: 'event' });
  return events.map(e => ({
    params: { slug: e.slug },
    props: { event: e }
  }));
}

const { event } = Astro.props;
---

<EventLayout event={event}>
  <h1>{event.title}</h1>
  <time datetime={event.fields.start_date}>
    {new Date(event.fields.start_date).toLocaleDateString()}
  </time>
  <BlockRenderer blocks={event.regions.content} />
</EventLayout>
```

---

## Menu Helpers

```astro
---
import { wolly, menuHelpers } from '@wollycms/astro';

const menu = await wolly.menus.get('main');
const currentPath = Astro.url.pathname;

// Get breadcrumb trail for current page
const breadcrumbs = menuHelpers.getBreadcrumbs(menu, currentPath);

// Get children of a specific menu item
const academicsChildren = menuHelpers.getChildren(menu, 'academics');

// Check if a path is active (or its children are active)
const isActive = menuHelpers.isActive(menu, '/admissions', currentPath);
---

<nav>
  {menu.items.map(item => (
    <div class={menuHelpers.isActive(menu, item.url || item.page_slug, currentPath) ? 'active' : ''}>
      {item.url || item.page_slug
        ? <a href={item.url || item.page_slug}>{item.title}</a>
        : <span>{item.title}</span>
      }
      {item.children?.length > 0 && (
        <ul>
          {item.children.map(child => (
            <li><a href={child.url || child.page_slug}>{child.title}</a></li>
          ))}
        </ul>
      )}
    </div>
  ))}
</nav>
```

---

## Image Helpers

```astro
---
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';

const mediaId = page.fields.hero_image_id;
const media = await wolly.media.getInfo(mediaId);
---

<!-- Responsive image with srcset -->
<SpacelyImage
  src={wolly.media.url(mediaId, 'large')}
  srcset={`${wolly.media.url(mediaId, 'medium')} 800w, ${wolly.media.url(mediaId, 'large')} 1200w`}
  sizes="(max-width: 768px) 100vw, 1200px"
  alt={media.altText ?? ''}
  width={media.width ?? undefined}
  height={media.height ?? undefined}
  loading="lazy"
  class="hero-image"
/>

<!-- Renders as: -->
<img
  src="/api/media/101/large"
  srcset="/api/media/101/medium 600w, /api/media/101/large 1200w"
  alt="Campus computer lab"
  width="1200"
  height="400"
  loading="lazy"
  class="hero-image"
/>
```

---

## Rich Text Renderer

Converts TipTap JSON to HTML, with support for custom node types:

```astro
---
import RichText from '@wollycms/astro/components/RichText.astro';
---

<RichText content={block.fields.body} class="prose" />
```

Headings can include an editor-managed fragment ID. The renderer emits a
programmatically focusable target, so links such as `#student-stories` can move
users directly to that heading without adding the heading to the normal Tab
sequence.

The component uses `--wolly-anchor-offset` for anchored-heading scroll margin.
Sites with sticky headers should set it to at least the header height:

```css
:root {
  --wolly-anchor-offset: 7rem;
}
```

WollyCMS intentionally uses native fragment navigation and does not force
smooth scrolling. If a site enables smooth scrolling, it should disable that
motion when `prefers-reduced-motion: reduce` is active.

---

## Type Generation

The integration can generate TypeScript types from CMS schemas:

```bash
npx wolly types generate
```

Produces:

```ts
// src/wolly.d.ts (auto-generated)

export interface SecondaryPage {
  id: string;
  type: 'secondary_page';
  title: string;
  slug: string;
  status: 'draft' | 'published';
  fields: Record<string, unknown>;
  regions: {
    hero: WollyBlock[];
    content: WollyBlock[];
    sidebar: WollyBlock[];
    bottom: WollyBlock[];
  };
}

export interface AccordionBlock {
  type: 'accordion';
  fields: {
    heading?: string;
    items: Array<{
      title: string;
      body: TipTapDocument;
    }>;
    default_open: boolean;
  };
}

// ... types for all content types and block types
```

---

## Redirect Generation

```js
// astro.config.mjs — for static hosts
import { wolly } from '@wollycms/astro';

const redirects = await wolly.redirects.list();

export default defineConfig({
  redirects: Object.fromEntries(
    redirects.map(r => [r.from_path, { destination: r.to_path, status: r.status_code }])
  )
});
```

---

## Preview Mode (Draft Content)

For editors to preview unpublished changes. The preview route is SSR (not
prerendered) and fetches from the authenticated preview API endpoint:

```astro
---
// src/pages/preview/[...slug].astro
export const prerender = false;

const { slug } = Astro.params;
const token = Astro.url.searchParams.get('token');

if (!token || !slug) {
  return new Response('Missing token or slug', { status: 400 });
}

const API_BASE = 'http://localhost:4321/api/content';
const pageRes = await fetch(`${API_BASE}/preview/pages/${slug}?token=${token}`);
if (!pageRes.ok) {
  return new Response(`Page not found: ${slug}`, { status: 404 });
}
const page = (await pageRes.json()).data;

const regions = page.regions ?? {};
const heroBlocks = regions.hero ?? [];
const contentBlocks = regions.content ?? [];
---

<div class="preview-banner">Preview Mode — {page.status}</div>
<Layout>
  <BlockRenderer blocks={heroBlocks} region="hero" components={blockComponents} />
  <BlockRenderer blocks={contentBlocks} region="content" components={blockComponents} />
</Layout>
```

The admin UI embeds this as an iframe with the JWT token passed as a query
parameter. PostMessage is used to trigger a reload when the editor saves.

---

## Deployment Compatibility

The integration works with all Astro output modes:

| Mode | How It Works |
|---|---|
| `static` (default) | All pages pre-rendered at build time. CMS webhook triggers rebuild. Per-page SSR opt-in via `export const prerender = false`. |
| `server` | Pages fetched from CMS API on each request. Edge caching recommended. |

Note: Astro 5 removed `output: 'hybrid'`. The default `static` output now
supports per-page SSR opt-in, which is used for the preview route.

`@wollycms/astro` 0.3 supports Astro 5, 6, and 7. The integration package is
validated against Astro 7 while retaining peer compatibility with Astro 5 and 6.

Compatible with all Astro adapters:
- `@astrojs/cloudflare`
- `@astrojs/vercel`
- `@astrojs/netlify`
- `@astrojs/node`
- Any custom adapter
