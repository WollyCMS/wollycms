---
title: Block Type Recipes
description: Copy-paste JSON schemas and matching Astro components for common block types.
---

WollyCMS lets you create any block type with any field schema. These recipes give you the **JSON to paste directly into the Block Type editor** and a matching Astro component for your frontend.

To use a recipe:
1. Go to **Schema → Block Types → + New Block Type**
2. Enter the name, slug, and description
3. Paste the **Fields Schema JSON** below into the JSON editor
4. Save the block type
5. Copy the **Astro component** into your frontend project

---

## Code Block

Syntax-highlighted code snippets with optional filename and language.

**Name:** Code Block | **Slug:** `code` | **Icon:** `code`

### Fields Schema JSON

```json
[
  { "name": "language", "label": "Language", "type": "select", "settings": { "options": ["javascript", "typescript", "python", "bash", "html", "css", "json", "yaml", "sql", "go", "rust"] } },
  { "name": "filename", "label": "Filename", "type": "text" },
  { "name": "code", "label": "Code", "type": "textarea", "required": true }
]
```

### Astro component

```astro
---
// src/components/blocks/CodeBlock.astro
const { fields } = Astro.props;
const { language, filename, code } = fields;
---
<div class="code-block">
  {filename && <div class="code-filename">{filename}</div>}
  <pre><code class={language ? `language-${language}` : ''}>{code}</code></pre>
</div>

<style>
  .code-block { border-radius: 8px; overflow: hidden; background: #1e1e2e; }
  .code-filename { padding: 0.5rem 1rem; font-size: 0.8rem; color: #94a3b8; border-bottom: 1px solid #2d3748; font-family: monospace; }
  pre { padding: 1rem; margin: 0; overflow-x: auto; }
  code { font-size: 0.9rem; line-height: 1.6; color: #e2e8f0; }
</style>
```

