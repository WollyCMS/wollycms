---
title: Images
description: Render CMS media with responsive srcset, lazy loading, and optimized variants.
---

WollyCMS auto-generates WebP variants for uploaded images. The `@wollycms/astro` package provides the `SpacelyImage` component and the `media` client methods to build responsive image markup.

## SpacelyImage component

```astro
---
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';
---

<SpacelyImage
  src="/api/content/media/42/large"
  alt="Team photo"
  width={1200}
  height={600}
  loading="lazy"
  class="hero-image"
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | required | Image URL |
| `alt` | `string` | `""` | Alt text for accessibility |
| `width` | `number` | - | Intrinsic width |
| `height` | `number` | - | Intrinsic height |
| `srcset` | `string` | - | Responsive srcset attribute |
| `sizes` | `string` | - | Responsive sizes attribute |
| `loading` | `"lazy" \| "eager"` | `"lazy"` | Loading strategy |
| `class` | `string` | - | CSS class |

## Building media URLs

The `WollyClient` provides methods to construct media URLs:

```typescript
const wolly = createClient({ apiUrl: 'http://localhost:4321/api/content' });

// Direct URL to a variant
const url = wolly.media.url(42, 'large');
// → "http://localhost:4321/api/content/media/42/large"

// Original file
const original = wolly.media.url(42, 'original');

// Default is 'original'
const same = wolly.media.url(42);
```

### Available variants

| Variant | Use case |
|---|---|
| `original` | Full quality, original format |
| `thumbnail` | Admin grids, small previews |
| `medium` | Content images, cards |
| `large` | Hero images, full-width sections |

## Responsive images with srcset

Build a srcset from the available variants for responsive loading:

```astro
---
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';

const mediaId = fields.image as number;
const info = await wolly.media.getInfo(mediaId);

const srcset = [
  `${wolly.media.url(mediaId, 'medium')} 800w`,
  `${wolly.media.url(mediaId, 'large')} 1200w`,
  `${wolly.media.url(mediaId, 'original')} ${info.width}w`,
].join(', ');
---

<SpacelyImage
  src={wolly.media.url(mediaId, 'large')}
  srcset={srcset}
  sizes="(max-width: 800px) 100vw, 1200px"
  alt={info.altText || ''}
  width={info.width}
  height={info.height}
/>
```

## Using in block components

A typical image block component:

```astro
---
// src/blocks/ImageBlock.astro
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';
import { wolly } from '../lib/wolly';

const { fields } = Astro.props;
const mediaId = fields.media_id as number;
const caption = fields.caption as string | undefined;

let info = null;
if (mediaId) {
  info = await wolly.media.getInfo(mediaId);
}
---

{info && (
  <figure>
    <SpacelyImage
      src={wolly.media.url(mediaId, 'large')}
      alt={info.altText || caption || ''}
      width={info.width}
      height={info.height}
    />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
)}
```

## Fetching media metadata

The `getInfo` method returns full metadata for a media item:

```typescript
const info = await wolly.media.getInfo(42);
```

```typescript
interface MediaInfo {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;      // Image width in pixels
  height: number | null;     // Image height in pixels
  altText: string | null;    // Editor-provided alt text
  title: string | null;
  variants: Record<string, string>;  // variant name → storage path
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
```

## Lazy loading strategy

Use `loading="eager"` for above-the-fold images (hero sections, first visible content) and `loading="lazy"` (the default) for everything below the fold:

```astro
<!-- Hero image: load immediately -->
<SpacelyImage src={heroUrl} alt="Hero" loading="eager" />

<!-- Content images: lazy load -->
<SpacelyImage src={contentUrl} alt="Feature" loading="lazy" />
```

:::tip
Set `width` and `height` on every image to prevent layout shifts (CLS). The `getInfo` method gives you the original dimensions, which the browser uses to calculate the aspect ratio before the image loads.
:::
