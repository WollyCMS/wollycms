---
title: SEO
description: Meta tags, Open Graph images, structured data, and sitemaps for WollyCMS-powered sites.
---

WollyCMS stores SEO metadata per page — meta title, meta description, OG image, canonical URL, and robots directives. The `@wollycms/astro` package provides helpers to turn this data into proper HTML meta tags and JSON-LD structured data.

## Page SEO fields

Every page in WollyCMS has these SEO fields (set in the admin UI or via API):

| Field | Purpose |
|---|---|
| `meta_title` | Custom `<title>` tag (falls back to page title) |
| `meta_description` | Meta description for search results |
| `og_image` | Open Graph image URL |
| `canonical_url` | Canonical URL for duplicate content |
| `robots` | Robots directive (`noindex`, `nofollow`, etc.) |

## Using getPageSeo

```typescript
import { seoHelpers } from '@wollycms/astro';

const page = await wolly.pages.getBySlug('about');
const config = await wolly.config.get();
const seo = seoHelpers.getPageSeo(page, config);
```

Returns a `SeoMeta` object:

```typescript
interface SeoMeta {
  title: string;         // meta_title || "Page Title | Site Name"
  description?: string;  // meta_description
  ogImage?: string;      // og_image URL
  canonicalUrl?: string;  // canonical_url
  robots?: string;       // robots directive
}
```

### Rendering in your layout

```astro
---
// src/layouts/Default.astro
import { seoHelpers } from '@wollycms/astro';

const { page } = Astro.props;
const config = await wolly.config.get();
const seo = seoHelpers.getPageSeo(page, config);
const siteUrl = import.meta.env.SITE_URL || 'https://example.com';
---

<html>
  <head>
    <title>{seo.title}</title>
    {seo.description && <meta name="description" content={seo.description} />}
    {seo.robots && <meta name="robots" content={seo.robots} />}
    {seo.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}

    <!-- Open Graph -->
    <meta property="og:title" content={seo.title} />
    {seo.description && <meta property="og:description" content={seo.description} />}
    {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}
    <meta property="og:url" content={`${siteUrl}/${page.slug}`} />
    <meta property="og:type" content="website" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

## Structured data (JSON-LD)

The `seoHelpers` module provides functions to generate JSON-LD structured data.

### Article schema

For blog posts and articles:

```astro
---
import { seoHelpers } from '@wollycms/astro';

const jsonLd = seoHelpers.articleJsonLd(page, {
  siteUrl: 'https://example.com',
  siteName: 'My Site',
  authorName: 'Jane Developer',
});
---

<Fragment set:html={seoHelpers.jsonLdScript(jsonLd)} />
```

### WebPage schema

For general pages:

```astro
---
const jsonLd = seoHelpers.webPageJsonLd(page, {
  siteUrl: 'https://example.com',
  siteName: 'My Site',
});
---

<Fragment set:html={seoHelpers.jsonLdScript(jsonLd)} />
```

### Breadcrumb schema

Combine with menu helpers for breadcrumb structured data:

```astro
---
import { seoHelpers, menuHelpers } from '@wollycms/astro';

const menu = await wolly.menus.get('main-nav');
const trail = menuHelpers.getBreadcrumbs(menu.items, Astro.url.pathname);
const breadcrumbData = trail.map((item) => ({
  title: item.title,
  url: menuHelpers.getItemHref(item) || '/',
}));

const jsonLd = seoHelpers.breadcrumbJsonLd(breadcrumbData, 'https://example.com');
---

<Fragment set:html={seoHelpers.jsonLdScript(jsonLd)} />
```

### Organization schema

For site-wide organization data:

```astro
---
const config = await wolly.config.get();
const jsonLd = seoHelpers.organizationJsonLd(config, {
  siteUrl: 'https://example.com',
  logoUrl: 'https://example.com/logo.png',
});
---

<Fragment set:html={seoHelpers.jsonLdScript(jsonLd)} />
```

## Sitemap

WollyCMS generates a sitemap automatically at `/api/content/sitemap` (also available at `/sitemap.xml` via redirect). It includes all published pages with their `lastmod` dates.

Pages with `robots: "noindex"` are excluded from the sitemap.

The sitemap uses the `SITE_URL` environment variable for absolute URLs:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2025-01-15</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2025-01-10</lastmod>
  </url>
</urlset>
```

:::tip
Point search engine webmaster tools at `https://your-cms.example.com/sitemap.xml` for automatic discovery of all published pages.
:::

## OG image generation

WollyCMS auto-generates Open Graph images when a page is first published (if no custom OG image is set). The generated image uses the page's meta title and description.

Auto-generated OG images are served at `/api/content/og/:slug.png`.

:::note[Cloudflare Workers limitation]
PNG generation requires Sharp, which is not available on Cloudflare Workers. On Workers deployments, the OG endpoint returns an SVG fallback instead of a PNG. To get PNG OG images on Workers, generate them offline using the CLI (`wolly og:generate`) on a Node.js machine and upload to R2, or set custom OG image URLs in the admin UI.
:::

## Canonical URLs

If a page does not have an explicit `canonical_url` set, you can construct one in your layout:

```astro
---
const canonicalUrl = seo.canonicalUrl || `${siteUrl}/${page.slug}`;
---

<link rel="canonical" href={canonicalUrl} />
```
