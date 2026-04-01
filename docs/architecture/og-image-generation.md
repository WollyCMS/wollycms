# OG Image Auto-Generation

## Overview

Auto-generate 1200×630 PNG Open Graph images for pages that don't have one
manually set. Supports both on-publish generation and bulk backfill for
existing pages.

## Current State

- `pages.ogImage` field already exists (text, nullable) in both SQLite and PG schemas
- Dynamic OG endpoint exists at `GET /api/content/og/:slug` — generates SVG,
  converts to PNG via Sharp, caches in memory for 1 hour
- If a page has `ogImage` set, the endpoint 302-redirects to it
- Current template: burgundy gradient with gold accent, title + description
- Admin UI has a plain text input for OG image URL in PageEditorSidebar

### Cloudflare Workers limitation

PNG generation depends on Sharp (native image processing), which is not available
on Cloudflare Workers. On Workers:

- **Auto-generate on publish**: silently skips (best-effort, no error)
- **`GET /api/content/og/:slug`**: returns an SVG fallback instead of PNG
- **Admin "Generate OG Image" button**: returns 503 "Image generation unavailable"
- **CLI `wolly og:generate`**: works only when running on Node.js (not Workers)

To get OG images on a Workers deployment, either generate them offline on a
Node.js machine (`wolly og:generate`), use an external OG image service, or
set custom OG image URLs manually in the admin UI.

## Design

### Generation Flow

```
Page data (title, description, content type, hero image)
    ↓
Template selection (based on content type or default)
    ↓
SVG rendering (Satori — JSX to SVG with real fonts)
    ↓
Sharp (SVG → 1200×630 PNG)
    ↓
Upload via media storage backend (local/S3/R2)
    ↓
Create media record in DB
    ↓
Set page.ogImage to media URL
```

### Why Satori (replacing raw SVG)

The current raw SVG approach has limitations:
- No font metrics — text wrapping is a rough character-count estimate
- `system-ui` font family renders differently per OS/container
- Can't composite hero images into the OG image

Satori gives us:
- Real font loading (bundle 1-2 .woff2 files — e.g. Inter)
- Accurate text measurement and wrapping
- JSX-like layout (flexbox) for composing images + text
- Used by Vercel's `@vercel/og`, battle-tested

Dependencies: `satori` + `@resvg/resvg-js` (SVG→PNG without Sharp's SVG
quirks) or keep Sharp for the final conversion.

### Templates

Start with one default template. Template receives a data object:

```typescript
interface OgTemplateData {
  title: string;
  description?: string;
  siteName: string;
  contentType?: string;       // e.g. "blog", "landing"
  heroImageUrl?: string;      // if page has a hero block with an image
  accentColor?: string;       // from content type config, optional
}
```

**Default template**: Clean, modern card layout:
- Site name (small, top-left)
- Page title (large, bold, auto-wrapped)
- Description (smaller, below title, 2 lines max)
- Accent bar or color from content type
- Optional: hero image as background with dark overlay

Future: allow custom templates per content type via admin settings.

### Trigger Points

#### 1. On Publish (automatic)

In the admin pages PUT handler, when a page transitions to `published` and
has no `ogImage` set:

```
PUT /api/admin/pages/:id  (status → published, ogImage is null)
    → generate OG image
    → upload to media storage
    → create media record
    → set page.ogImage = media URL
    → include in API response
```

Skip generation if:
- Page already has an `ogImage` set (manual override)
- Page is not being published (draft/archived)
- Sharp is unavailable (Workers — use dynamic endpoint as fallback)

#### 2. Admin API Endpoint (on-demand)

```
POST /api/admin/pages/:id/og-image
  → generates (or regenerates) OG image
  → returns { ogImage: "https://..." }

POST /api/admin/og-images/generate
  Body: { scope: "missing" | "all", contentType?: string }
  → bulk generates for matching pages
  → returns { generated: number, skipped: number, errors: string[] }
```

#### 3. CLI Command (bulk backfill)

