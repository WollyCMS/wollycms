# SpacelyCMS — Development Roadmap

## Philosophy

Build in vertical slices. Each phase delivers something usable, not just a
partial foundation. Every phase ends with a working demo.

---

## Phase 1: Data Foundation + Content API -- COMPLETE

**Goal**: A working headless CMS API that Astro can fetch from. Content
managed via API (no admin UI yet — use seed scripts or API client).

### Deliverables

- [x] Project setup: Node.js + TypeScript + Hono + Drizzle + SQLite
- [x] Database schema: all 13 tables from data model doc
- [x] Migration system (Drizzle Kit)
- [x] Seed data: college-inspired sample content (3 content types, 8 block
      types, 8 pages with blocks in regions, 3 menus, 2 taxonomies, 6 media)
- [x] Content API endpoints:
  - `GET /api/content/pages` (list, filter by type/taxonomy/status, pagination)
  - `GET /api/content/pages/:slug` (full page with resolved blocks per region)
  - `GET /api/content/menus/:slug` (full menu tree with depth limiting)
  - `GET /api/content/taxonomies/:slug/terms`
  - `GET /api/content/media/:id/:variant`
  - `GET /api/content/redirects`
  - `GET /api/content/config`
  - `GET /api/content/schemas`
- [x] Tests: 22 Vitest tests for all API endpoints
- [ ] Media storage: local filesystem with Sharp image processing
- [ ] Basic auth middleware (placeholder for admin API)
- [ ] Docker setup: Dockerfile + docker-compose.yml

### Demo

Start the server, hit the API with curl/browser, get back structured JSON
for pages with blocks, menus, and media URLs.

### Completed: 2026-03-06

---

## Phase 2: Astro Integration Package

**Goal**: An Astro site rendering real pages from SpacelyCMS with
components for every block type.

### Deliverables

- [ ] `@spacelycms/astro` npm package (monorepo or separate repo)
  - SpacelyClient class (API fetcher with caching)
  - BlockRenderer component
  - SpacelyImage component
  - RichText renderer
  - Menu helpers
- [ ] Reference Astro site (in `examples/` directory):
  - `[...slug].astro` catch-all route
  - Block components for all standard block types
  - Layout with header/footer/sidebar regions
  - Navigation component rendering menu tree
  - Responsive, accessible HTML output
- [ ] Block component library:
  - RichText, Accordion, CTA Button, Contact List, Location, Image,
    Gallery, Link List, Card Grid, Content Listing, Alert, Embed
- [ ] SSG mode: `getStaticPaths` fetching all pages at build time
- [ ] SSR mode: per-request fetching
- [ ] TypeScript types for all API responses
- [ ] Documentation: integration setup guide

### Demo

Run `npm run dev` on the example Astro site — see a multi-page website
with navigation, sidebars, accordions, contact blocks, all rendered from
CMS data. Looks like a real college website.

### Estimated Effort: 1-2 weeks

---

## Phase 3: Admin UI — Content Management

**Goal**: A web-based admin interface where a webmaster can create and edit
all content without touching code or APIs.

### Deliverables

- [ ] Admin API: full CRUD endpoints for all entities (authenticated)
- [ ] Auth system: login, sessions, JWT
- [ ] Admin SPA (SvelteKit or React):
  - **Dashboard**: recent pages, quick stats
  - **Pages**: list, create, edit, publish/unpublish, delete
  - **Page Editor**: form-based with region tabs, block list per region,
    add/remove/reorder blocks, block type selector
  - **Block Library**: browse/create/edit reusable blocks, usage report
  - **Block Editor**: form auto-generated from block type schema, rich text
    editor (TipTap) for richtext fields
  - **Media Library**: grid browser, upload (drag-drop), edit metadata,
    search, filter by type
  - **Menus**: tree view, drag-drop reorder, add/edit/remove items,
    link to page or external URL
  - **Taxonomies**: vocabulary list, term tree, CRUD
  - **Redirects**: list, create, import CSV
  - **Content Types**: schema editor (add/remove/reorder fields, define
    regions) — for advanced users
  - **Block Types**: schema editor (add/remove/reorder fields)
  - **Users**: list, create, edit roles
  - **Settings**: site name, logo, webhook URLs
