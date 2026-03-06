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
- [x] Media storage: local filesystem with Sharp image processing
- [x] Basic auth middleware (JWT implemented in Phase 3)
- [x] Docker setup: Dockerfile + docker-compose.yml

### Demo

Start the server, hit the API with curl/browser, get back structured JSON
for pages with blocks, menus, and media URLs.

### Completed: 2026-03-06

---

## Phase 2: Astro Integration Package -- COMPLETE

**Goal**: An Astro site rendering real pages from SpacelyCMS with
components for every block type.

### Deliverables

- [x] `@spacelycms/astro` npm package (monorepo workspace)
  - SpacelyClient class (API fetcher)
  - BlockRenderer component
  - SpacelyImage component
  - RichText renderer (TipTap JSON → HTML)
  - Menu helpers (isActive, getBreadcrumbs, getChildren, flattenMenu)
- [x] Reference Astro site (in `examples/college-site/`):
  - `[...slug].astro` catch-all route
  - Block components for all 8 standard block types
  - Layout with header/footer/sidebar regions
  - Navigation component rendering 3-level menu tree
  - Breadcrumbs from menu tree
  - Responsive, accessible HTML output
- [x] Block component library:
  - RichText, Accordion, CTA Button, Contact List, Location, Image,
    Link List, Content Listing
- [x] SSG mode: `getStaticPaths` fetching all pages at build time
- [x] TypeScript types for all API responses
- [ ] SSR mode: per-request fetching (architecture supports it, not demoed)
- [ ] Documentation: integration setup guide

### Demo

Run `npm run dev:site` — see a multi-page college website with
navigation, sidebars, accordions, contact blocks, all rendered from
CMS data. 8 pages built from seed data.

### Completed: 2026-03-06

---

## Phase 3: Admin UI — Content Management -- COMPLETE

**Goal**: A web-based admin interface where a webmaster can create and edit
all content without touching code or APIs.

### Deliverables

- [x] Admin API: full CRUD endpoints for all entities (authenticated)
  - Pages (CRUD + block management per region)
  - Blocks (library CRUD with usage tracking)
  - Menus (CRUD menus + items, tree reordering)
  - Taxonomies (CRUD vocabularies + terms)
  - Media (upload, metadata edit, delete)
  - Redirects (CRUD + bulk import)
  - Content Types (CRUD with JSON schema editor)
  - Block Types (CRUD with JSON schema editor)
  - Users (CRUD with password hashing)
  - Config/Settings (file-based)
  - Dashboard (stats + recent pages)
- [x] Auth system: JWT (HS256, 24h tokens), scrypt password hashing
- [x] Admin SPA (SvelteKit 5, SPA mode):
  - **Dashboard**: 7 stat cards, recent pages table
  - **Pages**: list with search/filter, create modal, publish/unpublish
  - **Page Editor**: form-based with region tabs, block list per region,
    add/remove blocks, inline field editing, block type selector
  - **Block Library**: browse/create/delete reusable blocks
  - **Media Library**: grid browser, upload, edit metadata, delete
  - **Menus**: sidebar menu list, tree view, add/delete items
  - **Taxonomies**: vocabulary list, term list/tree, CRUD
  - **Redirects**: list, create, toggle active/inactive
  - **Content Types**: JSON schema editor for fields and regions
  - **Block Types**: JSON schema editor for fields
  - **Users**: list, create with role selection, delete
  - **Settings**: site name, tagline, footer text, social links
- [x] Responsive layout (sidebar collapses on tablet)
- [x] Rich text editor (TipTap WYSIWYG with toolbar)
- [x] Drag-drop reorder for blocks and menu items
- [x] Media: Sharp image processing for variant generation (thumbnail, medium, large WebP)
- [x] Media: folder organization, search by name, type filtering
- [x] Media: video/document preview in picker (not just images)
- [x] Block library: full edit modal with all field type renderers
- [x] Video block type: source selector (upload/YouTube/Vimeo), conditional fields
- [x] Seed data: no longer creates fake media records (preserves real uploads across reseeds)
- [x] Page duplication (shared blocks referenced, inline blocks deep-copied)
- [x] Bulk operations (publish/unpublish/archive/delete multiple pages)
- [x] Page revision history (auto-snapshot on save, view/restore from admin UI)
- [x] Pagination on pages list with prev/next controls
- [x] Type filter and sort controls on pages list and block library
- [x] Client-side validation with friendly error messages
- [x] RBAC enforcement: admin-only guards on users, content/block types, config
- [x] Content scheduling (scheduledAt field, content API filters future pages)
- [x] Export/import (full JSON backup, admin-only, deduplication on import)
- [x] Redirects search filtering
- [x] Tests: 93 tests (23 content API + 70 admin API), all passing

### Known Limitations

- RBAC: viewer role can read all admin data (no field-level restrictions)
- No SSR preview mode demonstrated yet

### Demo

Start server (`npm run dev`), open admin (`npm run dev:admin`), login with
`admin@spacelycms.local` / `admin123`. Create pages, add blocks, upload
media, manage menus and taxonomies, publish content.

### Completed: 2026-03-06

---

## Phase 4: Visual Page Builder + Live Preview

**Goal**: Drag-and-drop page composition with live preview in the Astro
frontend. The Storyblok-like experience.

### Deliverables

- [x] Live preview bridge:
  - Preview iframe showing Astro site in split-pane editor
  - Preview API endpoint (authenticated, returns draft content)
  - SSR preview route on Astro site
  - PostMessage refresh on save
- [x] Block management improvements:
  - Move blocks between regions (dropdown)
  - Shared block picker (search/filter from library)
  - Usage count on blocks list
- [ ] Visual page editor (remaining):
  - Drag-drop blocks between regions (visual)
  - Inline block editing (click to edit in preview)
  - Visual region indicators
- [ ] Advanced rich text:
  - Slash commands (/ to insert block)
  - Drag images into rich text
  - Table editing
  - Paste cleanup (Word, Google Docs)
- [x] Content scheduling (completed in Phase 3)
- [x] Revision history with rollback (completed in Phase 3)
- [x] Revision diff view (side-by-side comparison with highlights)
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
