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
- [x] Tests: 97 tests (27 content API + 70 admin API), all passing

### Known Limitations

- RBAC: viewer role can read all admin data (no field-level restrictions)

### Demo

Start server (`npm run dev`), open admin (`npm run dev:admin`), login with
`admin@spacelycms.local` / `admin123`. Create pages, add blocks, upload
media, manage menus and taxonomies, publish content.

### Completed: 2026-03-06

---

## Phase 4: Visual Page Builder + Live Preview -- COMPLETE

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
- [x] Hero as composable block type (not page fields)
  - Hero block with heading, subtitle, eyebrow, description, image, CTA, style
  - Hero region on all content types
  - Pages without heroes render no hero section; multiple heroes supported
- [x] Accordion plain-text body fix (handles both TipTap JSON and strings)
- [x] College-site polish: multi-column footer, card grid "Explore" links,
  background-image cover on hero
- [x] Visual page editor:
  - [x] Multi-region editor (all regions visible simultaneously)
  - [x] Cross-region drag-and-drop with drop indicators and flash animation
  - [x] Collapsible block cards with position numbers and content preview
  - [x] Color-coded region headers
  - [x] RepeaterEditor component (visual sub-field editing, not raw JSON)
  - [x] Null safety for block fields
  - [x] Inline block editing (click block in preview to select/edit, bidirectional PostMessage bridge)
- [x] Advanced rich text:
  - [x] Slash commands (/ to insert headings, lists, tables, images, links)
  - [x] Dropcursor for drag-and-drop content
  - [x] Contextual table toolbar (add/delete rows/cols, merge/split, toggle header)
  - [x] Paste cleanup (strips Word/Google Docs markup, mso styles, empty spans)
  - [x] Placeholder text ("Type / for commands...")
