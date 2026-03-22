---
title: Admin UI
description: Overview of the WollyCMS admin interface — theming, keyboard shortcuts, and customization.
---

The WollyCMS admin is a single-page application built with SvelteKit. It runs at `/admin` on your CMS domain (e.g., `https://cms.example.com/admin`).

## Theme

The admin supports three theme modes: **Light**, **Dark**, and **System** (follows your OS preference).

### Switching themes

Click the theme icon in the bottom-left of the sidebar to cycle between modes:
- Sun — Light mode
- Moon — Dark mode
- Monitor — System (auto-detects OS preference)

Your choice is saved in the browser and persists across sessions. There is no white flash on page load — the theme is applied before the page renders.

### CSS variables

The admin uses CSS custom properties for all colors. Both light and dark themes are defined in `packages/admin/src/app.css`. Key variables:

| Variable | Purpose |
|---|---|
| `--c-bg` | Page background |
| `--c-bg-subtle` | Subtle background (hover states, table headers) |
| `--c-surface` | Card, modal, and input backgrounds |
| `--c-text` | Primary text |
| `--c-text-light` | Secondary/muted text |
| `--c-border` | Borders and dividers |
| `--c-accent` | Primary accent (links, active states, focus rings) |
| `--c-danger` | Destructive actions |
| `--c-success` | Success states |
| `--c-warning` | Warning states |
| `--c-sidebar` | Sidebar background |

Custom block type editors and admin extensions should use these variables to automatically support both themes.

## Branding

The admin displays your site name in the sidebar header. Configure it in **System → Settings** under the "Admin Brand Name" field. The logo is the WollyCMS block composition icon by default.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Open global search |
| `Ctrl+S` | Save current page (in page editor) |
| `Ctrl+Shift+P` | Toggle preview panel (in page editor) |
| `?` | Show keyboard shortcuts overlay |
| `Esc` | Close overlay/modal |

## Global search

Press `Ctrl+K` from anywhere in the admin to open the global search. It searches across pages, blocks, media, and menus. Results are grouped by type.

## Dashboard

The dashboard shows:
- **Quick actions** — New Page, Upload Media, View Site (links to your `SITE_URL`)
- **Stats** — Total pages, published, drafts, shared blocks, media, menus, users
- **Recent pages** — Last updated pages with direct edit links

## Loading states

Pages show animated skeleton placeholders while data loads. The dashboard, pages list, and media grid all use shimmer skeletons instead of blank screens or spinner text.

## Sidebar navigation

The sidebar organizes admin features into sections:

- **Content** — Pages, Blocks, Media
- **Structure** — Menus, Taxonomies, Redirects
- **Schema** — Content Types, Block Types
- **System** — Users, Webhooks, API Keys, Tracking Scripts, Audit Log, Account, Settings

On narrow screens (< 1024px), the sidebar collapses to icon-only mode with hover tooltips.

## Page editor

The page editor is the core editing experience:

- **Title area** — Notion-style large title input with inline slug editor
- **Status pill** — Colored badge showing Published/Draft/Archived
- **Regions** — Color-coded content areas (Hero, Content, Sidebar, etc.)
- **Block cards** — Collapsible cards with type badges, position numbers, and quick actions
- **Preview panel** — Split-pane live preview with device size toggle (mobile/tablet/desktop)
- **SEO sidebar** — Meta title/description, OG image, canonical URL, robots, SERP preview, social preview, SEO score
- **Accessibility panel** — WCAG AA compliance checker
- **Revision history** — View and restore previous versions

### Block editing

- Click the **+** button on a region to add a block (visual type picker with icons)
- Hover a block card for quick actions (Edit, Duplicate, Move to Region, Remove)
- Drag blocks to reorder within or across regions
- Use `/` in the rich text editor for slash commands (headings, lists, tables, images)
