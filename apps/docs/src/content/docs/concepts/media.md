---
title: Media
description: Upload, organize, and auto-optimize images with the WollyCMS media library.
---

WollyCMS includes a media library for uploading, organizing, and serving files. Images are automatically processed with Sharp to generate optimized WebP variants.

## Uploading files

Upload files through the admin UI's media picker or via the admin API:

```bash
curl -X POST http://localhost:4321/api/admin/media \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo.jpg" \
  -F "title=Team Photo" \
  -F "altText=The WollyCMS team at the office" \
  -F "folder=photos"
```

### Allowed file types

| Category | Types |
|---|---|
| Images | JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, ICO |
| Documents | PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX |
| Video | MP4, WebM, OGG |
| Audio | MP3, OGG, WAV, WebM |
| Archives | ZIP, GZIP |
| Text | TXT, CSV, JSON |

Maximum upload size is 50 MB.

## Image processing

When you upload an image (JPEG, PNG, GIF, WebP, or AVIF), Sharp automatically generates optimized variants:

| Variant | Description |
|---|---|
| `original` | The uploaded file, unchanged |
| `thumbnail` | Small preview (suitable for admin grids) |
| `medium` | Mid-size for content areas |
| `large` | Full-width for hero sections |

All generated variants are converted to **WebP** format for optimal file size. The original file is preserved in its uploaded format.

:::note
Image processing requires Sharp, which runs on Node.js. When running on Cloudflare Workers (where Sharp is unavailable), uploads are stored as originals only — no variants are generated.
:::

## Storage backends

WollyCMS supports three storage backends configured via the `MEDIA_STORAGE` environment variable:

### Local filesystem (default)

```bash
MEDIA_STORAGE=local
MEDIA_DIR=./uploads
```

Files are stored in the `uploads/` directory and served directly by the CMS server at `/uploads/*`.

### S3-compatible storage

```bash
MEDIA_STORAGE=s3
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_BUCKET=my-media-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
S3_PUBLIC_URL=https://cdn.example.com
```

Works with AWS S3, MinIO, DigitalOcean Spaces, or any S3-compatible service.

### Cloudflare R2

```bash
MEDIA_STORAGE=r2
```

When deployed to Cloudflare Workers, R2 is configured via the `wrangler.toml` bucket binding. No additional environment variables are needed.

## Organizing with folders

Media items can be organized into folders. Set the `folder` field when uploading or update it later:

```bash
curl -X PUT http://localhost:4321/api/admin/media/42 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "folder": "blog/2024" }'
```

The admin UI provides a folder browser for organizing media visually.

## Fetching media in Astro

```typescript
const wolly = createClient({ apiUrl: 'http://localhost:4321/api/content' });

// Get metadata for a media item
const info = await wolly.media.getInfo(42);
// info.filename, info.width, info.height, info.altText, info.variants

// Build a URL for a specific variant
const thumbnailUrl = wolly.media.url(42, 'thumbnail');
const originalUrl = wolly.media.url(42, 'original');
```

### Using with the SpacelyImage component

```astro
---
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';

const mediaUrl = wolly.media.url(fields.image, 'large');
---

<SpacelyImage
  src={mediaUrl}
  alt="Hero background"
  width={1200}
  height={600}
  loading="eager"
/>
```

See [Images](/astro/images/) for responsive image patterns with srcset.
