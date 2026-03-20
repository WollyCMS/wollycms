# WollyCMS — Project Instructions

## Project Overview

WollyCMS is a self-hosted, open-source headless CMS designed for Astro.js.
It provides composable block-based page building with reusable content blocks,
hierarchical menus, taxonomy management, and media handling.

## Tech Stack

- **Runtime**: Node.js 22 LTS, TypeScript (strict mode, ESM)
- **API Framework**: Hono 4.x
- **ORM**: Drizzle (SQLite default, PostgreSQL supported)
- **Admin UI**: SvelteKit (SPA mode)
- **Rich Text**: TipTap (JSON storage format)
- **Media**: Sharp for image processing
- **Testing**: Vitest
- **Package Management**: npm workspaces (monorepo)

## Project Structure

```
packages/server/    — Hono API server + Drizzle schema + media processing
packages/admin/     — SvelteKit admin UI
packages/astro/     — @wollycms/astro npm integration package
examples/           — Reference Astro site
docs/               — Architecture and planning documentation
scripts/            — Build, deploy, migration scripts
```

## Build Commands

```bash
npm install               # Install all workspace dependencies
npm run dev               # Start server with hot reload (tsx watch)
npm run build             # Build all packages
npm run test              # Run Vitest tests
npm run db:generate       # Generate SQLite Drizzle migration from schema changes
npm run db:generate:pg    # Generate PostgreSQL Drizzle migration from schema changes
npm run db:migrate        # Run pending migrations (auto-detects dialect from DATABASE_URL)
npm run db:seed           # Populate database with sample data (auto-detects dialect)
```

## Test Commands

```bash
npm run test                                   # Run all tests
npm run test --workspace=packages/server       # Server tests only
```

## Architecture Key Points

- Content is stored as structured JSON (not HTML)
- Pages have named regions (hero, content, sidebar, bottom, features) containing ordered blocks
- Hero content is a composable block type in the hero region (not page-level fields)
- Blocks can be inline (page-specific) or shared/reusable (from block library)
- TipTap rich text stored as JSON, rendered by Astro components
- Content API is public/read-only; Admin API is authenticated; Preview API is token-authenticated
- Media stored on local filesystem (dev) or S3-compatible (prod)
- API routes: `/api/content/*` (public), `/api/admin/*` (auth), `/api/content/preview/*` (token auth)
- Dual database: SQLite schemas in `schema/`, PG schemas in `schema-pg/`; auto-selects based on `DATABASE_URL`
- App factory: `src/app.ts` (testable), `src/index.ts` (server entry)
- Schema files use `.ts` imports (drizzle-kit requires this); `rewriteRelativeImportExtensions` in tsconfig converts to `.js` on build

## Important Patterns

- Use Zod schemas for all API input validation
- Drizzle schema is the single source of truth for database structure
- Block type schemas are JSON — define field types, validation, and UI hints
- All timestamps are ISO 8601 UTC
- Slugs are auto-generated from titles, manually overridable, unique enforced
- Shared blocks track references — cannot be deleted while in use

## Documentation

All architecture decisions, data models, API specs, and requirements are in `/docs`.
Read these before making structural changes:

- `docs/architecture/overview.md` — System design
- `docs/architecture/data-model.md` — Database schema
- `docs/architecture/block-system.md` — Block composition model
- `docs/architecture/api-design.md` — API endpoints
- `docs/architecture/astro-integration.md` — Astro package design
- `docs/planning/requirements.md` — Feature requirements
- `docs/planning/roadmap.md` — Implementation phases
- `docs/planning/tech-stack.md` — Technology choices
- `docs/architecture/accessibility-checks.md` — WCAG AA content checks
- `docs/architecture/seo-editor-tools.md` — SEO previews and scoring