```bash
wolly og:generate                    # all pages missing OG images
wolly og:generate --force            # regenerate all, even existing
wolly og:generate --type=blog        # only blog content type
wolly og:generate --dry-run          # show what would be generated
```

Processing: batch 10 pages at a time, log progress, continue on individual
failures.

### Storage

Generated OG images go through the existing media system:
- Stored via the configured storage backend (local/S3/R2)
- Media record created with folder `og-images`, title `OG: {page title}`
- Filename: `og-{slug}-{short-hash}.png` (hash prevents caching stale images)
- `page.ogImage` set to the media URL (relative for local, absolute for S3/R2)

### Admin UI Changes

**PageEditorSidebar** — replace the plain OG image text input with:
- Media picker button (choose from existing media)
- "Auto-generate" button (calls `POST /api/admin/pages/:id/og-image`)
- Preview thumbnail of current OG image
- "Remove" button to clear and fall back to dynamic generation

**Settings page** (future):
- "Generate Missing OG Images" bulk action button
- Progress indicator

### Dynamic Endpoint (fallback)

Keep the existing `GET /api/content/og/:slug` endpoint as a fallback for:
- Pages that haven't had OG images generated yet
- Workers environment where Sharp isn't available
- Development/preview where persisted images aren't needed

The Astro integration's `getPageSeo()` helper should prefer the persisted
`ogImage` URL, falling back to `/api/content/og/{slug}` if null.

## Implementation Plan

### Step 1: Satori + Template Engine
- Add `satori` and a .woff2 font file (Inter or similar)
- Create `packages/server/src/og/template.ts` — default template function
- Create `packages/server/src/og/generate.ts` — orchestrates: template → SVG → PNG → upload
- Unit test: generate OG image from mock page data, verify 1200×630 PNG output

### Step 2: Admin API Endpoints
- `POST /api/admin/pages/:id/og-image` — single page generation
- `POST /api/admin/og-images/generate` — bulk generation
- Wire into existing auth/audit middleware
- Test: generate OG image via API, verify media record created, page updated

### Step 3: On-Publish Hook
- In `PUT /api/admin/pages/:id`, when status becomes `published` and
  `ogImage` is null, auto-generate
- Skip if Sharp unavailable (Workers)
- Test: publish page without OG image, verify one is generated

### Step 4: CLI Command
- Add `og:generate` to `cli.ts`
- Support `--force`, `--type`, `--dry-run` flags
- Batch processing with progress logging
- Test: run against seeded DB, verify images generated

### Step 5: Admin UI
- Replace OG image text input with media picker + auto-generate button
- Show preview thumbnail
- Add bulk generate button to settings page (stretch)

### Step 6: Update Dynamic Endpoint
- Update `GET /api/content/og/:slug` template to match the Satori template
  style (visual consistency between persisted and dynamic)
- Or: simplify it to just redirect to generated image / return 404

## Files to Create/Modify

### New Files
- `packages/server/src/og/generate.ts` — generation orchestration
- `packages/server/src/og/template.ts` — Satori template
- `packages/server/src/og/fonts/` — bundled .woff2 font file(s)
- `packages/server/tests/og.test.ts` — tests

### Modified Files
- `packages/server/src/api/admin/pages.ts` — on-publish hook
- `packages/server/src/api/admin/index.ts` — mount new OG endpoints
- `packages/server/src/cli.ts` — add og:generate command
- `packages/server/src/api/content/og-image.ts` — update or simplify
- `packages/admin/src/lib/components/PageEditorSidebar.svelte` — UI changes
- `packages/server/package.json` — add satori dependency

## Format

PNG only. 1200×630px. WebP is not reliably supported by Facebook/LinkedIn
for OG images. PNG is the universal standard.

## Workers Compatibility

Satori works on Workers (it's pure JS). The bottleneck is SVG→PNG conversion:
- Node.js: Sharp (already used)
- Workers: `@resvg/resvg-wasm` (WASM-based SVG→PNG, runs on Workers)
- Could conditionally load resvg-wasm on Workers, Sharp on Node

For v1, target Node.js only (Sharp). Workers falls back to the dynamic
SVG endpoint. WASM support can be added later.
