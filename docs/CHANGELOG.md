# Changelog

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
