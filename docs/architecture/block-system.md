# WollyCMS — Block Composition System

## Core Concept

The block system is the heart of WollyCMS. It provides composable, reusable
content building blocks that can be assembled into pages through named regions.

This is inspired by:
- **Drupal Paragraphs** — typed, fieldable content blocks attached to pages
- **Drupal Paragraph Library** — shared/reusable paragraph instances
- **Storyblok Components** — nested, composable content components
- **WordPress Gutenberg** — block-based editing (but with structured data, not HTML)

---

## Block Lifecycle

### 1. Developer Defines Block Types

A block type is a schema — it defines what fields a block has:

```json
{
  "name": "Accordion",
  "slug": "accordion",
  "icon": "chevrons-down",
  "category": "Text",
  "description": "Expandable content sections with title/body pairs",
  "fields_schema": [
    {
      "name": "heading",
      "label": "Section Heading",
      "type": "text",
      "required": false
    },
    {
      "name": "items",
      "label": "Accordion Items",
      "type": "repeater",
      "min": 1,
      "max": 50,
      "fields": [
        {
          "name": "title",
          "label": "Tab Title",
          "type": "text",
          "required": true
        },
        {
          "name": "body",
          "label": "Tab Content",
          "type": "richtext",
          "required": true
        }
      ]
    },
    {
      "name": "default_open",
      "label": "First Item Open by Default",
      "type": "boolean",
      "default": false
    }
  ]
}
```

Block types can be created via:
- The admin UI (webmaster-friendly)
- Seed files in the project (developer version-controlled)
- The API (programmatic)

### 2. Content Editor Creates Block Instances

A block instance is actual content conforming to a block type schema:

```json
{
  "id": 42,
  "type_id": "accordion",
  "title": "Program Details FAQ",
  "is_reusable": false,
  "fields": {
    "heading": "Frequently Asked Questions",
    "items": [
      {
        "title": "What are the admission requirements?",
        "body": { "type": "doc", "content": [...] }
      },
      {
        "title": "How long is the program?",
        "body": { "type": "doc", "content": [...] }
      }
    ],
    "default_open": true
  }
}
```

### 3. Editor Places Blocks in Page Regions

The page editor shows available regions (defined by the content type). The editor
drags/adds blocks into regions and orders them:

```
Page: "Technology Resources"
Type: secondary_page (regions: content, sidebar, bottom)

content region:
  [0] Rich Text block — "About the Program..." (inline)
  [1] CTA Button block — "Learn More" (inline)
  [2] Accordion block — "Frequently Asked Questions" (inline)

sidebar region:
  [0] Location block — "Main Campus" (SHARED — reusable)
  [1] Contact List block — "Important Contacts" (SHARED — reusable)

bottom region:
  [0] Rich Text block — "Next Step / Ready to Start" (inline)
  [1] Rich Text block — "NSF Grant Notice" (inline)
```

### 4. Astro Renders Blocks as Components

Each block type maps to an Astro component:

```astro
---
// src/blocks/Accordion.astro
const { heading, items, default_open } = Astro.props.fields;
---

{heading && <h2>{heading}</h2>}
<div class="accordion">
  {items.map((item, i) => (
    <details open={default_open && i === 0}>
      <summary>{item.title}</summary>
      <div class="accordion-body">
        <RichText content={item.body} />
      </div>
    </details>
  ))}
</div>
```

---

## Reusable vs Inline Blocks

### Inline Blocks

- Created directly within a page
- Belong to that page only
- Deleting the page deletes the block
- Most blocks are inline

### Reusable (Shared) Blocks

- Created in the **Block Library** (standalone, not attached to a page)
- Marked `is_reusable: true`
- Can be referenced from any page via `page_blocks` with `is_shared: true`
- Editing the block updates ALL pages that reference it
- Cannot be deleted while referenced by pages
- Use case: sidebar widgets, contact info, location info, disclaimers

### Override System

When a page references a shared block, it can optionally override specific fields
for that page only:

