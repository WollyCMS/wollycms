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

### 5a. Production Infrastructure -- COMPLETE

- [x] Webhook system (CRUD + test endpoint, HMAC-SHA256 signing, fires on
      page publish/unpublish/create/update/delete + media upload/delete,
      configurable per-event subscription, admin UI with status tracking)
- [x] API keys (long-lived `sk_` tokens with SHA256 hashing, permissions
      system, expiry dates, last-used tracking, admin UI with one-time
      key reveal, revocation)
- [x] Audit logging (all page/media/webhook/key mutations logged with
      user, action, entity, details, IP address; admin UI with filtering)
- [x] Environment/config hardening:
  - [x] CORS configuration (allowed origins via `CORS_ORIGINS` env var)
  - [x] Rate limiting on auth endpoints (configurable max/window via env)
  - [x] Rate limit headers (X-RateLimit-Limit/Remaining/Reset)
  - [x] Health check endpoint (`GET /api/health` with uptime + version)
  - [x] S3 env vars prepared (S3_ENDPOINT, S3_BUCKET, S3_REGION, etc.)
- [x] Batch content API (`POST /api/content/batch` — fetch multiple pages
      + menus in one request, max 50 pages per batch)
- [x] Cache-Control headers on content API (production: 60s max-age,
      10min s-maxage, 1hr stale-while-revalidate)
- [x] Admin UI pages for webhooks, API keys, audit logs with sidebar nav
- [x] PostgreSQL support (dual-dialect Drizzle schemas, auto-detection
      via DATABASE_URL, PG migrations, async query compatibility)
- [x] S3-compatible media storage (pluggable storage backend — local
      filesystem for dev, Cloudflare R2 recommended for production;
      @aws-sdk/client-s3 for S3-compatible uploads/deletes)

### 5b. Security & Quality -- COMPLETE

- [x] Audit logging (moved to 5a — fully implemented with admin UI)
- [x] Security hardening:
  - [x] All DB queries use Drizzle parameterized queries (no raw SQL injection)
  - [x] LIKE wildcard escaping on search inputs
  - [x] Path traversal protection on file serving (`..` and leading `/` blocked)
  - [x] Media filenames use randomUUID (no user-controlled paths)
  - [x] All API inputs validated with Zod schemas
  - [x] Webhook secrets masked in API responses
  - [x] API keys hashed (SHA256), only prefix shown after creation
  - [x] JWT auth on all admin endpoints, rate limiting on login
  - [x] MIME type allowlist for media uploads (blocks executables)
  - [x] 50MB max upload size validation
  - [x] Webhook error message sanitization (no internal details leaked)
- [x] Accessibility improvements (WCAG AA):
  - [x] Skip-to-content link for keyboard navigation
  - [x] ARIA landmarks (nav, main, aside with labels)
  - [x] `aria-current="page"` on active nav items
  - [x] `aria-modal`, `aria-labelledby` on dialog modals
  - [x] `aria-label` on icon-only close buttons
  - [x] `:focus-visible` outlines on all interactive elements
  - [x] Improved color contrast (`--c-text-light` adjusted for WCAG AA)
  - [x] Alt text warnings in media picker (Phase 4.5d)
- [x] Backup/restore (export/import endpoints from Phase 3)

### 5c. Performance -- COMPLETE

- [x] Cache-Control headers on content API (moved to 5a)
- [x] Batch API (moved to 5a — `POST /api/content/batch`)
- [x] Query caching (in-memory TTL cache for content API pages/menus,
      auto-invalidated on admin writes to pages, blocks, page-blocks, menus;
      cache stats in health endpoint)
- [x] ETag support on content API (304 Not Modified for conditional requests)
- [ ] CDN integration (deferred — cache invalidation on publish via webhook
      already possible using webhook system)

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

### 6b. CLI & Scaffolding -- PARTIAL

- [x] `npx create-spacely` — interactive project scaffolding (creates
      package.json, .env, .gitignore, docker-compose, README, installs deps)
- [x] `spacely types generate` — generate TypeScript types from CMS schemas
      (content types + block types → `.d.ts` file with interfaces, unions)
