# SEO Editor Tools

## Overview

WollyCMS provides real-time SEO feedback in the page editor sidebar to help
content editors optimize pages for search engines and social sharing. These
tools complement the existing SEO fields (meta title, description, OG image,
canonical URL, robots) with visual previews and automated scoring.

## Features

### 1. Google SERP Preview

Shows a realistic preview of how the page will appear in Google search results.

- **Title**: Uses meta title, falls back to page title, truncated at 60 chars
  with ellipsis
- **URL**: Displays the page slug in green breadcrumb-style format
- **Description**: Uses meta description, shows placeholder if missing,
  truncated at 160 chars

Updates in real-time as the editor types.

### 2. Social Share Preview

Shows a preview of the Open Graph card that appears when the page URL is
shared on social media (Facebook, LinkedIn, Slack, Discord, etc.).

- **Image**: Shows OG image if set, or a placeholder
- **Title**: Uses meta title or page title
- **Description**: Uses meta description
- **Domain**: Extracted from SITE_URL

Gives editors immediate visual feedback on their social sharing appearance.

### 3. SEO Score & Checklist

Automated checks that score the page's SEO readiness. Each check is pass/warn/fail
with a brief explanation. The overall score is shown as a color-coded badge.

**Checks performed:**

| Check | Pass | Warn | Fail |
|-------|------|------|------|
| Meta title length | 30-60 chars | 1-29 or 61-70 chars | Missing or >70 chars |
| Meta description length | 120-160 chars | 50-119 chars | Missing or <50 chars |
| Slug quality | Short, keyword-rich | Moderate length | >75 chars |
| Content length | >300 words | 100-300 words | <100 words |
| Heading presence | Has H2 headings | — | No headings |
| Image presence | Has images | — | — (info only) |
| Internal links | Has links | — | — (info only) |

Score is calculated as: `pass_count / total_checks * 100` (checks weighted
equally, info-only items excluded from score).

### 4. Meta Field Validation

Inline validation on the existing SEO fields in the sidebar:

- Title character count changes color at thresholds (green/amber/red)
- Description character count changes color at thresholds
- Visual truncation indicator when title or description exceeds display limits

## Architecture

### SEO Utility — `packages/admin/src/lib/seo.ts`

Pure functions for SEO analysis:

```typescript
interface SeoCheck {
  code: string;       // e.g., 'title-length', 'description-length'
  label: string;      // Human-readable label
  status: 'pass' | 'warn' | 'fail' | 'info';
  message: string;    // Explanation
}

function scorePage(pageData, pageRegions, regions): SeoCheck[]
```

Content analysis helpers:
- `countWords(regions)` — counts words across all richtext fields
- `hasHeadings(regions)` — checks for H2/H3/H4 presence
- `hasImages(regions)` — checks for media fields and inline images
- `hasLinks(regions)` — checks for link marks in richtext

### Components

- **`SerpPreview.svelte`** — Google SERP mockup
- **`SocialPreview.svelte`** — OG card mockup
- **`SeoScorePanel.svelte`** — Checklist with score badge

All integrated into `PageEditorSidebar.svelte` within the existing
"SEO & Meta" card.

## Design Decisions

- **Inform, don't enforce** — scores and previews are advisory. Editors may
  have valid reasons to deviate from best practices.
- **Real-time** — all previews and scores update reactively via `$derived`.
- **No API changes** — purely client-side. SEO fields already exist in the
  schema and API.
- **Compact** — previews and score fit within the existing sidebar without
  adding clutter. Each section is collapsible.
