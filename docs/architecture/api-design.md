# WollyCMS — API Design

## Overview

WollyCMS exposes two API surfaces:

1. **Content API** (`/api/content/*`) — Public, read-only. Used by Astro at build
   time or SSR runtime to fetch pages, blocks, menus, media, and taxonomies.
2. **Admin API** (`/api/admin/*`) — Authenticated, full CRUD. Used by the admin
   UI to manage all content.

Both are JSON REST APIs served by the Hono framework.

---

## Content API (Public, Read-Only)

These endpoints power the Astro frontend. They require no authentication and
return published content only.

### Pages

```
GET /api/content/pages
  ?type=secondary_page          — filter by content type
  ?status=published             — (always published for content API)
  ?taxonomy=department:nursing   — filter by taxonomy term
  ?sort=published_at:desc       — sort order
  ?limit=20&offset=0            — pagination
  ?fields=title,slug,fields.hero_image  — sparse fields

GET /api/content/pages/:slug
  — Returns full page with resolved blocks per region

GET /api/content/pages/:slug/blocks
  — Returns only the block composition for a page
```

#### Page Response (full)

```json
{
  "id": 42,
  "type": "secondary_page",
  "title": "Technology Resources",
  "slug": "technology-resources",
  "status": "published",
  "fields": {},
  "regions": {
    "hero": [
      {
        "id": "pb_0",
        "block_type": "hero",
        "fields": {
          "heading": "Technology Resources",
          "subtitle": "Campus Technology Center",
          "style": "interior",
          "image": 101
        }
      }
    ],
    "content": [
      {
        "id": "pb_1",
        "block_type": "rich_text",
        "fields": {
          "body": { "type": "doc", "content": [...] }
        }
      },
      {
        "id": "pb_2",
        "block_type": "accordion",
        "fields": {
          "heading": "Explore",
          "items": [...]
        }
      }
    ],
    "sidebar": [
      {
        "id": "pb_3",
        "block_type": "location",
        "is_shared": true,
        "block_id": 5,
        "fields": {
          "name": "Main Campus",
          "address": "123 College Ave",
          "city": "Springfield",
          "state": "VA",
          "zip": "22150"
        }
      },
      {
        "id": "pb_4",
        "block_type": "contact_list",
        "is_shared": true,
        "block_id": 8,
        "fields": {
          "heading": "Important Contacts",
          "contacts": [...]
        }
      }
    ],
    "bottom": [
      {
        "id": "pb_5",
        "block_type": "cta_button",
        "fields": {
          "text": "Ready to Start",
          "url": "/apply",
          "style": "primary"
        }
      }
    ]
  },
  "meta": {
    "created_at": "2024-06-15T10:30:00Z",
    "updated_at": "2025-11-20T14:22:00Z",
    "published_at": "2024-06-15T12:00:00Z"
  }
}
```

### Menus

```
GET /api/content/menus
  — List all menus (slug, name, item count)

GET /api/content/menus/:slug
  — Returns full menu tree

GET /api/content/menus/:slug?depth=2
  — Returns menu tree limited to N levels
```

#### Menu Response

```json
{
  "id": 1,
  "name": "Main Menu",
  "slug": "main",
  "items": [
    {
      "id": 10,
      "title": "Admissions",
      "url": null,
      "page_slug": null,
      "target": "_self",
      "children": [
        {
          "id": 11,
          "title": "Apply Now",
          "url": null,
          "page_slug": "/apply",
          "target": "_self",
          "children": []
        },
        {
          "id": 12,
          "title": "Tuition & Fees",
          "url": null,
          "page_slug": "/tuition-fees",
          "target": "_self",
          "children": [...]
        }
      ]
    },
    {
      "id": 20,
      "title": "Academics",
      "url": null,
      "page_slug": null,
      "children": [...]
    }
  ]
}
```

### Taxonomies

```
GET /api/content/taxonomies
  — List all vocabularies

GET /api/content/taxonomies/:slug
  — Returns vocabulary with all terms (tree if hierarchical)

GET /api/content/taxonomies/:slug/terms
  — Just the terms (flat or tree)
```

### Media

```
GET /api/media/:id/original
GET /api/media/:id/thumbnail    (150x150, cropped)
GET /api/media/:id/medium       (600px wide)
GET /api/media/:id/large        (1200px wide)
GET /api/media/:id/info         (metadata JSON)

GET /api/content/media
  ?type=image                   — filter by type
  ?search=campus                — search filename/alt/title
  ?limit=50&offset=0
```

### Redirects

