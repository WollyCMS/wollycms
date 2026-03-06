# SpacelyCMS

A self-hosted, open-source headless CMS designed for [Astro.js](https://astro.build) with composable block-based page building, reusable content blocks, and hierarchical menu management.

## Vision

SpacelyCMS fills the gap between simple headless CMS tools (Strapi, Directus) that lack page composition, and expensive SaaS platforms (Storyblok) that lock you in. It brings Drupal's powerful content composition model — paragraphs, reusable blocks, multi-region layouts — into a modern, lightweight, Astro-native package.

## Key Features (Planned)

- **Block Composition** — Build pages from typed, reusable content blocks arranged in named regions (main, sidebar, bottom)
- **Reusable Block Library** — Create blocks once, reference them across pages. Edit once, update everywhere.
- **Hierarchical Menus** — Multiple menus with deep nesting, container items, and drag-drop editing
- **Astro-Native** — First-class `@spacelycms/astro` integration with BlockRenderer, route generation, menu helpers, and image optimization
- **Self-Hosted** — Runs anywhere Node.js runs. SQLite for dev, PostgreSQL for production.
- **Webmaster-Friendly** — Admin UI with WYSIWYG editing, media library, and visual page builder
- **Host Anywhere** — Works with Cloudflare Pages, Vercel, Netlify, VPS, Docker — any Astro deployment target

## Status

**Phase 1 complete** — Data foundation and Content API are working. See [Roadmap](docs/planning/roadmap.md) for details.

## Quick Start

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
# Server running at http://localhost:4321
```

### Content API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/content/pages` | List pages (filter by type, taxonomy, pagination) |
| `GET /api/content/pages/:slug` | Full page with resolved blocks per region |
| `GET /api/content/menus/:slug` | Menu tree (supports `?depth=N`) |
| `GET /api/content/taxonomies/:slug/terms` | Taxonomy terms |
| `GET /api/content/media/:id/:variant` | Media file info |
| `GET /api/content/redirects` | Active redirects |
| `GET /api/content/config` | Site configuration |
| `GET /api/content/schemas` | Content type and block type schemas |

## Documentation

| Document | Description |
|---|---|
| [Architecture Overview](docs/architecture/overview.md) | System design and tech choices |
| [Data Model](docs/architecture/data-model.md) | Database schema and entity relationships |
| [Block System](docs/architecture/block-system.md) | Composable block/region architecture |
| [API Design](docs/architecture/api-design.md) | Content API and Admin API specifications |
| [Astro Integration](docs/architecture/astro-integration.md) | `@spacelycms/astro` package design |
| [Requirements](docs/planning/requirements.md) | Functional and non-functional requirements |
| [Roadmap](docs/planning/roadmap.md) | Phased implementation plan |
| [Tech Stack](docs/planning/tech-stack.md) | Technology choices and rationale |
| [Drupal Analysis](docs/research/southside-edu-analysis.md) | Reference site architecture analysis |
| [Competitive Landscape](docs/research/competitive-landscape.md) | Why build this vs use existing CMS |

## Tech Stack

| Component | Technology |
|---|---|
| API Server | Hono (TypeScript) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Drizzle |
| Admin UI | SvelteKit |
| Rich Text | TipTap (JSON storage) |
| Media Processing | Sharp |
| Astro Integration | `@spacelycms/astro` npm package |

## Project Structure

```
SpacelyCMS/
├── packages/
│   ├── server/       # API server (Hono + Drizzle)
│   ├── admin/        # Admin UI (SvelteKit)
│   └── astro/        # @spacelycms/astro integration
├── examples/
│   └── college-site/ # Reference Astro site
├── docs/             # Architecture and planning docs
└── scripts/          # Build/deploy scripts
```

## License

MIT
