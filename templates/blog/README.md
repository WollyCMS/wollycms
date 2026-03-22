# WollyCMS Blog Template

A personal or company blog with posts, tags, and a clean content structure.

## What's included

- 2 content types, 4 block types, 5 sample pages
- Pre-configured taxonomy (tags: Technology, Tutorial, News, Opinion)
- Main navigation menu (Home, Blog, About)
- 3 sample blog posts with hero banners and rich text content
- Ready to customize

## Quick start

```bash
npx create-wolly my-site --template blog
cd my-site
wolly migrate
wolly import templates/blog/seed.json
wolly start
```

## Content types

| Content Type | Slug | Regions |
|-------------|------|---------|
| Blog Post | `blog_post` | hero, content |
| Page | `page` | hero, content, sidebar |

**Blog Post fields:** excerpt, author, tags, published_date, featured_image

## Block types

| Block Type | Slug | Description |
|-----------|------|-------------|
| Rich Text | `rich_text` | TipTap rich text content |
| Hero | `hero` | Banner with heading, subheading, and background image |
| Image | `image` | Single image with alt text and caption |
| CTA Button | `cta_button` | Call-to-action button with configurable style |