:::tip
Add [Shiki](https://shiki.style/) or [Prism](https://prismjs.com/) to your Astro project for syntax highlighting.
:::

---

## Table Block

Simple tabular data with a caption. Uses pipe-separated text for easy editing.

**Name:** Table | **Slug:** `table` | **Icon:** `table`

### Fields Schema JSON

```json
[
  { "name": "caption", "label": "Caption", "type": "text" },
  { "name": "content", "label": "Table Content", "type": "textarea", "required": true, "settings": { "placeholder": "Name | Role | Email\nJane | Editor | jane@example.com\nBob | Writer | bob@example.com" } }
]
```

### Astro component

```astro
---
// src/components/blocks/TableBlock.astro
const { fields } = Astro.props;
const { caption, content } = fields;
const lines = (content || '').trim().split('\n').filter(Boolean);
const rows = lines.map(line => line.split('|').map(cell => cell.trim()));
const header = rows[0];
const body = rows.slice(1);
---
<figure>
  <table>
    {header && <thead><tr>{header.map(cell => <th>{cell}</th>)}</tr></thead>}
    <tbody>{body.map(row => <tr>{row.map(cell => <td>{cell}</td>)}</tr>)}</tbody>
  </table>
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

---

## Alert / Callout Block

Info, warning, success, or tip callout boxes.

**Name:** Alert | **Slug:** `alert` | **Icon:** `alert-circle`

### Fields Schema JSON

```json
[
  { "name": "type", "label": "Type", "type": "select", "required": true, "settings": { "options": ["info", "warning", "success", "tip"] }, "default": "info" },
  { "name": "title", "label": "Title", "type": "text" },
  { "name": "body", "label": "Body", "type": "richtext", "required": true }
]
```

### Astro component

```astro
---
// src/components/blocks/AlertBlock.astro
import RichText from '@wollycms/astro/RichText.astro';
const { fields } = Astro.props;
const { type = 'info', title, body } = fields;
const icons = { info: 'ℹ️', warning: '⚠️', success: '✅', tip: '💡' };
---
<div class={`alert alert-${type}`}>
  <div class="alert-header">
    <span>{icons[type] || icons.info}</span>
    {title && <strong>{title}</strong>}
  </div>
  <div class="alert-body"><RichText content={body} /></div>
</div>

<style>
  .alert { border-radius: 8px; padding: 1rem; margin: 1.5rem 0; border-left: 4px solid; }
  .alert-info { background: #eff6ff; border-color: #3b82f6; }
  .alert-warning { background: #fffbeb; border-color: #f59e0b; }
  .alert-success { background: #f0fdf4; border-color: #22c55e; }
  .alert-tip { background: #f5f3ff; border-color: #8b5cf6; }
  .alert-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
</style>
```

---

## Image Gallery Block

Responsive image grid with captions.

**Name:** Gallery | **Slug:** `gallery` | **Icon:** `layout-grid`

### Fields Schema JSON

```json
[
  { "name": "columns", "label": "Columns", "type": "select", "settings": { "options": ["2", "3", "4"] }, "default": "3" },
  { "name": "images", "label": "Images", "type": "repeater", "required": true, "fields": [
    { "name": "image", "label": "Image", "type": "media", "required": true },
    { "name": "alt", "label": "Alt Text", "type": "text" },
    { "name": "caption", "label": "Caption", "type": "text" }
  ] }
]
```

### Astro component

```astro
---
// src/components/blocks/GalleryBlock.astro
const { fields } = Astro.props;
const { columns = '3', images = [] } = fields;
---
<div class="gallery" style={`--cols: ${columns}`}>
  {images.map(item => (
    <figure class="gallery-item">
      <img src={`/api/content/media/${item.image}/medium`} alt={item.alt || ''} loading="lazy" />
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>
  ))}
</div>

<style>
  .gallery { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 1rem; }
  .gallery-item { margin: 0; }
  .gallery-item img { width: 100%; border-radius: 8px; }
  figcaption { font-size: 0.85rem; color: #64748b; margin-top: 0.5rem; text-align: center; }
  @media (max-width: 768px) { .gallery { grid-template-columns: repeat(2, 1fr); } }
</style>
```

---

## Columns / Layout Block

Multi-column content layout.

**Name:** Columns | **Slug:** `columns` | **Icon:** `columns`

### Fields Schema JSON

```json
[
  { "name": "layout", "label": "Layout", "type": "select", "required": true, "settings": { "options": ["50-50", "33-67", "67-33", "33-33-33", "25-75"] }, "default": "50-50" },
  { "name": "gap", "label": "Gap", "type": "select", "settings": { "options": ["small", "medium", "large"] }, "default": "medium" },
  { "name": "columns", "label": "Columns", "type": "repeater", "required": true, "fields": [
    { "name": "content", "label": "Content", "type": "richtext", "required": true }
  ], "min": 2, "max": 4 }
]
```

### Astro component

```astro
---
// src/components/blocks/ColumnsBlock.astro
import RichText from '@wollycms/astro/RichText.astro';
const { fields } = Astro.props;
const { layout = '50-50', gap = 'medium', columns = [] } = fields;
const gapMap = { small: '1rem', medium: '2rem', large: '3rem' };
const templateMap = { '50-50': '1fr 1fr', '33-67': '1fr 2fr', '67-33': '2fr 1fr', '33-33-33': '1fr 1fr 1fr', '25-75': '1fr 3fr' };
---
<div class="columns" style={`grid-template-columns: ${templateMap[layout] || '1fr 1fr'}; gap: ${gapMap[gap] || '2rem'}`}>
  {columns.map(col => <div class="column"><RichText content={col.content} /></div>)}
</div>

<style>
  .columns { display: grid; }
  @media (max-width: 768px) { .columns { grid-template-columns: 1fr !important; } }
</style>
```

---

## Quote / Testimonial Block

Blockquote with attribution and optional avatar.

**Name:** Quote | **Slug:** `quote` | **Icon:** `quote`

### Fields Schema JSON

```json
[
  { "name": "quote", "label": "Quote", "type": "textarea", "required": true },
  { "name": "author", "label": "Author", "type": "text" },
  { "name": "role", "label": "Role / Title", "type": "text" },
  { "name": "avatar", "label": "Avatar", "type": "media" }
]
```

### Astro component

```astro
---
// src/components/blocks/QuoteBlock.astro
const { fields } = Astro.props;
const { quote, author, role, avatar } = fields;
---
<blockquote class="testimonial">
  <p>{quote}</p>
  {author && (
    <footer>
      {avatar && <img src={`/api/content/media/${avatar}/thumbnail`} alt="" class="avatar" />}
      <div>
        <cite>{author}</cite>
        {role && <span class="role">{role}</span>}
      </div>
    </footer>
  )}
</blockquote>

<style>
  .testimonial { border-left: 3px solid #3b82f6; padding: 1rem 1.5rem; margin: 1.5rem 0; font-style: italic; }
  .testimonial p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1rem; }
  footer { display: flex; align-items: center; gap: 0.75rem; font-style: normal; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
  cite { font-weight: 600; font-style: normal; display: block; }
  .role { font-size: 0.85rem; color: #64748b; }
</style>
```

---

## Divider Block

Visual separator with style options.

**Name:** Divider | **Slug:** `divider` | **Icon:** `minus`

### Fields Schema JSON

```json
[
  { "name": "style", "label": "Style", "type": "select", "settings": { "options": ["line", "dots", "space"] }, "default": "line" },
  { "name": "spacing", "label": "Spacing", "type": "select", "settings": { "options": ["small", "medium", "large"] }, "default": "medium" }
]
```

### Astro component

```astro
---
// src/components/blocks/DividerBlock.astro
const { fields } = Astro.props;
const { style = 'line', spacing = 'medium' } = fields;
const spacingMap = { small: '1rem', medium: '2rem', large: '3rem' };
---
<div class={`divider divider-${style}`} style={`--spacing: ${spacingMap[spacing] || '2rem'}`}>
  {style === 'dots' && <span>• • •</span>}
</div>

<style>
  .divider { margin: var(--spacing) 0; text-align: center; }
  .divider-line { border-top: 1px solid #e2e8f0; }
  .divider-dots { color: #94a3b8; letter-spacing: 0.5em; font-size: 1.2rem; }
  .divider-space { border: none; }
</style>
```

---

## FAQ / Accordion

WollyCMS includes an **Accordion** block type by default — no need to create it. Just add it to your pages from the block picker.

**Built-in fields:** `title` (question), `body` (answer, rich text), `open` (start expanded).

---

## Creating your own

The field schema is a JSON array of field definitions. Each field has:

| Property | Required | Description |
|---|---|---|
| `name` | Yes | Machine name (used in API responses and Astro components) |
| `label` | Yes | Human-readable label shown in the editor |
| `type` | Yes | Field type (see below) |
| `required` | No | Whether the field must be filled |
| `default` | No | Default value |
| `settings` | No | Type-specific options (e.g., `options` array for select) |
| `fields` | No | Sub-field definitions (for repeater type) |
| `min` / `max` | No | Min/max items (for repeater type) |

**Available field types:** `text`, `textarea`, `richtext`, `number`, `boolean`, `select`, `media`, `url`, `email`, `date`, `repeater`
