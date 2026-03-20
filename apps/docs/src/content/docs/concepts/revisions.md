---
title: Revisions
description: Page revision history and restore in WollyCMS.
---

WollyCMS automatically saves a revision every time a page is saved. This gives you a complete history of changes with the ability to restore any previous version.

## How revisions work

Every time you click **Save** in the page editor, WollyCMS:

1. Stores a snapshot of the current page state (all fields, blocks, regions)
2. Records who made the change and when
3. Optionally stores the save note if one was provided

No manual "create revision" step — it happens automatically on every save.

## Viewing revision history

In the page editor sidebar, expand the **Revisions** section to see the history. Each entry shows:

- **Timestamp** — When the revision was created
- **Author** — Who saved the change
- **Save note** — Optional description (entered in the "Save note" field before saving)

## Restoring a revision

Click on any revision to preview it, then click **Restore** to revert the page to that state. Restoring creates a new revision — so you can always undo a restore.

:::note
Restoring a revision replaces the current page content with the revision's content. All blocks, fields, and region assignments are reverted. The page status (published/draft) is not changed.
:::

## Save notes

The page editor includes an optional "Save note" field next to the Save button. Use it to describe what changed:

- "Updated hero heading for spring campaign"
- "Added new FAQ items"
- "Fixed typo in pricing section"

Save notes make the revision history much more useful when you need to find a specific change.

## Best practices

:::tip
Get in the habit of writing save notes for significant changes. "Updated content" is less useful than "Replaced team photo with 2026 group shot."
:::

- Use save notes for meaningful changes — skip them for typo fixes
- Check revision history before restoring to make sure you're picking the right version
- Remember that restoring is non-destructive — the current state becomes a revision too
