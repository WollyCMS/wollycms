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

Three check functions compose into `auditPageAccessibility()`:

- `checkHeadingHierarchy(regions)` — walks TipTap JSON across all blocks
- `checkImageAlt(regions, mediaCache)` — checks media fields + inline images
- `checkEmptyLinks(regions)` — checks link nodes in rich text

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
