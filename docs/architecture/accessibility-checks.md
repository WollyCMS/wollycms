# Accessibility Content Checks (WCAG AA)

## Overview

WollyCMS includes real-time accessibility content checks that help editors
produce WCAG AA-compliant pages. These checks run client-side in the admin UI
as content is authored — providing immediate feedback without blocking saves.

## What Gets Checked

### 1. Heading Hierarchy

Headings must follow a logical order without skipping levels.

- The page title serves as the implicit H1
- First heading in content should be H2
- No level skipping (e.g., H2 → H4 without an H3 in between)
- Checks run across all regions and blocks on the page

**Severity:** Warning

### 2. Image Alt Text

All images must have descriptive alt text for screen readers.

- Media picker fields: checks if the linked media item has `altText` set
- Inline images in rich text: checks for non-empty `alt` attribute
- Shows count of images missing alt text

**Severity:** Warning (shown on media picker + audit panel)

### 3. Empty Link Text

Links must have visible text content for screen readers to announce.

- Detects `<a>` nodes in rich text with no text content inside
- Links with only whitespace are flagged

**Severity:** Warning

### 4. In-Page Heading Anchors

Heading anchors and same-page fragment links are checked together.

- Anchor IDs must start with a letter and contain only lowercase letters,
  numbers, and hyphens
- Anchor IDs must be unique within the CMS-managed page content
- TipTap links and block URL fields beginning with `#` should match a heading
  anchor in the same page
- Anchored headings render with `tabindex="-1"` so fragment navigation can move
  focus to the destination without adding headings to the normal Tab sequence
- The Astro `RichText` component applies configurable scroll margin and a
  visible focus indicator to anchored headings

**Severity:** Warning

The default anchor offset is `1rem`. Sites with sticky headers should set
`--wolly-anchor-offset` to at least the header height so focused destinations
are not obscured (WCAG 2.2 Success Criterion 2.4.11, Level AA).

Smooth scrolling is not enabled by WollyCMS. Sites that add it should honor
`prefers-reduced-motion`.

A “Back to top” link can help on unusually long pages, but WCAG 2.2 does not
require one for pages that use in-page links. It is a site/content design choice,
not part of the core heading-anchor feature. See W3C techniques
[G124](https://www.w3.org/WAI/WCAG22/Techniques/general/G124) and
[G1](https://www.w3.org/WAI/WCAG22/Techniques/general/G1).

## Architecture

### Audit Utility — `packages/admin/src/lib/a11y.ts`

Pure functions that accept page data and return an array of `A11yIssue` objects:

```typescript
interface A11yIssue {
  type: 'error' | 'warning';
  code: string;         // e.g., 'heading-skip', 'img-alt', 'link-empty'
  message: string;      // Human-readable description
  region?: string;      // Which region the issue is in
  blockPbId?: number;   // Which block (for click-to-navigate)
  field?: string;       // Which field within the block
}
```

Four check functions compose into `auditPageAccessibility()`:

- `checkHeadingHierarchy(regions)` — walks TipTap JSON across all blocks
- `checkImageAlt(regions, mediaCache)` — checks media fields + inline images
- `checkEmptyLinks(regions)` — checks link nodes in rich text
- `checkHeadingAnchors(regions)` — checks anchor syntax, uniqueness, and
  same-page targets

### Accessibility Panel — `AccessibilityPanel.svelte`

Collapsible card in the page editor sidebar showing:

- Issue count badge (color-coded: green = 0, amber = warnings)
- Grouped issues by type
- Click-to-navigate: clicking an issue expands the relevant block

### Integration Points

- **Page editor sidebar**: Panel always visible, updates reactively
- **Pre-save toast**: Warning toast when saving with open issues
- **RichTextEditor**: Inline heading-skip indicator below toolbar

## Design Decisions

- **Warn, don't block** — issues are advisory, not gates. Editors may have
  valid reasons to deviate (e.g., decorative images, heading used for styling).
- **Client-side only** — no server-side enforcement. The API accepts content
  regardless of accessibility status.
- **Cross-region awareness** — heading hierarchy is checked across the full
  page, not per-block, since the rendered page concatenates all regions.
- **Real-time** — checks run on every content change via Svelte `$derived`,
  not just on save.
