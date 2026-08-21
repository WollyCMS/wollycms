# @wollycms/astro

The official Astro integration for [WollyCMS](https://wollycms.com). It includes
a typed content client, block rendering, rich-text rendering, responsive image
support, menu helpers, SEO helpers, and tracking helpers.

The rich-text renderer supports accessible, editor-managed heading anchors.
Set the `--wolly-anchor-offset` CSS custom property when a sticky site header
needs additional clearance for fragment targets.

## Compatibility

| Package | Supported versions |
|---|---|
| Astro | 5, 6, and 7 |
| Node.js | 22 LTS recommended |

## Install

```bash
npm install @wollycms/astro
```

```ts
import { createClient } from '@wollycms/astro';

export const wolly = createClient({
  apiUrl: 'http://localhost:4321/api/content',
});
```

Components are exported as package entry points:

```astro
---
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';
---
```

The legacy `WollyImage.astro` entry point remains as an alias for
`SpacelyImage.astro`.

See the [Astro integration documentation](https://docs.wollycms.com/astro/setup/)
for complete setup and deployment guidance.

## License

MIT
