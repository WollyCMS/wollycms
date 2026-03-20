---
title: Accessibility
description: Built-in accessibility checking in the WollyCMS admin.
---

WollyCMS includes a client-side accessibility checker that audits your pages in real-time as you edit. The results appear in the page editor sidebar.

## What it checks

### Heading hierarchy

The checker validates that heading levels don't skip — for example, jumping from H2 to H4 without an H3 in between. It also catches empty headings and headings that contain only whitespace.

The page title counts as an implicit H1, so the first heading in your content should be H2.

### Image alt text

Two types of checks:

- **Media picker fields** — If a block has an image field referencing a media item, the checker verifies the media has alt text set in the media library.
- **Inline images in rich text** — Images embedded in TipTap rich text content are checked for their `alt` attribute.

### Empty links

Links in rich text content that have no visible text are flagged. This catches cases where a link wraps an empty span or whitespace-only content.

## The accessibility panel

The panel appears at the top of the page editor sidebar:

- **Green "Pass" badge** — No issues found
- **Yellow warning badge** — Shows the count of issues detected

Expanding the panel groups issues by type and lists each one with:
- A description of the problem
- Which region and block contains the issue
- A **click-to-navigate** button that scrolls directly to the problematic block

## When checks run

The audit runs reactively — every time you modify a block, add content, or change media references, the accessibility panel updates automatically. No manual "run check" step needed.

When you save a page that has accessibility warnings, you'll see a toast notification: "Page saved with N accessibility warnings."

## Tips

:::tip
Set alt text on images when you upload them to the media library, not after. The accessibility checker pulls alt text from the media record, so setting it once covers every page that uses that image.
:::

:::note
The current checker is client-side only. It runs in the admin as you edit — there's no server-side validation blocking publish. This is intentional: accessibility warnings inform editors without preventing urgent content updates.
:::
