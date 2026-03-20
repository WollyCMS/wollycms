---
title: Preview
description: Preview pages before publishing with WollyCMS.
---

WollyCMS includes a live preview system that lets editors see how their changes will look on the actual Astro frontend before publishing.

## How preview works

From the page editor, click the **Preview** button in the toolbar. This opens your Astro frontend in a preview mode that renders the current draft content — including unpublished changes.

The preview system works by:
1. The admin UI sends the current page data (including unsaved edits) to the preview endpoint
2. Your Astro frontend renders the page using the draft content instead of the published version
3. The preview opens in a new tab or iframe with a special preview token

## Preview modes

The page builder supports three viewport modes for previewing responsive layouts:

- **Desktop** — Full-width preview
- **Tablet** — Medium viewport
- **Mobile** — Narrow viewport

## Shareable preview links

Generate a preview link to share with stakeholders who need to review content before it goes live. Preview links are time-limited and don't require admin access.

## Setting up preview in Astro

Your Astro frontend needs to handle preview requests. The `@wollycms/astro` package provides helpers:

```astro
---
// src/pages/preview/[...slug].astro
import { getWolly } from '../../lib/wolly';
import * as blocks from '../../lib/blocks';
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import Layout from '../../layouts/Default.astro';

const token = Astro.url.searchParams.get('token');
const slug = Astro.params.slug || 'home';

// Fetch draft content using preview token
const wolly = getWolly();
const page = await wolly.pages.preview(slug, token);
---

<Layout title={page.title}>
  <BlockRenderer blocks={page.regions.content ?? []} components={blocks} />
</Layout>
```

:::tip
Configure your CMS's `SITE_URL` environment variable to point to your frontend. The preview button uses this URL to construct the preview link.
:::
