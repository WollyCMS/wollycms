---
title: Migration Overview
description: How to migrate your existing CMS content to WollyCMS.
---

WollyCMS was built to replace traditional CMS platforms like Drupal and WordPress with a modern, headless architecture. If you're running one of these platforms today, you can migrate your content to WollyCMS without losing pages, media, menus, or SEO metadata.

## What migration involves

Every CMS migration follows the same basic pattern:

1. **Inventory** your existing site — content types, fields, media, menus, taxonomies
2. **Map** your content model to WollyCMS — content types become WollyCMS content types, paragraphs/blocks become WollyCMS blocks, etc.
3. **Set up** a WollyCMS instance — locally or on Cloudflare Workers
4. **Write migration scripts** that read from your old CMS and write to the WollyCMS Admin API
5. **Migrate** content in phases — pages first, then media, then menus
6. **Verify** everything transferred correctly
7. **Build** your Astro frontend and go live

## Migration approach

WollyCMS migrations use **Node.js scripts** that call the [Admin API](/api/admin-api). This gives you full control over the migration process — you can run it incrementally, fix issues between runs, and verify results at each step.

The general script pattern:

```javascript
// 1. Read from source (MySQL dump, REST API, export file)
const posts = await getSourceContent();

// 2. Transform to WollyCMS format
for (const post of posts) {
  const page = {
    title: post.title,
    slug: post.slug,
    contentTypeId: TARGET_CONTENT_TYPE_ID,
    fields: mapFields(post),
  };

  // 3. Create via Admin API
  await fetch(`${CMS_URL}/api/admin/pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(page),
  });
}
```

## Platform-specific guides

- [**Migrate from Drupal**](/migration/from-drupal) — Content types, Paragraphs, Views, taxonomy, media fields
- [**Migrate from WordPress**](/migration/from-wordpress) — Posts, pages, custom post types, Gutenberg blocks, ACF fields

## Real-world example

Read the [Community College Case Study](/migration/case-study-community-college) to see how a mid-size institutional site migrated 1,300+ pages, 500+ media files, and 244 menu items from Drupal 10 to WollyCMS — cutting hosting costs from ~$20k/year to $5/month.

## Key concepts

### Rich text: HTML to TipTap JSON

WollyCMS stores rich text as [TipTap](https://tiptap.dev/) JSON, not raw HTML. Your migration scripts need to convert HTML content to TipTap's document format. A typical converter handles:

- Headings, paragraphs, lists, links, bold/italic
- Inline images (with URL rewriting to point to WollyCMS media)
- Tables, blockquotes, horizontal rules

Several open-source libraries handle this conversion. The Drupal and WordPress guides include examples.

### Media migration

Media migration happens in two passes:

1. **Structured media** — Images referenced by content type fields (hero images, thumbnails, profile photos). Download from the old site, upload to WollyCMS, update the page field with the new media ID.
2. **Inline media** — Images and documents embedded in rich text content. After uploading, rewrite URLs inside the TipTap JSON to point to the new WollyCMS media paths.

### URL redirects

Map old CMS paths to new WollyCMS slugs. WollyCMS pages use clean slugs (`/about/financial-aid`), and your Astro frontend can handle redirects from old paths (e.g., Drupal's `/node/123` or WordPress's `/?p=456`).

### Pagination

The WollyCMS content API returns a maximum of 50 items per request. Migration scripts that verify content should paginate through all results.
