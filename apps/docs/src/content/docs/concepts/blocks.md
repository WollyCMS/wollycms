---
title: Blocks & Regions
description: How blocks and regions compose page content in WollyCMS.
---

Blocks are the building units of page content. Instead of storing pages as a single blob of HTML, WollyCMS breaks content into **typed blocks** arranged in **named regions**.

## How blocks work

Each block has:

- A **block type** that defines its field schema (what data it holds)
- **Fields** — the actual content data matching that schema
- A **region** — where on the page it appears
- A **position** — its order within that region

When you fetch a page from the content API, blocks come pre-organized by region:

```json
{
  "data": {
    "title": "About Us",
    "regions": {
      "hero": [
        { "id": "pb_1", "block_type": "hero", "fields": { "heading": "About Us", "image": 42 } }
      ],
      "content": [
        { "id": "pb_2", "block_type": "rich_text", "fields": { "body": { "type": "doc", "content": [] } } },
        { "id": "pb_3", "block_type": "image", "fields": { "media_id": 15, "caption": "Our team" } }
      ]
    }
  }
}
```

## Block types

A block type is the schema definition for a category of blocks. Create them via the admin API:

```bash
curl -X POST http://localhost:4321/api/admin/block-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hero",
    "slug": "hero",
    "description": "Full-width hero section with heading and background image",
    "category": "Layout",
    "fieldsSchema": [
      { "name": "heading", "label": "Heading", "type": "text", "required": true },
      { "name": "description", "label": "Description", "type": "textarea" },
      { "name": "image", "label": "Background Image", "type": "media" },
      { "name": "cta_text", "label": "CTA Button Text", "type": "text" },
      { "name": "cta_url", "label": "CTA Button URL", "type": "url" }
    ],
    "icon": "layout"
  }'
```

### Common block types

| Block Type | Slug | Typical Fields |
|---|---|---|
| Hero | `hero` | heading, description, image, cta_text, cta_url |
| Rich Text | `rich_text` | body (richtext) |
| Image | `image` | media_id, caption, alt_text |
| Call to Action | `cta` | heading, body, button_text, button_url |
| Testimonial | `testimonial` | quote, author, role, avatar |
| Code Block | `code_block` | code, language, title |
| Feature Grid | `feature_grid` | features (group array) |

## Regions

Regions are named areas defined in the content type. A marketing page might have `hero`, `content`, and `cta` regions, while a blog post might have `content` and `sidebar`.

Regions can restrict which block types are allowed:

```json
{
  "regions": [
    { "name": "hero", "label": "Hero", "allowed_types": ["hero"] },
    { "name": "content", "label": "Main Content", "allowed_types": null },
    { "name": "sidebar", "label": "Sidebar", "allowed_types": ["rich_text", "cta"] }
  ]
}
```

## Default blocks

Content types can define blocks that are automatically created when a new page is made. For example, a "Secondary Page" content type might default to a hero block, a rich text block in the content region, and a navigation submenu in the sidebar.

Default blocks are configured on the content type via the `defaultBlocks` field. See [Pages & Content Types](/concepts/pages/#default-blocks) for the full guide.

## Shared (reusable) blocks

Blocks can be marked as **reusable**. A shared block lives in the block library and can be placed on multiple pages. When you update the shared block, the change propagates everywhere it's used.

Shared blocks also support **per-page overrides** — you can customize specific fields on a page without affecting the base block.

In the API response, shared blocks include extra fields:

```json
{
  "id": "pb_5",
  "block_type": "cta",
  "is_shared": true,
  "block_id": 12,
  "fields": { "heading": "Sign Up Today", "button_url": "/signup" }
}
```

:::tip
Use shared blocks for content that appears on many pages — CTAs, newsletter signups, footer banners. Edit once, update everywhere.
:::

## Rendering blocks in Astro

The `BlockRenderer` component maps each block to an Astro component based on its `block_type` slug:

```astro
---
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import * as blocks from '../lib/blocks';

const page = await wolly.pages.getBySlug('about');
---

<BlockRenderer
  blocks={page.regions.hero ?? []}
  region="hero"
  components={blocks}
/>
```

Each block component receives these props:

| Prop | Type | Description |
|---|---|---|
| `fields` | `Record<string, unknown>` | The block's field data |
| `block` | `{ id, type, title?, is_shared? }` | Block metadata |
| `region` | `string` | Which region this block is in |
| `position` | `number` | Zero-based position within the region |

See [BlockRenderer](/astro/block-renderer/) for the full guide.
