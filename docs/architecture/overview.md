# SpacelyCMS — Architecture Overview

## Design Principles

1. **Astro-native** — Designed to integrate seamlessly with any Astro project,
   regardless of hosting platform (Cloudflare, Vercel, Netlify, VPS, etc.)
2. **Composable content** — Pages are built from reusable, typed blocks arranged
   in named regions. Content is structured data, not markup.
3. **Self-hosted** — Runs anywhere Node.js runs. No SaaS dependency.
4. **Webmaster-friendly** — A non-developer should be able to create and edit
   pages without touching code.
5. **Developer-extensible** — Developers define block types, templates, and
   custom integrations. The CMS provides the content; Astro provides the rendering.
6. **Portable data** — SQLite by default (zero-config), Postgres for scale.
   Standard JSON API. Easy export/import.

---

## System Architecture

### Development

```
┌─────────────────────────────────────────────────────────────┐
│                     SpacelyCMS Server                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  Admin UI (SPA)                       │    │
│  │  • Page editor with region/block composition          │    │
│  │  • Content type & block type schema builder           │    │
│  │  • Media library browser                              │    │
│  │  • Menu tree editor                                   │    │
│  │  • Taxonomy manager                                   │    │
│  │  • URL alias & redirect manager                       │    │
│  │  • User/role management                               │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│                    Admin API (authenticated)                  │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  API Server (Hono)                     │    │
│  │                                                       │    │
│  │  /api/admin/*    — CRUD for all entities (authed)     │    │
│  │  /api/content/*  — Public read API (for Astro)        │    │
│  │  /api/media/*    — Media upload/serve                 │    │
│  │  /api/webhook/*  — Build hooks, integrations          │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Data Layer (Drizzle ORM)                │    │
│  │                                                       │    │
│  │  SQLite (default, zero-config)                        │    │
│  │  — or —                                               │    │
│  │  PostgreSQL (production scale)                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Media Storage                           │    │
│  │                                                       │    │
│  │  Local filesystem (default)                           │    │
│  │  — or —                                               │    │
│  │  S3-compatible (R2, MinIO, AWS S3)                    │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
              │
              │  JSON API (fetch at build time or SSR)
              ▼
┌─────────────────────────────────────────────────────────────┐
│              Any Astro Project                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           @spacelycms/astro (npm package)             │    │
│  │                                                       │    │
│  │  • Client: fetches content, pages, menus, media       │    │
│  │  • BlockRenderer: maps block types → Astro components │    │
│  │  • Route generation: [...slug].astro from CMS pages   │    │
│  │  • Menu helpers: tree traversal, active state          │    │
│  │  • Image helpers: responsive srcset from media API     │    │
│  │  • Redirect config: generates _redirects / middleware  │    │
│  │  • Type generation: TypeScript types from CMS schemas  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  Deployable to: Cloudflare Pages, Vercel, Netlify, VPS,     │
│  Docker, any static host (SSG) or edge runtime (SSR)        │
└─────────────────────────────────────────────────────────────┘
```

### Production (Recommended: Cloudflare Tunnel + R2 + Pages)

```
┌──────────────────────────────────┐
│       Your Infrastructure        │
│                                  │
│  SpacelyCMS Server (:4321)       │
│  SQLite or PostgreSQL            │
│           │                      │
│      cloudflared tunnel          │
│      (outbound only, no open     │
│       ports on your machine)     │
└──────────┬───────────────────────┘
           │  encrypted tunnel
           ▼
┌───────────────────────────────────────────────────────────┐
│                      Cloudflare                            │
│                                                            │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  Tunnel       │  │  R2 Bucket      │  │  Pages       │  │
│  │              │  │                 │  │              │  │
│  │ cms.yoursite │  │ media.yoursite  │  │ yoursite.com │  │
│  │ .com         │  │ .com            │  │              │  │
│  │              │  │ (S3-compatible, │  │ Astro static │  │
│  │ Admin UI +   │  │  global CDN,    │  │ site at edge │  │
│  │ API          │  │  zero egress)   │  │              │  │
│  └──────────────┘  └─────────────────┘  └──────────────┘  │
│                                                ▲           │
│                     webhook on publish ─────────┘           │
└───────────────────────────────────────────────────────────┘
```

