---
title: Project Structure
description: How a WollyCMS project is organized.
---

## CMS project (created by `create-wolly`)

```
my-site/
├── data/              # SQLite database files (gitignored)
├── uploads/           # Media uploads (gitignored)
├── .env               # Environment variables (gitignored)
├── .env.example       # Template for .env
├── .gitignore
├── docker-compose.yml # Docker deployment config
├── package.json       # @wollycms/server dependency
└── README.md
```

The CMS project is intentionally minimal. All the server logic lives in `@wollycms/server` — you just configure it via environment variables.

## Astro frontend project

```
my-frontend/
├── src/
│   ├── blocks/        # One Astro component per block type
│   │   ├── Hero.astro
│   │   ├── RichText.astro
│   │   ├── ImageBlock.astro
│   │   └── ...
│   ├── layouts/       # Page layouts
│   │   └── Default.astro
│   ├── lib/
│   │   ├── wolly.ts   # WollyClient configuration
│   │   └── blocks.ts  # Block type → component mapping
│   ├── pages/
│   │   ├── index.astro       # Homepage
│   │   └── [...slug].astro   # Catch-all CMS route
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── package.json
└── wrangler.toml      # If deploying to Cloudflare
```

## Key files

### `src/lib/wolly.ts`

Configures the WollyCMS client. This is where you set the API URL and any options like timeout.

### `src/lib/blocks.ts`

Maps CMS block type slugs to your Astro components. The export name must match the block type slug exactly:

```typescript
// Block type slug "hero" → Hero.astro component
export { default as hero } from '../blocks/Hero.astro';

// Block type slug "rich_text" → RichText.astro component
export { default as rich_text } from '../blocks/RichText.astro';
```

### `src/pages/[...slug].astro`

The catch-all route that renders any CMS page. It fetches the page by slug, then passes each region's blocks to `BlockRenderer`.

### Block components (`src/blocks/*.astro`)

Each block component receives `fields` as props — the block's field data from the CMS. You render it however you want with full control over HTML and styling.