- [x] Content scheduling (completed in Phase 3)
- [x] Revision history with rollback (completed in Phase 3)
- [x] Revision diff view (side-by-side comparison with highlights)
- [x] Multi-user presence (heartbeat-based, shows who's editing each page)

### Demo

Open the page editor, see a visual representation of the page with regions,
drag blocks around, edit inline, see changes live in the preview panel.

### Completed: 2026-03-06

---

## Phase 4.5: Admin UI Polish

**Goal**: Make the admin UI feel like a professional document editor, not a
form-driven CRUD app. These are targeted UX improvements that make daily
content management faster and more pleasant.

### 4.5a. Quick Wins -- COMPLETE

- [x] Replace emoji sidebar icons with Lucide icons (consistent cross-OS,
      crisp at small sizes, grouped nav with section dividers)
- [x] Monospace font for slugs and code-like values (`.mono` utility class,
      JetBrains Mono / Fira Code fallback chain)
- [x] Breadcrumb navigation in page editor (Dashboard > Pages > Page Title)
- [x] Dirty state indicator (pulsing yellow dot on Save button, beforeunload
      + beforeNavigate warnings for unsaved changes)
- [x] Toast notifications (bottom-right stacking toasts with Lucide icons,
      auto-dismiss, migrated page editor/blocks/settings/pages list)
- [x] Block auto-save toast feedback ("Block saved." on field blur)
- [x] Keyboard shortcuts:
  - `Ctrl+S` — Save page
  - `Ctrl+Shift+P` — Toggle preview panel
  - `Esc` — Close shortcut overlay
  - `?` — Show keyboard shortcut overlay (clickable hint in sidebar footer)
- [x] Sidebar collapsed tooltips on hover (60px mode)
- [x] `?` shortcut button in sidebar footer for discoverability

### 4.5b. Editor Feel (document editor, not form) -- COMPLETE

- [x] Notion-style page title (large styled input that looks like a heading,
      hover background hint for editability, no label/form chrome)
- [x] Inline slug field (subtle `/{slug}` below title, click to edit inline,
      auto-generates from title for new content)
- [x] Status pill next to title (colored pill with Lucide icon — green
      Published/CheckCircle, yellow Draft/Circle, gray Archived/Archive)
- [x] Sidebar navigation grouping with section dividers (done in 4.5a)
- [x] SpacelyCMS wordmark/logo (blue "S" icon badge + text, collapses to
      just badge on mobile)
- [x] Count badges on sidebar nav items (Pages, Blocks, Media, Menus, Users
      — fetched from dashboard stats API)
- [x] Tooltips on collapsed sidebar icons (done in 4.5a)
- [x] Page fields card moved below title area (title/slug/status are now
      in the editor header, not in a form card)

### 4.5c. Block & Region UX -- COMPLETE

- [x] Visual block type picker (icon grid grouped by category — Text, Media,
      Navigation, Data, Layout sections with Lucide icons per block type;
      replaces plain card list in add-block modal)
- [x] Hover quick-action bar on collapsed block cards (Edit | Duplicate |
      Move to Region | Remove — appears on hover, move opens region picker
      modal with colored indicators)
- [x] Inline block type icons on block cards (small Lucide icon next to type
      badge, mapped from block type `icon` field)
- [x] Move-to-region modal (select target region from list, color-coded
      region indicators, only shown when page has multiple regions)
- [ ] Region mini-wireframe at top of editor (deferred — simple diagram
      showing where hero/content/sidebar/bottom appear on the page)

### 4.5d. Media & Preview Polish -- COMPLETE

- [x] Alt text reminder (yellow warning + dot on media fields/grid items
      where alt text is empty — accessibility nudge with AlertTriangle icon)
- [x] Recent uploads tab in media picker (Recent/All tabs, recent shows
      last 12 uploads sorted by createdAt)
- [x] Device toggle in preview toolbar (Mobile 375px | Tablet 768px |
      Desktop full — Lucide Smartphone/Tablet/Monitor icons, animated
      iframe width transition)
- [x] Shareable preview link (copy button in preview toolbar copies
      tokenized preview URL to clipboard with toast feedback)
- [ ] Side-by-side vs stacked preview toggle (deferred — some editors
      prefer preview below rather than beside)

### 4.5e. Page List & Dashboard -- COMPLETE

- [x] Dashboard quick actions (New Page, Upload Media, View Site as
      prominent action cards with Lucide icons and hover effects)
- [x] Content type color coding on page list rows (colored left-border
      bar per content type — gold/blue/green for home/landing/secondary)
- [x] Recent pages linked to editor (dashboard page titles now clickable)
- [ ] Page list thumbnail column (deferred — hero image as tiny preview)
- [ ] Quick inline title edit on page list (deferred)

### Demo

Navigate the admin UI with keyboard shortcuts, see toast notifications,
use the visual block picker, check preview at mobile width, identify pages
missing alt text — everything feels snappy and intentional.

---

## Phase 5: Production Hardening

**Goal**: Make SpacelyCMS deployable for real. Everything needed to go from
"works on my laptop" to "running in production serving a real website."

### 5a. Production Infrastructure (do these first)

- [ ] Webhook system (configurable endpoints, fires on publish/unpublish/
      media upload — this is the glue that triggers Astro rebuilds)
- [ ] PostgreSQL support (Drizzle adapter swap, connection pooling, env-based
      database selection: `DATABASE_URL=postgres://...` vs SQLite default)
- [ ] S3-compatible media storage (Cloudflare R2, AWS S3, MinIO — pluggable
      storage backend selected via env var, local filesystem remains default)
- [ ] API keys (long-lived tokens for build pipelines and external services,
      separate from JWT user auth which expires in 24h)
- [ ] Environment/config hardening:
  - CORS configuration (allowed origins via env var)
  - Rate limiting on auth endpoints
  - CSRF protection for admin API
  - Secure cookie settings for production
  - Health check endpoint (`GET /api/health`)

### 5b. Security & Quality

- [ ] Security audit (OWASP top 10 pass: input sanitization review, SQL
      injection check, XSS prevention, auth bypass testing)
- [ ] Accessibility audit (WCAG AA: required alt text on media, heading
      order validation in rich text, ARIA landmarks in admin UI, color
      contrast check, keyboard navigation, screen reader testing)
- [ ] Audit logging (who changed what and when — stored in DB, viewable
      in admin, filterable by user/entity/action)
- [ ] Backup/restore system (database export + media archive, scheduled
      or on-demand, restore from backup via admin or CLI)

### 5c. Performance

- [ ] CDN integration (cache-control headers on content API, cache
      invalidation on publish via webhook or API)
- [ ] Query caching (in-memory cache for content API responses, invalidated
      on write — reduces DB queries for repeated reads)
- [ ] Batch API (fetch multiple pages/blocks in one request to speed up
      Astro builds with many pages)

### Demo

Deploy SpacelyCMS with PostgreSQL on a cloud server, media on R2, Astro
site on Cloudflare Pages. Publish a page in the admin, webhook triggers
rebuild, site updates automatically.

---

## Phase 6: Packaging & Developer Experience

**Goal**: Make SpacelyCMS installable and usable by someone who isn't us.
A developer should go from zero to running CMS in under 5 minutes.

### 6a. npm Publishing

- [ ] Publish `@spacelycms/server` to npm (the CMS server as a package)
- [ ] Publish `@spacelycms/astro` to npm (the Astro integration)
- [ ] Publish `spacelycms` CLI to npm (setup, migrate, seed, type-gen)
- [ ] Versioning strategy (semver, changelog, release automation)

### 6b. CLI & Scaffolding

- [ ] `npx create-spacely` — interactive project scaffolding:
  - Choose database (SQLite / PostgreSQL)
  - Choose media storage (local / S3 / R2)
  - Generate `.env`, `docker-compose.yml`, seed data
  - Option to include example Astro site
- [ ] `npx spacely types generate` — generate TypeScript types from CMS
      schemas (content types + block types → `.d.ts` file)
- [ ] `npx spacely migrate` — run migrations
- [ ] `npx spacely seed` — populate sample data
- [ ] `npx spacely export` / `npx spacely import` — CLI backup/restore

### 6c. Docker & Deployment

- [ ] Published Docker image (`docker pull spacelycms/server`)
- [ ] Docker Compose templates:
  - `docker-compose.dev.yml` (SQLite, local media, hot reload)
  - `docker-compose.prod.yml` (PostgreSQL, S3 media, Caddy reverse proxy)
- [ ] Deployment guides:
  - VPS with Docker (DigitalOcean, Hetzner)
  - Cloudflare Pages + cloud server
  - Railway / Render / Fly.io one-click deploy

### 6d. Starter Templates

- [ ] Blog starter (simple layout, rich_text + hero + image blocks)
- [ ] Documentation starter (sidebar nav, code blocks, search)
- [ ] Marketing site starter (landing pages, CTAs, testimonials)
- [ ] College-site starter (current example, cleaned up and generalized)
- [ ] Each template includes: Astro project, block components, layouts,
      CSS, matching seed data, README with setup instructions

### 6e. Documentation Site

- [ ] Documentation site (built with Astro + Starlight or similar):
  - Getting Started (install → first page in 5 minutes)
  - Core Concepts (pages, blocks, regions, content types)
  - Content API reference (all endpoints, request/response examples)
  - Admin API reference
  - Astro integration guide (client, BlockRenderer, menus, images)
  - Block component authoring guide
  - Deployment guides (per platform)
  - Configuration reference (all env vars, settings)
  - Migration guide (from Drupal, WordPress, other CMS)
- [ ] Hosted at docs.spacelycms.com (or similar)

### Demo

Run `npx create-spacely my-blog`, choose blog template, `cd my-blog &&
docker compose up`, open browser — working CMS with admin UI and example
site in under 2 minutes.

---

## Phase 7: Content Features

**Goal**: Feature parity with established CMS tools. These are the features
that make teams choose SpacelyCMS over Strapi, Directus, or Storyblok.

### 7a. Search

- [ ] Pagefind integration for SSG sites (auto-indexes Astro build output,
      client-side search UI component)
- [ ] Meilisearch integration for SSR sites (server-side indexing, API
      endpoint for search queries)
- [ ] Admin search (full-text search across all pages and blocks in the
      admin UI)

### 7b. SEO & Meta

- [ ] SEO fields on pages (meta title, meta description, OG image, robots,
      canonical URL — editable in admin, available in content API)
- [ ] Sitemap generation (`/sitemap.xml` — auto-generated from published
      pages, configurable per content type)
- [ ] OG image generation (auto-generate social sharing images from page
      title + hero image)
- [ ] Structured data / JSON-LD helpers (article, breadcrumb, organization)

### 7c. Form Builder

- [ ] Form content type (define form fields in admin: text, email, textarea,
      select, checkbox, file upload)
- [ ] Form submission storage (submissions saved in DB, viewable in admin)
- [ ] Form submission notifications (webhook or email on new submission)
- [ ] Spam protection (honeypot field, rate limiting, optional reCAPTCHA)
- [ ] Astro form component (`<SpacelyForm>` renders form, handles submission)

### 7d. Multi-language (i18n)

- [ ] Locale support on pages (each page can have translations, linked by
      a translation group ID)
- [ ] Language switcher data in content API
- [ ] Default language configuration
- [ ] Astro helpers for locale-prefixed routes (`/en/about`, `/es/about`)
- [ ] Admin UI: language selector in page editor, translation status

### Demo

A multi-language site with search, SEO meta tags, sitemap, contact form —
all managed from the SpacelyCMS admin UI.

---

## Phase 8: Scale & Ecosystem

**Goal**: Features for larger teams and more complex deployments.

### 8a. Multi-site

- [ ] Multiple sites from one CMS instance (each site has its own pages,
      menus, media, config — shared block library optional)
- [ ] Site selector in admin UI
- [ ] Per-site API keys and webhooks
- [ ] Content sharing across sites (reference blocks from another site)

### 8b. Workflows & Collaboration

- [ ] Content workflows (configurable: draft → review → approved → published)
- [ ] Role-based workflow permissions (editors can submit, reviewers can
      approve, admins can publish)
- [ ] Email notifications (new content submitted, review requested,
      content approved/rejected)
- [ ] Comments/annotations on pages (internal editorial notes)
- [ ] Scheduled publishing automation (cron checks scheduledAt, auto-
      publishes and fires webhooks)

### 8c. Migration Tools

- [ ] Drupal importer (nodes → pages, paragraphs → blocks, menus, media,
      taxonomy terms — maps Drupal structure to SpacelyCMS)
- [ ] WordPress importer (posts/pages → pages, blocks → blocks, menus,
      media, categories/tags → taxonomies)
- [ ] Generic CSV/JSON import (map columns/fields to content types)
- [ ] Import preview (dry-run showing what will be created before committing)

### 8d. Extensibility

- [ ] Plugin system (register custom block types, API endpoints, admin
      UI panels, webhooks, media processors via JS modules)
- [ ] GraphQL API (alternative to REST, auto-generated from schema)
- [ ] Custom field types (register new field types with custom admin UI
      renderers and validation)

### Demo

Two sites running from one CMS instance. Content goes through an editorial
workflow. A Drupal site's content is migrated in. A custom plugin adds a
new block type.

---

## Timeline Summary

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Data + API | Complete |
| Phase 2 | Astro Integration | Complete |
| Phase 3 | Admin UI | Complete |
| Phase 4 | Visual Builder | Complete |
| Phase 4.5 | Admin UI Polish | Complete (a-e) |
| Phase 5 | Production Hardening | Not started |
| Phase 6 | Packaging & DX | Not started |
| Phase 7 | Content Features | Not started |
| Phase 8 | Scale & Ecosystem | Not started |

**Phases 1-4** = The engine (done)
**Phase 4.5** = Make it feel professional (UI/UX polish)
**Phase 5** = Make it deployable (production-ready)
**Phase 6** = Make it installable (other people can use it)
**Phase 7** = Make it competitive (feature parity with established CMS tools)
**Phase 8** = Make it scalable (teams, multi-site, migrations, plugins)

Recommended priority: **5a → 5b → 5c → 6 → 7 → 8**.
Phase 4.5 (all sub-phases) is complete. Next up is production hardening.

---

## What We're NOT Building (Scope Boundaries)

- **E-commerce** — No shopping carts, payments, inventory
- **User-facing accounts** — No frontend user registration/login (admin users only)
- **Email marketing** — No newsletters or bulk email (use Mailchimp, Resend, etc.)
- **Analytics** — No built-in analytics (use Plausible, Umami, etc.)
- **CDN/hosting** — SpacelyCMS is the CMS, not the host. Deploy Astro wherever you want.
- **Non-Astro frontends** — The API is standard REST/JSON so anything can consume it, but
  we only build and maintain first-class integration for Astro