Key benefits:
- **No open ports** — `cloudflared` creates an outbound-only tunnel
- **No egress fees** — R2 has zero egress costs for media
- **Edge delivery** — Media and Astro site served from 300+ Cloudflare PoPs
- **Auto-rebuild** — CMS webhook triggers Cloudflare Pages deploy on publish

See [Deployment Guide](../guides/deployment.md#recommended-production-architecture)
for step-by-step setup.

---

## Technology Choices

### CMS Server

| Component | Choice | Rationale |
|---|---|---|
| **Runtime** | Node.js | Universal, runs everywhere |
| **Framework** | Hono | Lightweight, fast, works on Node/Bun/Deno/Workers |
| **ORM** | Drizzle | Type-safe, supports SQLite + Postgres, lightweight |
| **Database** | SQLite (default) | Zero-config, single file, perfect for dev/small sites |
| **Database** | PostgreSQL (optional) | For production scale, concurrent users |
| **Auth** | Better Auth or custom JWT | Session-based for admin, JWT for API |
| **Rich Text** | TipTap (server: JSON storage) | Stores as JSON, renders in Astro. No HTML in DB. |
| **Media Processing** | Sharp | Image resize, format conversion, metadata |
| **Admin UI** | SvelteKit SPA or React | Embedded SPA served by the API server |

### Why Hono?

- Runs on Node.js for self-hosting
- Can also run on Cloudflare Workers, Deno, Bun — future deployment flexibility
- Tiny footprint (~14KB), fast routing
- First-class TypeScript support
- Middleware pattern familiar to Express users

### Why Drizzle?

- Type-safe SQL queries with zero runtime overhead
- Supports both SQLite and PostgreSQL with same API
- Schema defined in TypeScript — single source of truth
- Migration system built-in
- Lightweight compared to Prisma

### Why SQLite by Default?

- Zero configuration — `npm install && npm start` just works
- Perfect for development and small-to-medium sites
- Single file backup — copy the .db file
- Handles thousands of pages without issue
- Switch to Postgres when you need concurrent write-heavy workloads

---

## Key Architectural Decisions

### 1. Content is Structured Data, Not HTML

Block content is stored as JSON objects with typed fields. Rich text fields store
TipTap JSON, not raw HTML. This keeps content portable and renderable by any
frontend.

```json
{
  "type": "contact_list",
  "fields": {
    "title": "Important Contacts",
    "contacts": [
      {
        "name": "Wendy Ezell",
        "role": "CITE Coordinator & Associate Professor",
        "phone": "434-949-1076",
        "email": "wendy.ezell@southside.edu"
      }
    ]
  }
}
```

### 2. Schemas are Code + Database

Block type schemas are defined in the database (so the admin UI can create them)
but can also be seeded from code (so developers can version-control them).

### 3. Pages Own Layout, Blocks Own Content

A page defines which blocks go in which regions and in what order. A block
defines its content. Reusable blocks are referenced (not copied) — one block
instance, many page references.

### 4. The Astro Integration is a Separate Package

`@spacelycms/astro` is an npm package that any Astro project can install. It
fetches from the CMS API and provides helpers. The CMS server knows nothing
about Astro internals — it just serves JSON.

### 5. Media is Abstracted

The media storage layer is pluggable: local filesystem for development,
S3-compatible object storage for production. The recommended production
backend is **Cloudflare R2** — it is S3-compatible, globally distributed via
Cloudflare's CDN, and has zero egress fees. AWS S3 and MinIO are also
supported. The API serves optimized variants (resized, WebP) regardless of
backend.

---

## Request Flow

### Static Site Generation (SSG)

```
Build time:
  Astro build → @spacelycms/astro fetches all pages, menus, blocks, media URLs
  → Generates static HTML → Deploy to CDN

Content update:
  Editor saves in CMS → CMS fires webhook → Astro rebuilds → CDN updated
```

### Server-Side Rendering (SSR)

```
Request time:
  User visits page → Astro server fetches page data from CMS API
  → Renders HTML → Returns to user

  (With caching: CMS API responses cached at edge, invalidated on publish)
```

### Hybrid (Recommended for large sites)

```
Common pages: Pre-rendered at build time (SSG)
Dynamic pages: Rendered on request (SSR) with edge caching
Admin preview: SSR with draft content, no caching
```
