---
title: Rich Text
description: How WollyCMS stores and renders rich text content using TipTap JSON.
---

WollyCMS stores rich text as [TipTap](https://tiptap.dev/) JSON, not raw HTML. The `@wollycms/astro` package includes `renderRichText()` to convert this JSON to HTML at render time.

## Using the RichText component

The simplest way to render rich text is with the built-in component:

```astro
---
import RichText from '@wollycms/astro/components/RichText.astro';

const { fields } = Astro.props;
---

<div class="prose">
  <RichText content={fields.body} />
</div>
```

Or call `renderRichText()` directly for more control:

```astro
---
import { renderRichText } from '@wollycms/astro/helpers/richtext';

const { fields } = Astro.props;
const html = renderRichText(fields.body);
---

<div class="prose" set:html={html} />
```

### Split-origin deployments (Cloudflare Workers, etc.)

If your CMS and Astro frontend run on different origins — common with Cloudflare Workers, where each is a separate Worker — inline images and media links in rich text will use relative paths like `/api/content/media/42/original` that won't resolve on the frontend origin.

Pass a `baseUrl` prop to the RichText component so these paths get prefixed with your CMS domain:

```astro
<RichText content={fields.body} baseUrl="https://cms.example.com" />
```

Or when calling `renderRichText()` directly:

```typescript
const html = renderRichText(fields.body, 'https://cms.example.com');
```

:::caution
Without `baseUrl`, inline images will return 404s on the frontend because `/api/content/media/...` only exists on the CMS origin. This applies to any deployment where the CMS API and frontend site are on different domains or Workers.
:::

## Supported node types

`renderRichText()` handles these TipTap node types out of the box:

| Node type | HTML output |
|---|---|
| `paragraph` | `<p>` |
| `heading` | `<h2>` – `<h6>` with an optional fragment `id` |
| `bulletList` | `<ul>` |
| `orderedList` | `<ol>` |
| `listItem` | `<li>` |
| `blockquote` | `<blockquote>` |
| `codeBlock` | `<pre><code>` (with optional `language` class) |
| `image` | `<img>` (or `<a><img></a>` when linked) |
| `table` | `<table>` with `<tr>`, `<th>`, `<td>` |
| `horizontalRule` | `<hr />` |
| `hardBreak` | `<br />` |

## Text marks

Inline formatting is stored as marks on text nodes:

| Mark | HTML output |
|---|---|
| `bold` | `<strong>` |
| `italic` | `<em>` |
| `underline` | `<u>` |
| `strike` | `<s>` |
| `code` | `<code>` |
| `link` | `<a href="...">` (supports `class` and `rel` attributes) |
| `subscript` | `<sub>` |
| `superscript` | `<sup>` |

## Heading anchors

Editors can assign an anchor to a heading and link to it with a same-page URL
such as `#student-stories`. The built-in renderer outputs a valid anchor as a
programmatically focusable heading:

```html
<h2 id="student-stories" tabindex="-1">Student Stories</h2>
```

The `RichText` component supplies a visible focus indicator and uses the
`--wolly-anchor-offset` custom property for sticky-header clearance:

```css
:root {
  --wolly-anchor-offset: 7rem;
}
```

See [Heading Anchors](/concepts/heading-anchors/) for the editor workflow and
accessibility guidance. Custom rich-text renderers must preserve valid heading
IDs and provide equivalent focus and scroll-offset behavior.

## Link attributes

Links in rich text support optional attributes beyond the URL, configured via the **Advanced** section of the link dialog in the admin UI.

| Attribute | Type | Description |
|---|---|---|
| `href` | `string` | Link URL (required) |
| `target` | `string` | Link target — set via the "Open in new tab" checkbox |
| `class` | `string` | CSS class(es) for styling, e.g. `btn btn-primary` |
| `rel` | `string` | Relationship attribute for SEO, e.g. `nofollow`, `sponsored` |

When "Open in new tab" is checked and no `rel` value is provided, `noopener noreferrer` is added automatically for security.

### Styling links as buttons

The `class` attribute lets your theme style specific links differently. For example, to render a link as a button, an editor adds `btn btn-primary` in the CSS Class field, and the frontend theme provides the matching CSS:

```css
/* Example theme styles for rich text link classes */
.prose a.btn {
  display: inline-block;
  padding: 0.6rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  text-decoration: none;
  text-align: center;
}
.prose a.btn-primary {
  background: var(--color-primary);
  color: white;
}
.prose a.btn-outline {
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}
```

The classes are stored in the TipTap JSON and rendered as a `class` attribute on the `<a>` tag:

```json
{
  "type": "text",
  "text": "Apply Now",
  "marks": [
    {
      "type": "link",
      "attrs": {
        "href": "https://example.com/apply",
        "class": "btn btn-primary",
        "rel": null,
        "target": null
      }
    }
  ]
}
```

### SEO link attributes

The `rel` attribute controls how search engines treat the link:

| Value | Use case |
|---|---|
| `nofollow` | Don't pass link equity (e.g. user-submitted or untrusted links) |
| `sponsored` | Paid or sponsored links |
| `ugc` | User-generated content |
| `noopener noreferrer` | Security — auto-applied for new-tab links |

Multiple values can be combined with spaces: `nofollow sponsored`.

## Image attributes

Image nodes support these attributes:

| Attribute | Type | Description |
|---|---|---|
| `src` | `string` | Image URL |
| `alt` | `string` | Alt text |
| `title` | `string` | Title text (optional) |
| `width` | `string` | CSS width (e.g. `"50%"`) |
| `float` | `string` | `"none"`, `"left"`, `"right"`, or `"center"` |
| `caption` | `string` | Figure caption text (optional) |
| `href` | `string` | Link URL — wraps the image in `<a>` (optional) |
| `linkTarget` | `string` | Link target, e.g. `"_blank"` (optional) |

When an image has an `href`, the rendered output wraps it in a link:

```html
<!-- Image without link -->
<img src="/api/content/media/42/original" alt="QR code" />

<!-- Image with link -->
<a href="https://example.com" target="_blank">
  <img src="/api/content/media/42/original" alt="QR code" />
</a>
```

Editors can add links to images in the admin UI by clicking the image and then clicking the link button in the toolbar.

## Custom renderers

If you write your own renderer instead of using `renderRichText()`, make sure to handle image links. The `href` and `linkTarget` values are stored as attributes on the image node, not as marks:

```json
{
  "type": "image",
  "attrs": {
    "src": "/api/content/media/42/original",
    "alt": "QR code",
    "href": "https://example.com",
    "linkTarget": "_blank"
  }
}
```

:::caution
If your custom renderer doesn't check for `attrs.href` on image nodes, linked images will render as plain images with no link. The built-in `renderRichText()` handles this automatically.
:::

## TipTap JSON structure

Rich text content is stored as a JSON document with a `doc` root node. Here is an example showing the structure:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [
        { "type": "text", "text": "Welcome" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Visit our " },
        {
          "type": "text",
          "text": "website",
          "marks": [
            { "type": "link", "attrs": { "href": "https://example.com" } }
          ]
        },
        { "type": "text", "text": " for details." }
      ]
    },
    {
      "type": "image",
      "attrs": {
        "src": "/api/content/media/5/original",
        "alt": "Logo",
        "href": "https://example.com",
        "linkTarget": "_blank"
      }
    }
  ]
}
```