```
Shared block "Main Campus Location" (id: 5)
  → fields.heading = "Campus Location"
  → fields.address = "123 College Ave..."

Page "Technology Resources" references block 5 with override:
  → overrides.heading = "Tech Center Location"
  → (address stays the same — inherited from shared block)

Page "Nursing Program" references block 5 with override:
  → overrides.heading = "Our Location"
  → (address stays the same — inherited from shared block)
```

The Astro integration merges overrides at render time:

```js
function resolveBlock(pageBlock) {
  const block = pageBlock.block;
  if (pageBlock.is_shared && pageBlock.overrides) {
    return {
      ...block,
      fields: { ...block.fields, ...pageBlock.overrides }
    };
  }
  return block;
}
```

---

## Standard Block Types (Shipped with WollyCMS)

These are the block types included by default. Sites can add custom types.

| Block Type | Slug | Category | Purpose | Shipped |
|---|---|---|---|---|
| Hero | `hero` | Layout | Hero banner with heading, image, CTA, multiple styles | Yes |
| Rich Text | `rich_text` | Text | Formatted text content (WYSIWYG) | Yes |
| Image | `image` | Media | Single image with caption and link | Yes |
| Video | `video` | Media | Embedded or uploaded video | Yes |
| Accordion | `accordion` | Text | Expandable content sections | Yes |
| CTA Button | `cta_button` | Navigation | Call-to-action button with link | Yes |
| Contact List | `contact_list` | Data | List of contact entries | Yes |
| Location | `location` | Data | Address, map, directions | Yes |
| Link List | `link_list` | Navigation | List of links (sidebar nav, resources) | Yes |
| Content Listing | `content_listing` | Data | Dynamic query: show N pages of type X | Yes |
| Embed | `embed` | Media | External embed (YouTube, iframe, etc.) | Yes |
| Gallery | `gallery` | — | Image gallery/grid | Planned |
| Tabs | `tabs` | — | Tabbed content sections | Planned |
| Card | `card` | — | Title + image + text + link | Planned |
| Card Grid | `card_grid` | — | Grid of card items | Planned |
| Code Block | `code_block` | — | Syntax-highlighted code | Planned |
| Alert/Notice | `alert` | — | Highlighted notice or warning | Planned |
| Divider | `divider` | — | Visual separator | Planned |
| Spacer | `spacer` | — | Vertical spacing | Planned |

---

## Content Listing Block (Dynamic Queries)

The `content_listing` block type is special — it doesn't contain static content.
Instead, it defines a query that the API resolves at request time:

```json
{
  "type": "content_listing",
  "fields": {
    "heading": "Latest News",
    "content_type": "article",
    "taxonomy_filter": {
      "vocabulary": "tags",
      "terms": ["news"]
    },
    "sort": "published_at:desc",
    "limit": 5,
    "display": "card_grid",
    "show_pagination": true,
    "link_to_listing_page": "/news"
  }
}
```

This replaces Drupal's Views system for the most common use cases:
- "Show latest 5 news articles"
- "Show all events in category X"
- "Show faculty in department Y sorted alphabetically"

---

## Block Type Discovery

The Astro integration discovers block components by convention:

```
src/
  blocks/
    RichText.astro         → handles "rich_text" blocks
    Accordion.astro        → handles "accordion" blocks
    ContactList.astro      → handles "contact_list" blocks
    Location.astro         → handles "location" blocks
    ContentListing.astro   → handles "content_listing" blocks
```

Or explicitly via config:

```js
// wolly.config.ts
export default {
  blocks: {
    'rich_text': './src/blocks/RichText.astro',
    'accordion': './src/blocks/Accordion.astro',
    'contact_list': './src/blocks/ContactList.astro',
    // Override or add custom mappings
    'custom_hero': './src/blocks/CustomHero.astro',
  }
}
```

If a block type has no matching component, the BlockRenderer logs a warning and
renders a placeholder (in dev) or nothing (in production).
