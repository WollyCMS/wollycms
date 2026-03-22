---
title: Block Type Recipes
description: Copy-paste block type configurations and matching Astro components for common content patterns.
---

WollyCMS lets you create any block type with any field schema. These recipes are starting points — create them via **Schema → Block Types** in the admin, then build the matching Astro component in your frontend.

## Code Block

Display syntax-highlighted code snippets with an optional filename and language selector.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `language` | select | No | Options: `javascript`, `typescript`, `python`, `bash`, `html`, `css`, `json`, `yaml`, `sql`, `go`, `rust` |
| `filename` | text | No | |
| `code` | textarea | Yes | |

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
For syntax highlighting, add [Shiki](https://shiki.style/) or [Prism](https://prismjs.com/) to your Astro project and apply it to the `<code>` element.
:::

---

## Table Block

Structured tabular data with an optional header row and caption.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `caption` | text | No | |
| `has_header` | boolean | No | Default: true |
| `rows` | repeater | Yes | Sub-fields: `cells` (text) |

For a simpler approach, use a single `content` textarea field with Markdown table syntax and parse it in the component.

### Astro component (simple Markdown approach)

```astro
---
// src/components/blocks/TableBlock.astro
const { fields } = Astro.props;
const { caption, content } = fields;

// Parse simple CSV-style table: first line is header, | separated
const lines = (content || '').trim().split('\n').filter(Boolean);
const rows = lines.map(line => line.split('|').map(cell => cell.trim()));
const header = rows[0];
const body = rows.slice(1);
---
<figure>
  <table>
    {header && <thead><tr>{header.map(cell => <th>{cell}</th>)}</tr></thead>}
    <tbody>
      {body.map(row => <tr>{row.map(cell => <td>{cell}</td>)}</tr>)}
    </tbody>
  </table>
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

---

## Alert / Callout Block

Info, warning, success, or tip callout boxes.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `type` | select | Yes | Options: `info`, `warning`, `success`, `tip` |
| `title` | text | No | |
| `body` | richtext | Yes | |

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
    <span class="alert-icon">{icons[type] || icons.info}</span>
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
  .alert-icon { font-size: 1.2rem; }
</style>
```

---

## Image Gallery Block

Multiple images in a responsive grid with optional captions.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `layout` | select | No | Options: `grid`, `masonry`, `carousel`. Default: `grid` |
| `columns` | select | No | Options: `2`, `3`, `4`. Default: `3` |
| `images` | repeater | Yes | Sub-fields: `image` (media), `caption` (text), `alt` (text) |

### Astro component

```astro
---
// src/components/blocks/GalleryBlock.astro
const { fields } = Astro.props;
const { layout = 'grid', columns = '3', images = [] } = fields;
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

Multi-column content layout with nested rich text.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `layout` | select | Yes | Options: `50-50`, `33-67`, `67-33`, `33-33-33`, `25-75` |
| `gap` | select | No | Options: `small`, `medium`, `large`. Default: `medium` |
| `columns` | repeater | Yes | Sub-fields: `content` (richtext) |

### Astro component

```astro
---
// src/components/blocks/ColumnsBlock.astro
import RichText from '@wollycms/astro/RichText.astro';
const { fields } = Astro.props;
const { layout = '50-50', gap = 'medium', columns = [] } = fields;

const gapMap = { small: '1rem', medium: '2rem', large: '3rem' };
const templateMap = {
  '50-50': '1fr 1fr',
  '33-67': '1fr 2fr',
  '67-33': '2fr 1fr',
  '33-33-33': '1fr 1fr 1fr',
  '25-75': '1fr 3fr',
};
---
<div class="columns" style={`grid-template-columns: ${templateMap[layout] || '1fr 1fr'}; gap: ${gapMap[gap] || '2rem'}`}>
  {columns.map(col => (
    <div class="column"><RichText content={col.content} /></div>
  ))}
</div>

<style>
  .columns { display: grid; }
  @media (max-width: 768px) { .columns { grid-template-columns: 1fr !important; } }
</style>
```

---

## Quote / Testimonial Block

Blockquote with attribution.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `quote` | textarea | Yes | |
| `author` | text | No | |
| `role` | text | No | e.g., "CEO, Acme Corp" |
| `avatar` | media | No | |

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
    <footer class="testimonial-footer">
      {avatar && <img src={`/api/content/media/${avatar}/thumbnail`} alt="" class="testimonial-avatar" />}
      <div>
        <cite>{author}</cite>
        {role && <span class="testimonial-role">{role}</span>}
      </div>
    </footer>
  )}
</blockquote>

<style>
  .testimonial { border-left: 3px solid #3b82f6; padding: 1rem 1.5rem; margin: 1.5rem 0; font-style: italic; }
  .testimonial p { font-size: 1.1rem; line-height: 1.6; margin-bottom: 1rem; }
  .testimonial-footer { display: flex; align-items: center; gap: 0.75rem; font-style: normal; }
  .testimonial-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
  cite { font-weight: 600; font-style: normal; display: block; }
  .testimonial-role { font-size: 0.85rem; color: #64748b; }
</style>
```

---

## Divider Block

Simple visual separator with style options.

### Block type config

| Field | Type | Required | Settings |
|---|---|---|---|
| `style` | select | No | Options: `line`, `dots`, `space`. Default: `line` |
| `spacing` | select | No | Options: `small`, `medium`, `large`. Default: `medium` |

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

## FAQ / Accordion Block

WollyCMS includes an **Accordion** block type by default. This is already available — just add it to your pages from the block picker. The fields are:

| Field | Description |
|---|---|
| `title` | The question or section heading |
| `body` | The answer (rich text or plain text) |
| `open` | Whether the section starts expanded |

Use the built-in Accordion block for FAQ sections. Multiple accordion blocks in the same region create a collapsible FAQ list.

---

## Creating your own

To create a custom block type:

1. Go to **Schema → Block Types** in the admin
2. Click **+ New Block Type**
3. Define a name, slug, and field schema (JSON)
4. Create the matching Astro component in your frontend project
5. Register it in your `BlockRenderer` component

The field schema format:

```json
[
  { "name": "title", "label": "Title", "type": "text", "required": true },
  { "name": "body", "label": "Body", "type": "richtext" },
  { "name": "style", "label": "Style", "type": "select", "settings": { "options": ["default", "highlight"] } },
  { "name": "items", "label": "Items", "type": "repeater", "fields": [
    { "name": "label", "label": "Label", "type": "text" },
    { "name": "value", "label": "Value", "type": "text" }
  ]}
]
```

Available field types: `text`, `textarea`, `richtext`, `number`, `boolean`, `select`, `media`, `url`, `email`, `date`, `repeater`.
