# WollyCMS

A self-hosted, open-source headless CMS designed for [Astro.js](https://astro.build) with composable block-based page building, reusable content blocks, and hierarchical menu management.

[![CI](https://github.com/wollycms/wollycms/actions/workflows/build-push.yml/badge.svg)](https://github.com/wollycms/wollycms/actions/workflows/build-push.yml)
[![npm](https://img.shields.io/npm/v/@wollycms/server?label=%40wollycms%2Fserver)](https://www.npmjs.com/package/@wollycms/server)
[![npm](https://img.shields.io/npm/v/@wollycms/astro?label=%40wollycms%2Fastro)](https://www.npmjs.com/package/@wollycms/astro)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green.svg)](https://nodejs.org/)

## About

WollyCMS fills the gap between simple headless CMS tools that lack page composition and expensive SaaS platforms that lock you in. It brings Drupal's powerful content composition model — paragraphs, reusable blocks, multi-region layouts — into a modern, lightweight, Astro-native package.

**AI-assisted development** — This project was heavily developed with AI coding agents, including [Claude Code](https://claude.com/claude-code) and [Codex](https://openai.com/index/openai-codex/).

**Origin story** — WollyCMS started as a simple blog engine but evolved into a full-featured CMS for migrating Drupal and WordPress sites to Astro.js, with composable block-based content modeling that maps naturally to Drupal's content architecture (paragraphs, block references, multi-region layouts).

> **Maintenance notice**: This is a personal side project. I am not a full-time maintainer. Bug reports and feature requests are welcome, but expect slow response times. PRs are appreciated — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Features

### Content Modeling
- **Block Composition** — Build pages from typed, reusable content blocks arranged in named regions (hero, content, sidebar, bottom)
- **Reusable Block Library** — Create blocks once, reference them across pages. Edit once, update everywhere
- **Content Types** — Define custom content types with configurable fields and default blocks
- **Taxonomies** — Hierarchical taxonomy system with term management and content tagging
- **Hierarchical Menus** — Multiple menus with deep nesting, container items, and drag-drop editing
- **Content Tree** — Navigate your page hierarchy in a tree view

### Editing Experience
- **Visual Page Builder** — Drag-and-drop blocks between regions, inline editing, live preview with device toggle
- **Rich Text Editor** — TipTap WYSIWYG with slash commands, table editing, source view, accessible heading anchors, image sizing/wrapping/captions, and paste cleanup
- **Media Library** — Upload, organize, and process images with Sharp (WebP variants, local or S3/R2 storage)
- **Accessibility Audits** — Built-in WCAG AA content checks with issue highlighting in the editor
- **SEO Editor Tools** — Meta preview, OG image preview, scoring, and auto-generated OG images (Satori + Sharp)
- **Global Search** — Ctrl+K to search across pages, blocks, media, and menus
- **Keyboard Shortcuts** — Comprehensive shortcuts for common editing tasks
- **Multi-User Presence** — See who else is editing in real time

### Content Workflows
- **Revision History** — Full revision history with diffs and one-click rollback
- **Scheduled Publishing** — Set a publish date and content goes live automatically
- **Configurable Workflows** — Define custom publish states (draft, review, published, archived)
- **Content Export/Import** — Bulk export and import content as JSON

### Authentication & Security
- **OAuth Login** — Sign in with Google, GitHub, or Microsoft
- **Two-Factor Authentication** — TOTP-based 2FA with recovery codes and trusted devices
- **Role-Based Access Control** — Viewer, editor, and admin roles with granular permissions
- **API Keys** — Long-lived tokens for build pipelines with permission scoping
- **Audit Logging** — Track all content mutations with user, action, and IP
- **Webhooks** — HMAC-SHA256 signed webhooks for build triggers on content changes
- **Rate Limiting** — Configurable rate limits on auth endpoints

### API
- **REST Content API** — Public read API for pages, menus, taxonomies, media, redirects, search, and sitemap
- **GraphQL API** — Query content with GraphQL for flexible data fetching
- **Batch Endpoint** — Fetch multiple pages and menus in a single request
- **Full-Text Search** — SQLite FTS5-powered search across published content
- **Cross-Origin Preview** — Scoped preview tokens for live previewing unpublished content on your Astro site
- **OG Image Generation** — Auto-generated Open Graph images via Satori

### Integrations
- **Astro-Native** — First-class `@wollycms/astro` integration with BlockRenderer, RichText, SpacelyImage, route generation, menu helpers, SEO helpers, and image optimization
- **AI Helpers** — Multi-provider AI content assistance (OpenAI, Anthropic, Vertex AI)
- **Tracking Scripts** — Manage analytics and tracking scripts from the admin UI
- **Redirects** — URL redirect management with pattern matching

### Deployment
- **Self-Hosted** — Runs anywhere Node.js runs. SQLite for dev, PostgreSQL for production
- **Cloudflare Workers** — First-class D1 database + R2 storage support
- **Docker** — Multi-stage production image published to [GHCR](https://ghcr.io/wollycms/wollycms), with Caddy reverse proxy
- **Starter Templates** — 5 templates to get started fast: blog, marketing, WordPress migration, Drupal migration, and college site

## Quick Start

> **Requires Node.js 22 LTS.** WollyCMS uses `better-sqlite3` which needs native compilation. Node 22 LTS is tested and recommended. If you hit build errors on newer Node versions, use PostgreSQL instead (`DATABASE_URL=postgresql://...`).

Create a new project with a single command:

```bash
npx create-wolly@latest my-site
cd my-site
npm run migrate
npm run seed
npm run dev
```

That's it — the API server starts at `http://localhost:4321` with the admin UI built in.
Default login: `admin@wollycms.local` / `admin123`.

Choose a starter template:

```bash
npx create-wolly@latest my-site --template=blog       # Blog
npx create-wolly@latest my-site --template=marketing   # Marketing site
npx create-wolly@latest my-site --template=wordpress   # WordPress migration
npx create-wolly@latest my-site --template=drupal      # Drupal migration
npx create-wolly@latest my-site --template=college     # College/university site
```

### Docker

```bash
docker run -d -p 4321:4321 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -v wolly-data:/app/data \
  ghcr.io/wollycms/wollycms:latest
```

Or with Docker Compose:

```bash
npx create-wolly@latest my-site && cd my-site
# Edit .env — set JWT_SECRET to a secure random value
docker compose up -d
```

### Astro Integration

In your Astro project, install the integration package:

```bash
npm install @wollycms/astro
```

Then add it to your `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import wollycms from '@wollycms/astro';

export default defineConfig({
  integrations: [wollycms({ endpoint: 'http://localhost:4321' })],
});
```

See the [Astro integration docs](https://docs.wollycms.com/astro/setup/) for BlockRenderer, route generation, menu helpers, and image optimization.

`@wollycms/astro` 0.3 supports Astro 5, 6, and 7. Node.js 22 LTS is the
tested runtime for WollyCMS development and self-hosted deployments.

## Content API

| Endpoint | Description |
|---|---|
| `GET /api/content/pages` | List pages (filter by type, taxonomy, pagination) |
| `GET /api/content/pages/:slug` | Full page with resolved blocks per region |
| `GET /api/content/menus/:slug` | Menu tree (supports `?depth=N`) |
| `GET /api/content/taxonomies/:slug/terms` | Taxonomy terms |
| `GET /api/content/media/:id/:variant` | Media file serving |
| `GET /api/content/redirects` | Active redirects |
| `GET /api/content/config` | Site configuration |
| `GET /api/content/schemas` | Content type and block type schemas |
| `POST /api/content/batch` | Fetch multiple pages + menus in one request |
| `GET /api/content/search?q=` | Full-text search of published pages |
| `POST /api/content/graphql` | GraphQL queries for flexible data fetching |
| `GET /api/content/preview/:slug` | Token-authenticated preview of unpublished content |
| `GET /api/content/og/:slug` | Auto-generated OG image for a page |
| `GET /api/content/tracking-scripts` | Active tracking/analytics scripts |
| `GET /api/content/sitemap` | XML sitemap of published pages |
| `GET /sitemap.xml` | Redirect to sitemap endpoint |
| `GET /api/admin/search?q=` | Global search (pages, blocks, media, menus) |
| `GET /api/health` | Health check (uptime, version) |

## Tech Stack

| Component | Technology |
|---|---|
| API Server | Hono 4.x (TypeScript, ESM) |
| Database | SQLite (dev) / PostgreSQL (prod) / D1 (Cloudflare) via Drizzle ORM |
| Admin UI | SvelteKit 5 (SPA mode) |
| Rich Text | TipTap (JSON storage) |
| Media Processing | Sharp (WebP generation, OG images via Satori) |
| Media Storage | Local filesystem, S3, or Cloudflare R2 |
| Authentication | JWT + TOTP 2FA + OAuth (Google, GitHub, Microsoft) |
| Testing | Vitest |
| Runtime | Node.js 22 LTS / Cloudflare Workers |

## Project Structure

```
wollycms/
├── packages/
│   ├── server/        # Hono API server + Drizzle schema + media processing
│   ├── admin/         # SvelteKit admin SPA
│   ├── astro/         # @wollycms/astro integration package
│   └── create-wolly/  # CLI scaffolding tool (npx create-wolly@latest)
├── apps/
│   └── docs/          # Documentation site (Astro Starlight) → docs.wollycms.com
├── templates/         # Starter templates (blog, marketing, wordpress, drupal, college)
├── examples/
│   └── college-site/  # Reference Astro site
├── docs/              # Architecture documentation
├── deploy/            # Production deployment configs
└── scripts/           # Build/deploy scripts
```

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:./data/wolly.db` | Database connection string (SQLite or PostgreSQL) |
| `PORT` | `4321` | Server port |
| `JWT_SECRET` | — | **Required in production.** Secret for JWT signing |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated). **Set in production** |
| `MEDIA_STORAGE` | `local` | Storage backend: `local` or `s3` |
| `MEDIA_DIR` | `./uploads` | Local media storage path |
| `S3_ENDPOINT` | — | S3/R2 endpoint for remote media storage |
| `S3_BUCKET` | — | S3/R2 bucket name |
| `SITE_URL` | `http://localhost:4322` | Frontend URL for webhooks/preview |
| `RATE_LIMIT_AUTH` | `10` | Max login attempts per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min default) |

## Packages

| Package | npm | Description |
|---|---|---|
| [`@wollycms/server`](packages/server) | [![npm](https://img.shields.io/npm/v/@wollycms/server)](https://www.npmjs.com/package/@wollycms/server) | Hono API server, Drizzle schema, media processing |
| [`@wollycms/astro`](packages/astro) | [![npm](https://img.shields.io/npm/v/@wollycms/astro)](https://www.npmjs.com/package/@wollycms/astro) | Astro integration — components, helpers, route generation |
| [`create-wolly`](packages/create-wolly) | [![npm](https://img.shields.io/npm/v/create-wolly)](https://www.npmjs.com/package/create-wolly) | CLI scaffolding tool with starter templates |
| [`@wollycms/admin`](packages/admin) | — | SvelteKit admin UI (bundled with server) |

## Development

To contribute or work on WollyCMS itself, clone the monorepo:

```bash
git clone https://github.com/wollycms/wollycms.git && cd wollycms
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

```bash
# In separate terminals:
npm run dev:admin         # Admin UI at http://localhost:4324
npm run dev:site          # Example Astro site at http://localhost:4322
```

### Development Commands

```bash
npm install               # Install all workspace dependencies
npm run dev               # API server with hot reload
npm run dev:admin         # Admin UI dev server
npm run dev:site          # Example Astro site
npm run build             # Build server + admin
npm run test              # Run all tests
npm run db:generate       # Generate migration from schema changes
npm run db:migrate        # Run pending migrations
npm run db:seed           # Populate sample data
```

## Deployment

WollyCMS can be deployed via:

- **Docker** — Multi-stage production image with Caddy reverse proxy, published to `ghcr.io/wollycms/wollycms`. See [Deployment Guide](docs/guides/deployment.md).
- **Cloudflare Workers** — D1 database + R2 storage. See [`wrangler.toml.example`](wrangler.toml.example) and the [Cloudflare deployment docs](https://docs.wollycms.com/deployment/cloudflare/).
- **Bare Node.js** — SQLite or PostgreSQL, behind nginx/Caddy. See the [Node.js deployment docs](https://docs.wollycms.com/deployment/nodejs/).

## Documentation

Full documentation is available at **[docs.wollycms.com](https://docs.wollycms.com)**.

| Section | Topics |
|---|---|
| [Getting Started](https://docs.wollycms.com/getting-started/introduction/) | Quick start, project structure, starter templates |
| [Concepts](https://docs.wollycms.com/concepts/pages/) | Pages, blocks, menus, taxonomies, media, workflows, revisions, OAuth, 2FA, AI helpers, accessibility |
| [Astro Integration](https://docs.wollycms.com/astro/setup/) | Setup, BlockRenderer, images, menus, SEO |
| [API Reference](https://docs.wollycms.com/api/content-api/) | Content API, Admin API, GraphQL |
| [Deployment](https://docs.wollycms.com/deployment/docker/) | Docker, Cloudflare Workers, Node.js |
| [Migration Guides](https://docs.wollycms.com/migration/overview/) | Migrate from Drupal, WordPress |

Architecture documentation for contributors is in [`docs/`](docs/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE)
