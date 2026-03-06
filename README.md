# SpacelyCMS

A self-hosted, open-source headless CMS designed for [Astro.js](https://astro.build) with composable block-based page building, reusable content blocks, and hierarchical menu management.

## Why SpacelyCMS?

SpacelyCMS fills the gap between simple headless CMS tools (Strapi, Directus) that lack page composition, and expensive SaaS platforms (Storyblok) that lock you in. It brings Drupal's powerful content composition model — paragraphs, reusable blocks, multi-region layouts — into a modern, lightweight, Astro-native package.

## Features

- **Block Composition** — Build pages from typed, reusable content blocks arranged in named regions (hero, content, sidebar, bottom)
- **Reusable Block Library** — Create blocks once, reference them across pages. Edit once, update everywhere.
- **Visual Page Builder** — Drag-and-drop blocks between regions, inline editing, live preview with device toggle
- **Hierarchical Menus** — Multiple menus with deep nesting, container items, and drag-drop editing
- **Rich Text Editor** — TipTap WYSIWYG with slash commands, table editing, paste cleanup
- **Media Library** — Upload, organize, and process images (Sharp generates WebP variants)
- **Astro-Native** — First-class `@spacelycms/astro` integration with BlockRenderer, route generation, menu helpers, and image optimization
- **Admin UI** — SvelteKit SPA with keyboard shortcuts, toast notifications, revision history, multi-user presence
- **Webhooks** — HMAC-SHA256 signed webhooks for build triggers on content changes
- **API Keys** — Long-lived tokens for build pipelines with permission scoping
- **Audit Logging** — Track all content mutations with user, action, and IP
- **Self-Hosted** — Runs anywhere Node.js runs. SQLite for dev, PostgreSQL support planned.

## Quick Start

```bash
git clone <repo-url> spacelycms && cd spacelycms
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The API server starts at `http://localhost:4321`. Default login: `admin@spacelycms.local` / `admin123`.

```bash
# In separate terminals:
npm run dev:admin    # Admin UI at http://localhost:4324
npm run dev:site     # Example Astro site at http://localhost:4322
```

### Docker

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET to a secure random value
docker compose up -d
```

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
| `GET /api/content/sitemap` | XML sitemap of published pages |
| `GET /sitemap.xml` | Redirect to sitemap endpoint |
| `GET /api/health` | Health check (uptime, version) |

## Tech Stack

| Component | Technology |
|---|---|
| API Server | Hono 4.x (TypeScript, ESM) |
| Database | SQLite (Drizzle ORM) |
| Admin UI | SvelteKit 5 (SPA mode) |
| Rich Text | TipTap (JSON storage) |
| Media Processing | Sharp |
| Testing | Vitest (97 tests) |
| Runtime | Node.js 22 LTS |

## Project Structure

```
spacelycms/
├── packages/
│   ├── server/       # Hono API server + Drizzle schema
│   ├── admin/        # SvelteKit admin SPA
│   └── astro/        # @spacelycms/astro integration
├── examples/
│   └── college-site/ # Reference Astro site
├── docs/             # Architecture and planning docs
└── scripts/          # Build/deploy scripts
```

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:./data/spacely.db` | Database connection string |
| `PORT` | `4321` | Server port |
| `JWT_SECRET` | — | **Required in production.** Secret for JWT signing |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated) |
| `MEDIA_DIR` | `./uploads` | Local media storage path |
| `SITE_URL` | `http://localhost:4322` | Frontend URL for webhooks/preview |
| `RATE_LIMIT_AUTH` | `10` | Max login attempts per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min default) |

## Development

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

## Documentation

| Document | Description |
|---|---|
| [Architecture Overview](docs/architecture/overview.md) | System design and tech choices |
| [Data Model](docs/architecture/data-model.md) | Database schema and entity relationships |
| [Block System](docs/architecture/block-system.md) | Composable block/region architecture |
| [API Design](docs/architecture/api-design.md) | Content API and Admin API specifications |
| [Astro Integration](docs/architecture/astro-integration.md) | `@spacelycms/astro` package design |
| [Roadmap](docs/planning/roadmap.md) | Implementation phases and status |

## Status

Phases 1-5a complete. See [Roadmap](docs/planning/roadmap.md) for details.

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Data + API | Complete |
| Phase 2 | Astro Integration | Complete |
| Phase 3 | Admin UI | Complete |
| Phase 4 | Visual Builder | Complete |
| Phase 4.5 | Admin UI Polish | Complete |
| Phase 5a | Production Infrastructure | Complete |
| Phase 5b-c | Security/Performance | Partial |
| Phase 6+ | Packaging & DX | Planned |

## License

MIT
