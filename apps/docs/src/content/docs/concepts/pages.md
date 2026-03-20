---
title: Pages & Content Types
description: How pages and content types define the structure of your site.
---

Pages are the primary content entity in WollyCMS. Every page belongs to a **content type** that defines its schema — which fields it has and which regions are available for blocks.

## Content types

A content type is a blueprint for a category of pages. It defines:

- **Fields schema** — structured data fields attached directly to the page (subtitle, featured image ID, author, etc.)
- **Regions** — named areas where blocks can be placed (hero, content, sidebar, footer)
- **Allowed block types per region** — optionally restrict which block types editors can add to each region

### Creating a content type

Use the admin API to create content types programmatically:

```bash
curl -X POST http://localhost:4321/api/admin/content-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blog Post",
    "slug": "blog_post",
    "description": "A blog article with hero and content regions",
    "fieldsSchema": [
      { "name": "subtitle", "label": "Subtitle", "type": "text" },
      { "name": "featured_image", "label": "Featured Image", "type": "media" },
      { "name": "author", "label": "Author", "type": "text", "required": true }
    ],
    "regions": [
      { "name": "hero", "label": "Hero", "allowed_types": ["hero", "image"] },
      { "name": "content", "label": "Content", "allowed_types": null }
    ]
  }'
```

Setting `allowed_types` to `null` means any block type can be placed in that region.

### Common content type examples

| Content Type | Slug | Typical Regions |
|---|---|---|
| Marketing Page | `marketing_page` | hero, content, cta |
| Blog Post | `blog_post` | hero, content, sidebar |
| Landing Page | `landing_page` | hero, features, testimonials, cta |
| Documentation | `doc_page` | content |

## Pages

A page is an instance of a content type. It has:

- **title** and **slug** (URL path)
- **status** — `draft`, `published`, or `archived`
- **fields** — key/value data matching the content type's field schema
- **regions** — blocks organized by region name
- **SEO metadata** — meta title, description, OG image, canonical URL, robots
- **Taxonomy terms** — categorization via vocabularies

### Creating a page

```bash
curl -X POST http://localhost:4321/api/admin/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with WollyCMS",
    "slug": "blog/getting-started",
    "typeId": 2,
    "status": "draft",
    "fields": {
      "subtitle": "A quick tour of the CMS",
      "author": "Jane Developer"
    }
  }'
```

If you omit `slug`, WollyCMS auto-generates one from the title.

### Page statuses

| Status | Visible on content API | Editable |
|---|---|---|
| `draft` | No | Yes |
| `published` | Yes | Yes |
| `archived` | No | Yes |

:::tip
Pages also support **scheduled publishing**. Set `scheduledAt` to a future ISO timestamp and the page will be excluded from the content API until that time, even if its status is `published`.
:::

## Fetching pages in Astro

```typescript
import { createClient } from '@wollycms/astro';

const wolly = createClient({ apiUrl: 'http://localhost:4321/api/content' });

// Get a single page by slug
const page = await wolly.pages.getBySlug('blog/getting-started');

// List published pages, filtered by content type
const posts = await wolly.pages.list({
  type: 'blog_post',
  sort: 'published_at:desc',
  limit: 10,
});
```

### Page list parameters

| Parameter | Type | Description |
|---|---|---|
| `type` | string | Filter by content type slug |
| `taxonomy` | string | Filter by taxonomy (`category:news` or just `category`) |
| `sort` | string | Sort field and direction (`published_at:desc`, `title:asc`) |
| `limit` | number | Results per page (max 50) |
| `offset` | number | Pagination offset |

## Field types

Content type fields and block type fields use the same schema format:

| Type | Description |
|---|---|
| `text` | Single-line text |
| `textarea` | Multi-line text |
| `richtext` | TipTap rich text editor (JSON output) |
| `number` | Numeric value |
| `boolean` | True/false toggle |
| `select` | Dropdown with predefined options |
| `media` | Media picker (stores media ID) |
| `url` | URL input |
| `color` | Color picker |
| `group` | Nested group of fields |

Each field definition supports `required`, `default`, `min`, `max`, and `options` (for select fields).
