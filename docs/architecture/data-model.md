# SpacelyCMS — Data Model

## Overview

The data model has four layers:

1. **Schema Layer** — Defines what types of content exist (content types, block
   types, taxonomies)
2. **Content Layer** — Actual content instances (pages, blocks, terms, media)
3. **Composition Layer** — How content is assembled (page regions, menu trees)
4. **System Layer** — URLs, redirects, users, page revisions
5. **Operations Layer** — Webhooks, API keys, audit logs

---

## Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐
│ content_types │     │ block_types  │
│              │     │              │
│ id           │     │ id           │
│ name         │     │ name         │
│ slug         │     │ slug         │
│ description  │     │ description  │
│ fields_schema│     │ fields_schema│
│ regions      │     │ icon         │
│ settings     │     │ settings     │
└──────┬───────┘     └──────┬───────┘
       │                     │
       │ type_id             │ type_id
       ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ pages        │     │ blocks       │
│              │     │              │
│ id           │     │ id           │
│ type_id ─────┤     │ type_id ─────┤
│ title        │     │ title        │
│ slug         │     │ fields (JSON)│
│ status       │     │ is_reusable  │
│ fields (JSON)│     │ created_at   │
│ created_at   │     │ updated_at   │
│ updated_at   │     │ created_by   │
│ published_at │     └──────────────┘
│ created_by   │             │
└──────────────┘             │
       │                     │
       │ page_id      block_id │
       ▼                     ▼
┌──────────────────────────────┐
│ page_blocks (composition)    │
│                              │
│ id                           │
│ page_id ─────────────────────┤
│ block_id ────────────────────┤
│ region (string: "main",      │
│         "sidebar", "bottom") │
│ position (integer)           │
│ is_shared (boolean)          │
│ overrides (JSON, optional)   │
└──────────────────────────────┘

┌──────────────┐     ┌──────────────┐
│ taxonomies   │     │ terms        │
│              │     │              │
│ id           │     │ id           │
│ name         │     │ taxonomy_id ─┤
│ slug         │     │ parent_id    │
│ description  │     │ name         │
│ hierarchical │     │ slug         │
│ settings     │     │ weight       │
└──────────────┘     │ fields (JSON)│
                     └──────────────┘
                            │
┌──────────────┐            │
│ content_terms │◄───────────┘
│              │
│ entity_type  │ (page, block)
│ entity_id    │
│ term_id      │
└──────────────┘

