# WollyCMS Drupal Template

A familiar starting point for Drupal administrators migrating to WollyCMS, with content types, taxonomy vocabularies, and regions that map to Drupal concepts.

## What's included

- 4 content types, 8 block types, 10 sample pages
- Pre-configured taxonomies (Tags: drupal, migration, cms, web-development; Content Category: News, Events, Resources)
- Main navigation menu (Home, About, News, Events, Contact)
- 3 sample articles, 2 sample events, contact page with contact list and location
- Content listing blocks for news and events (similar to Drupal Views)
- Ready to customize

## Quick start

```bash
npx create-wolly my-site --template drupal
cd my-site
wolly migrate
wolly import templates/drupal/seed.json
wolly start
```

## Content types

| Content Type | Slug | Regions |
|-------------|------|---------|
| Article | `article` | hero, content, sidebar |
| Basic Page | `basic_page` | hero, content, sidebar, bottom |
| Landing Page | `landing_page` | hero, content, features, bottom |
| Event | `event` | hero, content, sidebar |

**Article fields:** body_summary, author, tags, published_date
**Event fields:** event_date, event_time, location, registration_url

## Block types

| Block Type | Slug | Description |
|-----------|------|-------------|
| Rich Text | `rich_text` | TipTap rich text content |
| Hero | `hero` | Banner with heading, subheading, and background image |
| Image | `image` | Single image with alt text and caption |
| CTA Button | `cta_button` | Call-to-action button with configurable style |
| Accordion | `accordion` | Expandable FAQ or collapsible content sections |
| Contact List | `contact_list` | List of contacts with name, title, email, phone |
| Location | `location` | Address, coordinates, and optional map embed |
| Content Listing | `content_listing` | Dynamic content listing filtered by type and taxonomy |

## Drupal concepts mapped to WollyCMS

| Drupal | WollyCMS |
|--------|----------|
| Content Types | Content types with fieldsSchema |
| Block Regions (theme) | Regions (per content type) |
| Taxonomy Vocabularies | Taxonomies (flat or hierarchical) |
| Views | Content listing blocks |
| Custom Blocks | Reusable blocks (isReusable: true) |
| Paragraphs / Layout Builder | Composable block regions |
| Menus | Menus with nested menu items |
