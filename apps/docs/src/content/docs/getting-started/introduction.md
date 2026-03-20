---
title: Introduction
description: What WollyCMS is and why it exists.
---

WollyCMS is a self-hosted, open source headless CMS built specifically for [Astro](https://astro.build). It brings the content composition model of enterprise CMS platforms like Drupal to the modern Astro ecosystem.

## What it does

- **Block composition** — Pages are built from typed content blocks arranged in named regions (hero, content, sidebar, etc.)
- **Visual page builder** — Drag-and-drop blocks between regions with live preview
- **Hierarchical menus** — Unlimited independent menus with deep nesting
- **Custom content types** — Define page types with custom fields, regions, and block restrictions
- **Media library** — Upload, organize, and auto-optimize images (WebP generation)
- **REST API** — Structured JSON with batch fetching, search, ETag caching

## How it works

WollyCMS runs as a standalone server (Hono + Drizzle ORM) with a SvelteKit admin UI. Your Astro frontend fetches content from the API using the `@wollycms/astro` integration package.

```
┌─────────────────┐    REST API    ┌─────────────────┐
│  WollyCMS Server │◄──────────────│  Astro Frontend  │
│  (admin + API)   │               │  (@wollycms/astro)│
│                  │               │                   │
│  • SvelteKit UI  │               │  • BlockRenderer  │
│  • Hono API      │               │  • Menu helpers   │
│  • SQLite/PG     │               │  • WollyImage     │
│  • S3/R2 media   │               │  • SEO utilities  │
└─────────────────┘               └─────────────────┘
```

The developer defines the content model (page types, block types, regions) and maps each block type to an Astro component. Content editors then manage pages through the admin UI — no code, no pull requests, no deploys.

## Tech stack

| Component | Technology |
|-----------|-----------|
| API server | Hono 4.x |
| Database | Drizzle ORM (SQLite or PostgreSQL) |
| Admin UI | SvelteKit |
| Rich text | TipTap |
| Image processing | Sharp |
| Astro integration | `@wollycms/astro` |

## Who it's for

WollyCMS is designed for **developers who build Astro sites for clients**. The developer defines the structure, the client manages the content. It's also a great fit for personal projects where you want CMS-managed content without depending on a SaaS platform.
