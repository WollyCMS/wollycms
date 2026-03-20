---
title: Admin API
description: Authenticated API for managing pages, blocks, menus, media, content types, and users.
---

The admin API provides full CRUD operations for all CMS entities. All endpoints (except login) require authentication.

**Base URL**: `http://localhost:4321/api/admin`

## Authentication

### JWT login — `POST /auth/login`

```json
{ "email": "admin@wollycms.local", "password": "admin123" }
```

Returns `{ "data": { "token": "eyJ...", "user": { "id": 1, "email": "...", "name": "Admin", "role": "admin" } } }`.

Use the token: `Authorization: Bearer <token>`

### API keys

For programmatic access, create API keys at `POST /api-keys`:

```json
{ "name": "CI/CD Pipeline", "permissions": "content:write" }
```

The key (`sk_...`) is returned once. Use via `X-API-Key` header or `Authorization: Bearer sk_...`.

| Permission | Role | Access |
|---|---|---|
| `content:read` | viewer | Read-only |
| `content:write` | editor | Read + write content |
| `*` or `admin:*` | admin | Full access |

### Current user — `GET /auth/me`

## Roles

| Role | Can do |
|---|---|
| **viewer** | Read all admin data |
| **editor** | CRUD pages, blocks, menus, media, taxonomies |
| **admin** | Everything + manage schemas, users, API keys |

## Pages

| Endpoint | Description |
|---|---|
| `GET /pages` | List all pages (any status). Filters: `?type=`, `?status=`, `?search=`, `?sort=`, `?limit=`, `?offset=` |
| `GET /pages/:id` | Get page by ID with resolved blocks |
| `POST /pages` | Create page. Body: `{ title, slug?, typeId, status, fields, metaTitle?, metaDescription?, scheduledAt? }` |
| `POST /pages/upsert` | Create or update by slug. Returns `{ data, created: bool }` |
| `PUT /pages/:id` | Partial update. Auto-creates revision. Supports `revisionNote` |
| `DELETE /pages/:id` | Delete page |
| `POST /pages/bulk` | Bulk action. Body: `{ ids: [1,2], action: "publish" }`. Actions: `publish`, `unpublish`, `archive`, `delete` |

## Blocks

| Endpoint | Description |
|---|---|
| `GET /blocks` | List reusable blocks. Filters: `?type=`, `?search=`, `?reusable=false` |
| `GET /blocks/:id` | Get block with usage info |
| `POST /blocks` | Create. Body: `{ typeId, title, fields, isReusable? }` |
| `PUT /blocks/:id` | Update block |
| `DELETE /blocks/:id` | Delete (fails with `409` if still in use) |

## Menus

| Endpoint | Description |
|---|---|
| `GET /menus` | List all menus |
| `GET /menus/:id` | Get menu with item tree |
| `POST /menus` | Create. Body: `{ name, slug }` |
| `PUT /menus/:id` | Update menu |
| `DELETE /menus/:id` | Delete (cascades items) |
| `POST /menus/:id/items` | Add item. Body: `{ title, url?, pageId?, parentId?, target?, position?, depth? }` |
| `PUT /menus/:id/items/:itemId` | Update item |
| `DELETE /menus/:id/items/:itemId` | Delete item |
| `PUT /menus/:id/items-order` | Reorder. Body: `{ items: [{ id, parentId, position, depth }] }` |

## Media

| Endpoint | Description |
|---|---|
| `GET /media` | List media. Filters: `?type=`, `?search=`, `?folder=`, `?sort=`, `?order=` |
| `GET /media/folders` | List distinct folders |
| `GET /media/:id` | Get single media with URLs |
| `POST /media` | Upload. Multipart: `file` (required), `title`, `altText`, `folder`. Max 50 MB |
| `PUT /media/:id` | Update metadata: `{ altText?, title?, folder?, metadata? }` |
| `DELETE /media/:id` | Delete file and all variants from storage |

## Content Types (admin role)

| Endpoint | Description |
|---|---|
| `GET /content-types` | List all |
| `GET /content-types/:id` | Get one |
| `POST /content-types` | Create. Body: `{ name, slug, fieldsSchema, regions, description? }` |
| `PUT /content-types/:id` | Update |
| `DELETE /content-types/:id` | Delete |

## Block Types (admin role)

| Endpoint | Description |
|---|---|
| `GET /block-types` | List all |
| `GET /block-types/:id` | Get one |
| `POST /block-types` | Create. Body: `{ name, slug, fieldsSchema, icon?, description? }` |
| `PUT /block-types/:id` | Update |
| `DELETE /block-types/:id` | Delete |

## Taxonomies

| Endpoint | Description |
|---|---|
| `GET /taxonomies` | List all |
| `GET /taxonomies/:id` | Get with terms tree |
| `POST /taxonomies` | Create. Body: `{ name, slug, hierarchical?, description? }` |
| `PUT /taxonomies/:id` | Update |
| `DELETE /taxonomies/:id` | Delete (cascades terms) |
| `POST /taxonomies/:id/terms` | Add term: `{ name, slug, parentId?, weight?, fields? }` |
| `PUT /taxonomies/:id/terms/:termId` | Update term |
| `DELETE /taxonomies/:id/terms/:termId` | Delete term |

## Users (admin role)

| Endpoint | Description |
|---|---|
| `GET /users` | List all (no password hashes) |
| `POST /users` | Create. Body: `{ email, name, password, role? }`. Min 8 char password |
| `PUT /users/:id` | Update (password optional) |
| `DELETE /users/:id` | Delete (cannot delete yourself or last admin) |

Roles: `admin`, `editor`, `viewer`.

## Error format

```json
{ "errors": [{ "code": "VALIDATION", "message": "Title is required", "path": ["title"] }] }
```

Codes: `VALIDATION`, `NOT_FOUND`, `CONFLICT`, `UNAUTHORIZED`, `FORBIDDEN`, `IN_USE`, `INTERNAL_ERROR`.

## Webhooks

Events fired on content changes: `page.created`, `page.updated`, `page.published`, `page.unpublished`, `page.deleted`, `media.uploaded`, `media.deleted`. Configure webhook URLs at `GET/POST /webhooks`.
