# WollyCMS Marketing Template

A product or business marketing site with feature grids, stats, pricing FAQ, and conversion-focused layouts.

## What's included

- 3 content types, 8 block types, 5 sample pages
- Pre-configured main navigation menu
- Home page with hero, feature grid, stats bar, and CTA
- Features page with detailed feature grid and comparison content
- Pricing page with accordion FAQ
- Ready to customize

## Quick start

```bash
npx create-wolly my-site --template marketing
cd my-site
wolly migrate
wolly import templates/marketing/seed.json
wolly start
```

## Content types

| Content Type | Slug | Regions |
|-------------|------|---------|
| Home Page | `home_page` | hero, content, features, bottom |
| Landing Page | `landing_page` | hero, content, features, bottom |
| Page | `page` | hero, content, sidebar |

## Block types

| Block Type | Slug | Description |
|-----------|------|-------------|
| Rich Text | `rich_text` | TipTap rich text content |
| Hero | `hero` | Banner with heading, subheading, and background image |
| CTA Button | `cta_button` | Call-to-action button with configurable style |
| Feature Grid | `feature_grid` | Grid of features with title, description, and icon |
| Stat Bar | `stat_bar` | Row of statistics with values and labels |
| Image | `image` | Single image with alt text and caption |
| Accordion | `accordion` | Expandable FAQ or collapsible content sections |
| Embed | `embed` | Embed external content via URL or HTML |
