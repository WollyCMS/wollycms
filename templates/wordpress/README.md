# WollyCMS WordPress Template

A familiar starting point for WordPress users migrating to WollyCMS, with posts, pages, categories, and tags.

## What's included

- 2 content types, 5 block types, 8 sample pages
- Pre-configured taxonomies (Categories: Uncategorized, News, Tutorials; Tags: wordpress, migration, cms)
- Main navigation (Home, Blog, About, Contact) and Footer navigation (Privacy Policy, About)
- 3 sample posts including a migration guide
- Classic WordPress-style post/page structure
- Ready to customize

## Quick start

```bash
npx create-wolly my-site --template wordpress
cd my-site
wolly migrate
wolly import templates/wordpress/seed.json
wolly start
```

## Content types

| Content Type | Slug | Regions |
|-------------|------|---------|
| Post | `post` | content, sidebar |
| Page | `page` | hero, content, sidebar |

**Post fields:** excerpt, author, categories, featured_image, published_date

## Block types

| Block Type | Slug | Description |
|-----------|------|-------------|
| Rich Text | `rich_text` | TipTap rich text content |
| Hero | `hero` | Banner with heading, subheading, and background image |
| Image | `image` | Single image with alt text and caption |
| CTA Button | `cta_button` | Call-to-action button with configurable style |
| Embed | `embed` | Embed external content via URL or HTML |

## WordPress concepts mapped to WollyCMS

| WordPress | WollyCMS |
|-----------|----------|
| Posts | Content type `post` |
| Pages | Content type `page` |
| Categories | Taxonomy `categories` (hierarchical) |
| Tags | Taxonomy `tags` (flat) |
| Featured Image | Field `featured_image` on post |
| Gutenberg Blocks | Content blocks (rich_text, hero, image, etc.) |
| Menus | Menus with menu items |