```
GET /api/content/redirects
  — Returns all active redirects (for Astro to generate _redirects file)
```

### Site Config

```
GET /api/content/config
  — Returns site-wide settings (site name, logo, footer text, etc.)

GET /api/content/schemas
  — Returns all content type and block type schemas
  — Used by @wollycms/astro to generate TypeScript types
```

### Preview (Authenticated)

```
GET /api/content/preview/pages/:slug
  ?locale=fr                          — Select a same-slug translation (optional)
  &token=JWT                          — JWT auth via query param
  Authorization: Bearer JWT           — or via header

  — Returns page data including locale regardless of publish status (drafts included)
  — Omitting locale retains slug-only matching; preview frontends should forward it
  — Used by the Astro SSR preview route for live preview in admin editor
```

---

## Admin API (Authenticated)

Full CRUD for all entities. Requires valid session/JWT.

### Authentication

```
POST /api/admin/auth/login      { email, password }
POST /api/admin/auth/logout
GET  /api/admin/auth/me         — Current user info
POST /api/admin/auth/refresh    — Refresh token
```

### Content Types

```
GET    /api/admin/content-types
GET    /api/admin/content-types/:id
POST   /api/admin/content-types          { name, slug, fields_schema, regions }
PUT    /api/admin/content-types/:id
DELETE /api/admin/content-types/:id
```

### Block Types

```
GET    /api/admin/block-types
GET    /api/admin/block-types/:id
POST   /api/admin/block-types
PUT    /api/admin/block-types/:id
DELETE /api/admin/block-types/:id
```

### Pages

```
GET    /api/admin/pages                  (includes drafts)
GET    /api/admin/pages/:id
POST   /api/admin/pages
PUT    /api/admin/pages/:id
DELETE /api/admin/pages/:id
POST   /api/admin/pages/:id/publish
POST   /api/admin/pages/:id/unpublish
POST   /api/admin/pages/:id/duplicate
```

### Blocks

```
GET    /api/admin/blocks                 (all blocks)
GET    /api/admin/blocks?reusable=true   (library blocks only)
GET    /api/admin/blocks/:id
POST   /api/admin/blocks
PUT    /api/admin/blocks/:id
DELETE /api/admin/blocks/:id
GET    /api/admin/blocks/:id/usage       (which pages reference this block)
```

### Page Block Composition

```
GET    /api/admin/pages/:id/regions
PUT    /api/admin/pages/:id/regions      — Replace entire composition
PATCH  /api/admin/pages/:id/regions      — Partial update (add/remove/reorder)
```

### Menus

```
GET    /api/admin/menus
GET    /api/admin/menus/:id
POST   /api/admin/menus
PUT    /api/admin/menus/:id
DELETE /api/admin/menus/:id
PUT    /api/admin/menus/:id/items        — Replace entire tree
PATCH  /api/admin/menus/:id/items        — Add/move/remove items
```

### Taxonomies & Terms

```
GET    /api/admin/taxonomies
POST   /api/admin/taxonomies
PUT    /api/admin/taxonomies/:id
DELETE /api/admin/taxonomies/:id

GET    /api/admin/taxonomies/:id/terms
POST   /api/admin/taxonomies/:id/terms
PUT    /api/admin/terms/:id
DELETE /api/admin/terms/:id
```

### Media

```
GET    /api/admin/media
POST   /api/admin/media                  — Upload file (multipart)
PUT    /api/admin/media/:id              — Update metadata
DELETE /api/admin/media/:id
GET    /api/admin/media/:id/usage        — Which content references this
```

### Redirects

```
GET    /api/admin/redirects
POST   /api/admin/redirects
PUT    /api/admin/redirects/:id
DELETE /api/admin/redirects/:id
POST   /api/admin/redirects/import       — Bulk import from CSV
```

### Users

```
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
```

### Webhooks

```
POST /api/webhook/publish
  — Triggered after content publish. Fires configured hooks
     (e.g., Astro rebuild trigger, CDN cache purge)
```

---

## API Design Principles

1. **Consistent response format**: All endpoints return
   `{ data, meta?, errors? }`
2. **Pagination**: List endpoints support `limit` and `offset` (or cursor-based
   for large sets)
3. **Sparse fields**: `?fields=title,slug` to reduce payload size
4. **Includes**: `?include=blocks,terms` to embed related data
5. **Filtering**: Type-specific query params for common filters
6. **Sorting**: `?sort=field:asc` or `?sort=field:desc`
7. **Error format**: `{ errors: [{ code, message, field? }] }`
8. **ETags**: Content API supports conditional requests for caching