┌──────────────┐
│ menus        │
│              │     ┌──────────────────┐
│ id           │     │ menu_items       │
│ name         │     │                  │
│ slug         │────►│ id               │
└──────────────┘     │ menu_id          │
                     │ parent_id (self) │
                     │ title            │
                     │ url (nullable)   │
                     │ page_id (nullable│
                     │ target           │
                     │ position         │
                     │ depth            │
                     │ is_expanded      │
                     │ attributes (JSON)│
                     └──────────────────┘

┌──────────────┐
│ media        │
│              │
│ id           │
│ filename     │
│ original_name│
│ mime_type    │
│ size         │
│ width        │
│ height       │
│ alt_text     │
│ title        │
│ folder       │
│ path         │
│ variants JSON│
│ metadata JSON│
│ created_at   │
│ created_by   │
└──────────────┘

┌──────────────┐     ┌──────────────┐
│ redirects    │     │ users        │
│              │     │              │
│ id           │     │ id           │
│ from_path    │     │ email        │
│ to_path      │     │ name         │
│ status_code  │     │ password_hash│
│ is_active    │     │ role         │
└──────────────┘     │ created_at   │
                     └──────────────┘

┌──────────────────┐
│ page_revisions   │
│                  │
│ id               │
│ page_id ─────────┤ → pages
│ title            │
│ slug             │
│ status           │
│ fields (JSON)    │
│ blocks (JSON)    │
│ created_at       │
│ created_by       │
└──────────────────┘

┌──────────────────┐
│ webhooks         │
│                  │
│ id               │
│ name             │
│ url              │
│ secret           │
│ events           │
│ is_active        │
│ last_triggered_at│
│ last_status      │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│ api_keys         │
│                  │
│ id               │
│ name             │
│ key_hash         │
│ key_prefix       │
│ permissions      │
│ expires_at       │
│ last_used_at     │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│ audit_logs       │
│                  │
│ id               │
│ user_id          │
│ user_name        │
│ action           │
│ entity           │
│ entity_id        │
│ details          │
│ ip_address       │
│ created_at       │
└──────────────────┘
```

---

## Schema Layer Detail

### content_types

Defines the structure of a page type. Each content type specifies:

- **fields_schema**: JSON array of field definitions for page-level fields
  (fields that live on the page itself, not in blocks)
- **regions**: JSON array of named regions where blocks can be placed

```json
{
  "name": "Secondary Page",
  "slug": "secondary_page",
  "fields_schema": [],
  "regions": [
    { "name": "hero", "label": "Hero" },
    { "name": "content", "label": "Main Content", "allowed_types": ["*"] },
    { "name": "sidebar", "label": "Sidebar", "allowed_types": ["*"] },
    { "name": "bottom", "label": "Bottom Content", "allowed_types": ["*"] }
  ]
}
```

Note: Hero content is managed through hero blocks placed in the `hero` region,
not through page-level fields. This allows pages to have zero, one, or multiple
hero blocks, and hero content is fully composable like any other block.
```

### block_types

Defines the schema for a block type:

```json
{
  "name": "Contact List",
  "slug": "contact_list",
  "icon": "users",
  "fields_schema": [
    {
      "name": "heading",
      "type": "text",
      "required": true
    },
    {
      "name": "contacts",
      "type": "repeater",
      "fields": [
        { "name": "name", "type": "text", "required": true },
        { "name": "role", "type": "text" },
        { "name": "phone", "type": "text" },
        { "name": "email", "type": "email" }
      ]
    }
  ]
}
```

---

## Field Types

The schema system supports these field types:

| Type | Stored As | Description |
|---|---|---|
| `text` | string | Single-line text |
| `textarea` | string | Multi-line plain text |
| `richtext` | JSON (TipTap) | Rich text with formatting |
| `number` | number | Integer or decimal |
| `boolean` | boolean | True/false toggle |
| `date` | ISO string | Date or datetime |
| `email` | string | Email address (validated) |
| `url` | string | URL (validated) |
| `select` | string | Single choice from options |
| `multiselect` | string[] | Multiple choices from options |
| `media` | media_id (ref) | Reference to media library item |
| `page_ref` | page_id (ref) | Reference to another page |
| `term_ref` | term_id (ref) | Reference to a taxonomy term |
| `block_ref` | block_id (ref) | Reference to a reusable block |
| `repeater` | JSON array | Repeatable group of sub-fields |
| `json` | JSON | Arbitrary JSON data |
| `color` | string | Hex color value |
| `code` | string | Code block with language |

---

## Composition Model

### How Pages Reference Blocks

The `page_blocks` table is the join table that defines page composition:

```
Page "About CITE Program"
├── region: "content"
│   ├── position 0: block #101 (rich_text) — inline, page-specific
│   ├── position 1: block #102 (accordion) — inline, page-specific
│   └── position 2: block #103 (cta_button) — inline, page-specific
├── region: "sidebar"
│   ├── position 0: block #5 (location) — SHARED, reusable
│   └── position 1: block #8 (contact_list) — SHARED, reusable
└── region: "bottom"
    └── position 0: block #104 (rich_text) — inline, page-specific
```

- **Inline blocks** (`is_shared = false`): Created for this page, not reused
- **Shared blocks** (`is_shared = true`): Reference to a reusable block
  instance. Editing it changes all pages that reference it.

### The `overrides` Field

When referencing a shared block, a page can optionally override specific fields:

```json
{
  "page_id": 42,
  "block_id": 5,
  "region": "sidebar",
  "position": 0,
  "is_shared": true,
  "overrides": {
    "heading": "Our Campus Location"
  }
}
```

This allows a shared "Location" block to have a different heading on different
pages while keeping the address/phone synchronized.

---

## Menu Tree Model

Menu items form a tree using `parent_id` self-referencing:

```
Main Menu (slug: "main")
├── Admissions (url: null, is container)
│   ├── Apply Now (page_id: 15)
│   ├── Tuition & Fees (page_id: 22)
│   └── Financial Aid (url: null, is container)
│       ├── Scholarships (page_id: 31)
│       └── FAFSA (url: "https://fafsa.gov", external)
├── Academics (url: null, is container)
│   ├── Programs (page_id: 40)
│   └── ...
```

Menu items can:
- Link to an internal page (`page_id`)
- Link to an external URL (`url`)
- Be a non-linking container (`url: null, page_id: null`)
- Have extra attributes (CSS class, icon, mega-menu content)

---

## Indexing Strategy

### Required Indexes

```sql
-- Pages
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_type ON pages(type_id);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_type_status ON pages(type_id, status);

-- Page composition
CREATE INDEX idx_page_blocks_page ON page_blocks(page_id);
CREATE INDEX idx_page_blocks_block ON page_blocks(block_id);
CREATE INDEX idx_page_blocks_page_region ON page_blocks(page_id, region);

-- Blocks
CREATE INDEX idx_blocks_type ON blocks(type_id);
CREATE INDEX idx_blocks_reusable ON blocks(is_reusable);

-- Menu items
CREATE INDEX idx_menu_items_menu ON menu_items(menu_id);
CREATE INDEX idx_menu_items_parent ON menu_items(parent_id);

-- Terms
CREATE INDEX idx_terms_taxonomy ON terms(taxonomy_id);
CREATE INDEX idx_terms_parent ON terms(parent_id);
CREATE INDEX idx_terms_slug ON terms(taxonomy_id, slug);

-- Content-term associations
CREATE INDEX idx_content_terms_entity ON content_terms(entity_type, entity_id);
CREATE INDEX idx_content_terms_term ON content_terms(term_id);

-- Redirects
CREATE UNIQUE INDEX idx_redirects_from ON redirects(from_path);

-- Media
CREATE INDEX idx_media_mime ON media(mime_type);
CREATE INDEX idx_media_folder ON media(folder);

-- Page revisions
CREATE INDEX idx_revisions_page ON page_revisions(page_id);
```

---

## Migration Considerations

The data model is designed so that Drupal content can be mapped directly:

| Drupal Concept | SpacelyCMS Equivalent |
|---|---|
| Content Type | content_types |
| Node | pages |
| Paragraph Type | block_types |
| Paragraph | blocks |
| Paragraph reference field | page_blocks (with region) |
| Paragraphs Library Item | blocks (is_reusable = true) |
| from_library paragraph | page_blocks (is_shared = true) |
| Menu | menus |
| Menu Link | menu_items |
| Taxonomy Vocabulary | taxonomies |
| Taxonomy Term | terms |
| File / Media | media |
| Path Alias | pages.slug |
| Redirect | redirects |
| Node Revision | page_revisions |
| — | webhooks |
| — | api_keys |
| — | audit_logs |