- [ ] Real-time validation: slug uniqueness, required fields, media types
- [ ] Responsive layout (usable on tablet)
- [ ] Tests: admin API tests, basic UI tests

### Demo

Log into the admin UI, create a new page, add blocks to regions, upload
images, build a menu, publish — then see it rendered on the Astro site.

### Estimated Effort: 4-6 weeks

---

## Phase 4: Visual Page Builder + Live Preview

**Goal**: Drag-and-drop page composition with live preview in the Astro
frontend. The Storyblok-like experience.

### Deliverables

- [ ] Visual page editor:
  - Drag-drop blocks between regions
  - Inline block editing (click to edit)
  - Block palette (browsable block types)
  - Shared block picker (search/browse library)
  - Visual region indicators
- [ ] Live preview bridge:
  - Preview iframe showing Astro site
  - CMS sends draft content to preview endpoint
  - Bi-directional: click in preview to select block in editor
  - Real-time updates as content changes
- [ ] Advanced rich text:
  - Slash commands (/ to insert block)
  - Drag images into rich text
  - Table editing
  - Paste cleanup (Word, Google Docs)
- [ ] Content scheduling (publish/unpublish on date)
- [ ] Revision history with diff view and rollback
- [ ] Multi-user: real-time presence (who's editing what)

### Demo

Open the page editor, see a visual representation of the page with regions,
drag blocks around, edit inline, see changes live in the preview panel.

### Estimated Effort: 6-8 weeks

---

## Phase 5: Production Hardening + Migration Tools

**Goal**: Production-ready CMS with tools to migrate existing sites.

### Deliverables

- [ ] PostgreSQL support (Drizzle adapter swap)
- [ ] S3-compatible media storage (R2, MinIO, AWS S3)
- [ ] CDN integration (cache headers, purge on publish)
- [ ] Webhook system (configurable endpoints for publish events)
- [ ] Search integration (Pagefind for Astro SSG, Meilisearch for SSR)
- [ ] Migration tools:
  - Drupal → SpacelyCMS importer (nodes, paragraphs, menus, media, terms)
  - WordPress → SpacelyCMS importer
  - Generic CSV/JSON import
- [ ] Backup/restore system
- [ ] Performance optimization (query caching, batch API, edge caching)
- [ ] Security audit
- [ ] Comprehensive documentation site
- [ ] Docker production deployment guide

### Demo

Migrate southside.edu content into SpacelyCMS, render it with Astro on
Cloudflare Pages, compare side-by-side with the live Drupal site.

### Estimated Effort: 4-6 weeks

---

## Timeline Summary

| Phase | Focus | Effort | Cumulative |
|---|---|---|---|
| Phase 1 | Data + API | 2-3 weeks | 2-3 weeks |
| Phase 2 | Astro Integration | 1-2 weeks | 3-5 weeks |
| Phase 3 | Admin UI | 4-6 weeks | 7-11 weeks |
| Phase 4 | Visual Builder | 6-8 weeks | 13-19 weeks |
| Phase 5 | Production + Migration | 4-6 weeks | 17-25 weeks |

**MVP (Phases 1-3)**: ~7-11 weeks for a fully usable headless CMS with admin UI
**Full Product (Phases 1-5)**: ~17-25 weeks

---

## What We're NOT Building (Scope Boundaries)

- **E-commerce** — No shopping carts, payments, inventory
- **User-facing accounts** — No frontend user registration/login
- **Email system** — No newsletters, transactional email (use external service)
- **Form builder** — Not in v1 (maybe v2, or use external like Formspree)
- **Multi-site** — One CMS instance = one site (for now)
- **Multi-language** — Not in v1 (architecture supports it later)
- **Workflows/approvals** — Not in v1 (draft → published is sufficient)
- **AI features** — Not in v1 (could add AI-assisted content later)
