# Changelog

## 2026-08-19

### Block drag-reorder jitter in the page editor

Reported by a site webmaster: dragging a block made the page jump, and the drop
indicator flickered without reliably showing where the block would land. Four causes,
all in `packages/admin/src/lib/components/BlockEditorRegion.svelte`:

- The `.drop-zone` indicator changed its own `margin` from `0` to `4px` when it went
  active, adding 8px of flow height and reflowing the list. That moved the hovered
  element out from under the pointer, which cancelled the hover, which removed the
  8px — a feedback loop. The indicator is now layout-neutral: constant `height` and
  `margin` in both states, with the bar and dot drawn by absolutely positioned
  pseudo-elements. `transition: all` was replaced with an explicit paint-only list so a
  future property addition cannot reintroduce animated geometry.
- Drop targets were the 4px gap strips only. `.block-card` had no `ondragover` and the
  region container gated its own behind `rBlocks.length === 0`, so across most of a
  drag nothing called `preventDefault()` — meaning "not a valid drop target" per spec,
  hence no indicator and a no-drop cursor. Hit-testing moved to `.region-blocks`, with
  the insertion index derived from which half of which card the pointer is over. The
  `.drop-zone` divs are now `pointer-events: none` visuals.
- `dragleave` on every 4px strip cleared the shared drop-target state unconditionally,
  so leaving one slot wiped the indicator that entering the next had just set. Clearing
  now happens only on the region container, only when that region owns the current
  indicator, and uses a bounds check rather than `relatedTarget` (unreliable mid-drag
  across browsers).
- The drag image was the `⠇` handle glyph, since `dragstart` is bound to the handle
  span. `setDragImage()` now uses the block card. The source card is still dimmed a
  frame later so the snapshot is taken at full opacity.

Also replaced the imperative `classList.add('is-dragging')` /
`document.querySelectorAll` sweep with reactive Svelte state, and extracted
`commitRegionReorder()` so drag and keyboard reordering share one persistence path.

### Keyboard block reordering

The drag handle had `role="button"` and `tabindex="0"` but no key handler — focusable
and inert, a WCAG 2.1.1 failure. Arrow Up/Down on a focused handle now moves the block
within its region, announces the move through an ARIA live region, and restores focus
to the handle after the DOM moves. Added to the `?` shortcuts overlay and the docs.

## 2026-08-13

### Accessible heading anchors

- Added editor-managed anchors to TipTap headings.
- Added same-page fragment support to rich-text links and block URL fields.
- Added accessibility warnings for invalid or duplicate anchors and links with
  missing targets.
- Updated the Astro rich-text renderer with focusable heading targets, visible
  focus styling, and configurable sticky-header clearance.
- Documented the editor workflow, frontend integration, WCAG considerations,
  and optional nature of “Back to top” links.

## 2026-03-07

### Security hardening sprint (batch 1)

- Removed preview token-in-URL flow for admin preview.
- Added `POST /api/admin/auth/preview-session` to mint a short-lived (`10m`) HttpOnly `wolly_preview` cookie.
- Updated preview auth to accept `Authorization` header or `wolly_preview` cookie; query-param tokens are rejected.
- Hardened upload safety by removing active web content types/extensions (`.svg`, `.html`, `.css`, `.js`, `.xml`) from upload allowlists.
- Added upload response hardening with CSP sandbox and forced attachment for non-inline-safe content types.
- Tightened RBAC:
  - `editor+` required for content mutation routes (`pages`, `blocks`, `menus`, `taxonomies`, `redirects`, `media`).
  - `admin` required for `webhooks` and `api-keys` routes.
- Added webhook outbound URL safety policy to block local/private/internal targets and non-HTTP(S) URLs.
- Sanitized request logging to omit query strings from logs.
- Added/updated server tests for preview session cookie, preview auth behavior, and RBAC restrictions.

### Performance sprint (batch 2)

- Optimized `/api/content/batch` to eliminate N+1 query patterns:
  - Block data is now fetched in one query for all requested page IDs.
  - Menu items are now fetched in one query for all requested menu IDs.
- Updated `/uploads/*` local file serving to stream files instead of reading whole files into memory.
- Reduced ETag overhead in content cache middleware by hashing only JSON responses and skipping large payloads.

### Accessibility and admin UX sprint (batch 3)

- Fixed admin base-path navigation bugs by switching hardcoded root links to `${base}`-aware links on dashboard and pages screens.
- Improved form accessibility by adding explicit `for`/`id` associations for user and media edit forms.
- Improved table interaction semantics on the pages list:
  - Sort control is now a button within the header cell.
  - Added `aria-sort` state for updated-date column.
  - Added `aria-label`s for selection checkboxes.
- Enhanced global search accessibility/keyboard support:
  - Added combobox ARIA wiring (`aria-expanded`, `aria-controls`, `aria-activedescendant`).
  - Added arrow-key navigation and Enter-to-open for search results.
  - Added active/selected visual + semantic state for result options.
