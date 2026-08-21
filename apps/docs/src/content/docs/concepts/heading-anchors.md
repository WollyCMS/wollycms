---
title: Heading Anchors
description: Create accessible links that jump to a heading elsewhere on the same page.
---

Heading anchors let an editor create a link or button near the top of a page
that jumps directly to a heading farther down the same page.

## Add an anchor to a heading

1. Open the page in WollyCMS.
2. Click inside the heading that should be the destination. The text must use a
   heading format such as H2 or H3, not a regular paragraph.
3. Find the **Heading anchor** toolbar below the rich-text formatting toolbar.
4. Click **Use heading text** to generate the anchor, or enter a custom value.

For a heading named **Student Stories**, WollyCMS generates:

```text
student-stories
```

Anchor names must start with a letter. Use lowercase letters, numbers, and
hyphens only. WollyCMS limits anchor names to 80 characters.

## Link to the anchor

The link value is the anchor name with `#` added at the beginning:

```text
#student-stories
```

### From linked text

1. Select the text that visitors will click.
2. Click the link button in the rich-text toolbar.
3. Enter `#student-stories` in the **URL** field.
4. Apply the link.

### From a button or URL field

Enter `#student-stories` in the button, CTA, or other URL field.

The destination and link must match exactly:

| Location | Value |
|---|---|
| Heading anchor | `student-stories` |
| Link or button URL | `#student-stories` |

## Save and test

1. Save or publish the page.
2. Open the public page.
3. Activate the link with a mouse and with the keyboard.
4. Confirm that the page moves to the correct heading and that a sticky header
   does not cover the destination.

## Accessibility checks

The page accessibility panel warns about:

- Invalid anchor names
- Duplicate anchor names on the same page
- Same-page links that do not match a CMS heading anchor

Anchored headings receive programmatic focus without entering the normal Tab
sequence. The built-in Astro renderer also provides a visible focus indicator
and configurable clearance for sticky headers.

A **Back to top** link can be helpful on a particularly long page, but WCAG 2.2
does not require one merely because a page contains anchor links.

## Frontend requirement

The site must use a version of the `@wollycms/astro` rich-text renderer that
supports heading anchors. Sites with a sticky header should set the anchor
offset to at least the header height:

```css
:root {
  --wolly-anchor-offset: 7rem;
}
```

WollyCMS uses native fragment navigation and does not force smooth scrolling.
If a site adds smooth scrolling, it should disable that motion when
`prefers-reduced-motion: reduce` is active.
