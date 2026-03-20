# WollyCMS

A self-hosted, open-source headless CMS designed for [Astro.js](https://astro.build) with composable block-based page building, reusable content blocks, and hierarchical menu management.

[![CI](https://github.com/wollycms/wollycms/actions/workflows/build-push.yml/badge.svg)](https://github.com/wollycms/wollycms/actions/workflows/build-push.yml)
[![npm](https://img.shields.io/npm/v/@wollycms/server?label=%40wollycms%2Fserver)](https://www.npmjs.com/package/@wollycms/server)
[![npm](https://img.shields.io/npm/v/@wollycms/astro?label=%40wollycms%2Fastro)](https://www.npmjs.com/package/@wollycms/astro)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green.svg)](https://nodejs.org/)

## About

WollyCMS fills the gap between simple headless CMS tools (Strapi, Directus) that lack page composition, and expensive SaaS platforms (Storyblok) that lock you in. It brings Drupal's powerful content composition model — paragraphs, reusable blocks, multi-region layouts — into a modern, lightweight, Astro-native package.

**Built with Claude Code** — This project was built entirely using [Claude Code](https://claude.com/claude-code), Anthropic's AI-powered development tool. It is designed to work with Claude's APIs for building out any Astro deployment.

**Origin story** — WollyCMS started as a simple blog engine but evolved into a tool for migrating Drupal sites to Astro.js, with composable block-based content modeling that maps naturally to Drupal's content architecture (paragraphs, block references, multi-region layouts).

> **Maintenance notice**: This is a personal side project. I am not a full-time maintainer. Bug reports and feature requests are welcome, but expect slow response times. PRs are appreciated — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## Features

- **Block Composition** — Build pages from typed, reusable content blocks arranged in named regions (hero, content, sidebar, bottom)
- **Reusable Block Library** — Create blocks once, reference them across pages. Edit once, update everywhere.
- **Visual Page Builder** — Drag-and-drop blocks between regions, inline editing, live preview with device toggle
- **Hierarchical Menus** — Multiple menus with deep nesting, container items, and drag-drop editing
- **Rich Text Editor** — TipTap WYSIWYG with slash commands, table editing, paste cleanup
- **Media Library** — Upload, organize, and process images (Sharp generates WebP variants)
- **Astro-Native** — First-class `@wollycms/astro` integration with BlockRenderer, route generation, menu helpers, and image optimization
- **Admin UI** — SvelteKit SPA with keyboard shortcuts, toast notifications, revision history, multi-user presence
- **Webhooks** — HMAC-SHA256 signed webhooks for build triggers on content changes
- **API Keys** — Long-lived tokens for build pipelines with permission scoping
- **Audit Logging** — Track all content mutations with user, action, and IP
- **SEO** — Meta title/description, OG image, canonical URL, robots, XML sitemap, JSON-LD helpers
- **Global Search** — Ctrl+K to search across pages, blocks, media, and menus
- **Scheduled Publishing** — Set a publish date and content goes live automatically
- **Self-Hosted** — Runs anywhere Node.js runs. SQLite for dev, PostgreSQL for production.

## Quick Start

Create a new project with a single command:

```bash
npm create wolly my-site
cd my-site
npm run migrate
npm run seed
npm run dev
```

That's it — the API server starts at `http://localhost:4321` with the admin UI built in.
Default login: `admin@wollycms.local` / `admin123`.

### Docker

```bash
npm create wolly my-site && cd my-site
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

See [Astro Integration docs](docs/architecture/astro-integration.md) for BlockRenderer, route generation, menu helpers, and image optimization.

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
| `GET /api/content/sitemap` | XML sitemap of published pages |
| `GET /sitemap.xml` | Redirect to sitemap endpoint |
| `GET /api/admin/search?q=` | Global search (pages, blocks, media, menus) |
| `GET /api/health` | Health check (uptime, version) |

## Tech Stack

| Component | Technology |
|---|---|
| API Server | Hono 4.x (TypeScript, ESM) |
| Database | SQLite (dev) / PostgreSQL (prod) via Drizzle ORM |
| Admin UI | SvelteKit 5 (SPA mode) |
| Rich Text | TipTap (JSON storage) |
| Media Processing | Sharp |
| Testing | Vitest |
| Runtime | Node.js 22 LTS |

## Project Structure

```
wollycms/
├── packages/
│   ├── server/        # Hono API server + Drizzle schema
│   ├── admin/         # SvelteKit admin SPA
│   ├── astro/         # @wollycms/astro integration
│   └── create-wolly/  # CLI scaffolding tool
├── examples/
│   └── college-site/  # Reference Astro site
├── docs/              # Architecture and planning docs
├── deploy/            # Production deployment docs
└── scripts/           # Build/deploy scripts
```

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:./data/wolly.db` | Database connection string |
| `PORT` | `4321` | Server port |
| `JWT_SECRET` | — | **Required in production.** Secret for JWT signing |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated). **Set this in production** — `*` is for development only. Example: `https://your-site.com,https://admin.your-site.com` |
| `MEDIA_DIR` | `./uploads` | Local media storage path |
| `SITE_URL` | `http://localhost:4322` | Frontend URL for webhooks/preview |
| `RATE_LIMIT_AUTH` | `10` | Max login attempts per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min default) |

## Packages

| Package | npm | Description |
|---|---|---|
| [`@wollycms/server`](packages/server) | [![npm](https://img.shields.io/npm/v/@wollycms/server)](https://www.npmjs.com/package/@wollycms/server) | Hono API server, Drizzle schema, media processing |
| [`@wollycms/astro`](packages/astro) | [![npm](https://img.shields.io/npm/v/@wollycms/astro)](https://www.npmjs.com/package/@wollycms/astro) | Astro integration — components, helpers, route generation |
| [`create-wolly`](packages/create-wolly) | [![npm](https://img.shields.io/npm/v/create-wolly)](https://www.npmjs.com/package/create-wolly) | CLI scaffolding tool |
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
npm run build             # Build server
npm run test              # Run all tests
npm run db:generate       # Generate migration from schema changes
npm run db:migrate        # Run pending migrations
npm run db:seed           # Populate sample data
```

## Deployment

WollyCMS can be deployed via:

- **Docker** — Multi-stage production image with Caddy reverse proxy. See [Deployment Guide](docs/guides/deployment.md).
- **Cloudflare Workers** — D1 database + R2 storage. See [`wrangler.toml.example`](wrangler.toml.example).
- **Bare Node.js** — SQLite or PostgreSQL, behind nginx/Caddy.

## Documentation

| Document | Description |
|---|---|
| [Architecture Overview](docs/architecture/overview.md) | System design and tech choices |
| [Data Model](docs/architecture/data-model.md) | Database schema and entity relationships |
| [Block System](docs/architecture/block-system.md) | Composable block/region architecture |
| [API Design](docs/architecture/api-design.md) | Content API and Admin API specifications |
| [Astro Integration](docs/architecture/astro-integration.md) | `@wollycms/astro` package design |
| [Roadmap](docs/planning/roadmap.md) | Implementation phases and status |
| [Deployment Guide](docs/guides/deployment.md) | Docker, manual deploy, backups, security |

## Status

Phases 1-5 complete. See [Roadmap](docs/planning/roadmap.md) for details.

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Data + API | Complete |
| Phase 2 | Astro Integration | Complete |
| Phase 3 | Admin UI | Complete |
| Phase 4 | Visual Builder | Complete |
| Phase 4.5 | Admin UI Polish | Complete |
| Phase 5a | Production Infrastructure | Complete |
| Phase 5b-c | Security/Performance | Complete |
| Phase 6 | Packaging & DX | Complete |
| Phase 7 | Content Features | In Progress |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE)