- [x] `spacely migrate` — run migrations
- [x] `spacely seed` — populate sample data
- [x] `spacely start` — start production server
- [x] `spacely export` — export all data as JSON
- [x] `spacely import <file>` — import data from JSON backup
- [x] `spacely health` — check server health

### 6c. Docker & Deployment -- PARTIAL

- [ ] Published Docker image (`docker pull spacelycms/server`)
- [x] Docker Compose dev template (`docker-compose.dev.yml`)
- [x] Docker Compose prod template (`docker-compose.prod.yml` with Caddy
      reverse proxy, auto-HTTPS, security headers, health check)
- [x] Caddyfile with security headers, gzip, static asset caching
- [ ] Deployment guides

### 6x. Build Pipeline -- COMPLETE

- [x] TypeScript build with zero errors (`tsc` with `rewriteRelativeImportExtensions`)
- [x] Hono JWT payload type declarations (ContextVariableMap)
- [x] Fixed all pre-existing TS type errors (payload unknown, Zod/Drizzle casts)
- [x] `npm run build` builds server + admin
- [x] `bin` entry point for CLI in package.json

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

### 7a. Search -- PARTIAL

- [ ] Pagefind integration for SSG sites (auto-indexes Astro build output,
      client-side search UI component)
- [x] Content API search (`GET /api/content/search?q=` — search published
      pages by title/slug, type filter, cached, Astro client method)
- [x] Admin search (global search across pages, blocks, media, menus;
      Ctrl+K shortcut, debounced dropdown with grouped results)

### 7b. SEO & Meta -- COMPLETE

- [x] SEO fields on pages (meta title, meta description, OG image, robots,
      canonical URL — editable in admin sidebar, available in content API
      as `seo` object with character count hints)
- [x] Sitemap generation (`/sitemap.xml` — auto-generated from published
      pages, excludes noindex pages, cached, invalidated on mutations)
- [x] Structured data / JSON-LD helpers in @spacelycms/astro:
      articleJsonLd, webPageJsonLd, breadcrumbJsonLd, organizationJsonLd,
      getPageSeo, jsonLdScript
- [ ] OG image generation (deferred — auto-generate social sharing images
      from page title + hero image)

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
- [x] Scheduled publishing automation (60s interval checks scheduledAt,
      auto-publishes draft pages, fires webhooks, invalidates cache)

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
| Phase 5 | Production Hardening | Complete (5a-5c) |
| Phase 6 | Packaging & DX | In progress (build, CLI, Docker dev) |
| Phase 7 | Content Features | In progress (SEO, search, JSON-LD) |
| Phase 8 | Scale & Ecosystem | Partial (scheduled publishing) |

**Phases 1-4** = The engine (done)
**Phase 4.5** = Make it feel professional (UI/UX polish)
**Phase 5** = Make it deployable (production-ready)
**Phase 6** = Make it installable (other people can use it)
**Phase 7** = Make it competitive (feature parity with established CMS tools)
**Phase 8** = Make it scalable (teams, multi-site, migrations, plugins)

Recommended priority: **6 → 7 → 8**.
Phases 1-5 complete. PostgreSQL support complete (dual SQLite/PG with
auto-detection). S3-compatible media storage complete (Cloudflare R2
recommended — zero egress, global CDN). Recommended production
architecture: Cloudflare Tunnel + R2 + Cloudflare Pages. Next:
packaging for distribution.

---

## What We're NOT Building (Scope Boundaries)

- **E-commerce** — No shopping carts, payments, inventory
- **User-facing accounts** — No frontend user registration/login (admin users only)
- **Email marketing** — No newsletters or bulk email (use Mailchimp, Resend, etc.)
- **Analytics** — No built-in analytics (use Plausible, Umami, etc.)
- **CDN/hosting** — SpacelyCMS is the CMS, not the host. Deploy Astro wherever you want.
- **Non-Astro frontends** — The API is standard REST/JSON so anything can consume it, but
  we only build and maintain first-class integration for Astro
