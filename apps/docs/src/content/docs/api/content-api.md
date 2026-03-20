---
title: Content API
description: Public read-only API for fetching pages, menus, search results, and sitemaps.
---

The content API serves published content to your frontend. All endpoints are public (no authentication) and return JSON with `Cache-Control` and `ETag` headers.

**Base URL**: `http://localhost:4321/api/content`

## Pages

### List pages — `GET /pages`

Returns published pages with filtering, sorting, and pagination.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | string | - | Filter by content type slug |
| `taxonomy` | string | - | Filter by taxonomy (`category:news` or `category`) |
| `sort` | string | `published_at:desc` | Sort field and direction |
| `limit` | number | `20` | Results per page (max 50) |
| `offset` | number | `0` | Pagination offset |

Sort fields: `published_at`, `created_at`, `updated_at`, `title`, `slug`

```bash
curl "http://localhost:4321/api/content/pages?type=blog_post&limit=5"
```

Response: `{ "data": [...], "meta": { "total": 12, "limit": 5, "offset": 0 } }`

Each page in `data` includes: `id`, `type`, `title`, `slug`, `status`, `fields`, `terms`, `meta` (created_at, updated_at, published_at).

### Get page — `GET /pages/:slug`

Returns a single published page with resolved blocks organized by region, SEO metadata, and taxonomy terms.

```bash
curl "http://localhost:4321/api/content/pages/about"
```

Response shape:

```json
{
  "data": {
    "id": 1, "type": "marketing_page", "title": "About Us", "slug": "about",
    "status": "published", "fields": {}, "terms": [],
    "seo": { "meta_title": "...", "meta_description": "...", "og_image": null, "canonical_url": null, "robots": null },
    "regions": {
      "hero": [{ "id": "pb_1", "block_type": "hero", "fields": { "heading": "About Us" } }],
      "content": [{ "id": "pb_2", "block_type": "rich_text", "fields": { "body": {} } }]
    },
    "meta": { "created_at": "...", "updated_at": "...", "published_at": "..." }
  }
}
```

Returns `404` with `{ "errors": [{ "code": "NOT_FOUND", "message": "Page not found" }] }` if not found.

## Menus — `GET /menus/:slug`

Returns a menu with its full nested item tree. Pass `?depth=N` to limit nesting.

```bash
curl "http://localhost:4321/api/content/menus/main-nav"
```

Each item has: `id`, `title`, `url`, `page_slug`, `target`, `attributes`, `children`.

## Search — `GET /search?q=<query>`

Searches published pages by title and slug. Min 2 characters.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | **required** | Search query |
| `type` | string | - | Filter by content type |
| `limit` | number | `20` | Max results (max 50) |

Returns `{ "data": [...], "meta": { "total": N, "query": "..." } }` where each result has `id`, `type`, `title`, `slug`, `description`, `meta`.

## Taxonomies — `GET /taxonomies/:slug/terms`

Returns all terms for a taxonomy. Hierarchical taxonomies return a nested tree with `children`; flat taxonomies return a list.

## Media — `GET /media/:id/:variant`

Serves a media file. For local storage, returns the binary. For S3/R2, redirects to the public URL.

Variants: `original`, `thumbnail`, `medium`, `large`, `info`

The `info` variant returns JSON metadata (dimensions, alt text, variant URLs) instead of the file.

## Batch — `POST /batch`

Fetch multiple pages and menus in one request. Body: `{ "pages": ["home", "about"], "menus": ["main-nav"] }`. Max 50 pages and 10 menus per batch.

## Sitemap — `GET /sitemap`

XML sitemap of all published pages (also at `/sitemap.xml`). Pages with `robots: "noindex"` are excluded. Uses `SITE_URL` env var for absolute URLs.

## Other endpoints

| Endpoint | Description |
|---|---|
| `GET /config` | Site configuration (name, tagline, social links) |
| `GET /schemas` | All content type and block type schemas |
| `GET /redirects` | Active URL redirects |
| `GET /og/:slug.png` | Auto-generated Open Graph image |
| `GET /tracking-scripts` | Active tracking scripts (optionally filtered by `?page=slug`) |

## Caching

All responses include `Cache-Control` (with `max-age`, `s-maxage`, `stale-while-revalidate`) and `ETag` headers. Send `If-None-Match` to get `304 Not Modified` when content has not changed.
