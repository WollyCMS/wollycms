---
title: BlockRenderer
description: How the BlockRenderer component maps CMS blocks to Astro components.
---

The `BlockRenderer` is the core component that turns CMS block data into rendered Astro components. It takes an array of blocks, looks up the matching component for each block type, and renders them in order.

## Basic usage

```astro
---
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import * as blocks from '../lib/blocks';

const page = await wolly.pages.getBySlug('home');
---

<BlockRenderer
  blocks={page.regions.hero ?? []}
  region="hero"
  components={blocks}
/>

<BlockRenderer
  blocks={page.regions.content ?? []}
  region="content"
  components={blocks}
/>
```

## Props

| Prop | Type | Description |
|---|---|---|
| `blocks` | `ResolvedBlock[]` | Array of blocks to render (from `page.regions.*`) |
| `region` | `string` | Name of the region being rendered |
| `components` | `Record<string, any>` | Object mapping block type slugs to Astro components |

## The blocks.ts mapping

Create `src/lib/blocks.ts` to map each block type slug to its component:

```typescript
export { default as hero } from '../blocks/Hero.astro';
export { default as rich_text } from '../blocks/RichText.astro';
export { default as image } from '../blocks/ImageBlock.astro';
export { default as cta } from '../blocks/CTA.astro';
export { default as testimonial } from '../blocks/Testimonial.astro';
export { default as code_block } from '../blocks/CodeBlock.astro';
```

The export name must match the block type slug. When `BlockRenderer` encounters a block with `block_type: "hero"`, it looks for `components.hero` in the mapping.

## Block component props

Each block component receives these props:

```typescript
interface BlockProps {
  fields: Record<string, unknown>;
  block: {
    id: string;
    type: string;
    title?: string;
    is_shared?: boolean;
  };
  region: string;
  position: number;
}
```

### Example: Hero component

```astro
---
// src/blocks/Hero.astro
const { fields, block, region, position } = Astro.props;

const heading = fields.heading as string;
const description = fields.description as string | undefined;
const ctaText = fields.cta_text as string | undefined;
const ctaUrl = fields.cta_url as string | undefined;
---

<section class="hero">
  <h1>{heading}</h1>
  {description && <p>{description}</p>}
  {ctaText && ctaUrl && (
    <a href={ctaUrl} class="btn">{ctaText}</a>
  )}
</section>
```

### Example: Rich Text component

```astro
---
// src/blocks/RichTextBlock.astro
import RichText from '@wollycms/astro/components/RichText.astro';

const { fields } = Astro.props;
---

<div class="prose">
  <RichText content={fields.body} />
</div>
```

The `RichText` component converts TipTap JSON to HTML, handling paragraphs, headings, lists, links, images, code blocks, tables, and text marks (bold, italic, underline, strikethrough, code).

## Unknown block types

If `BlockRenderer` encounters a block type that has no matching component in the mapping, it renders a fallback:

```html
<div class="wolly-block-unknown" data-type="missing_type">
  Unknown block type: missing_type
</div>
```

This makes it easy to spot unmapped block types during development.

:::tip
When adding a new block type in the admin, create the Astro component and add it to `blocks.ts` before content editors start using it. The `wolly-block-unknown` class is a quick way to find gaps.
:::

## Rendering multiple regions

A typical page layout renders several regions:

```astro
---
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import * as blocks from '../lib/blocks';

const page = await wolly.pages.getBySlug(Astro.params.slug || 'home');
---

<header>
  <BlockRenderer blocks={page.regions.hero ?? []} region="hero" components={blocks} />
</header>

<main>
  <BlockRenderer blocks={page.regions.content ?? []} region="content" components={blocks} />
</main>

<aside>
  <BlockRenderer blocks={page.regions.sidebar ?? []} region="sidebar" components={blocks} />
</aside>

<footer>
  <BlockRenderer blocks={page.regions.footer ?? []} region="footer" components={blocks} />
</footer>
```

## Using the region and position props

Block components receive `region` and `position`, which are useful for conditional styling:

```astro
---
const { fields, region, position } = Astro.props;
const isFirst = position === 0;
---

<section class:list={[
  'cta',
  { 'cta--sidebar': region === 'sidebar' },
  { 'cta--hero': region === 'hero' },
  { 'mt-0': isFirst },
]}>
  <h2>{fields.heading}</h2>
</section>
```
