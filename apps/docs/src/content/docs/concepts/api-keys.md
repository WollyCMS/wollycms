---
title: API Keys
description: Managing API keys for programmatic access to the WollyCMS content API.
---

API keys provide authenticated access to the WollyCMS content API without requiring JWT login. They're useful for build-time fetching, CI/CD pipelines, and external integrations.

## Creating API keys

In the admin UI, navigate to **System → API Keys** and click **+ New API Key**.

Each key has:
- **Name** — A descriptive label (e.g., "Production frontend", "CI build")
- **Key** — Auto-generated, shown once at creation. Copy and store it securely.
- **Permissions** — Read-only access to the content API

## Using API keys

Pass the key in the `Authorization` header:

```bash
curl -H "Authorization: Bearer sk_your_api_key_here" \
  https://your-cms.example.com/api/content/pages/home
```

In your Astro frontend:

```typescript
import { createClient } from '@wollycms/astro';

const wolly = createClient({
  apiUrl: 'https://your-cms.example.com/api/content',
  apiKey: 'sk_your_api_key_here', // optional — for authenticated requests
});
```

## When to use API keys

- **Production frontends** — Authenticate content requests from your deployed site
- **Build pipelines** — Fetch content during static builds in CI/CD
- **External tools** — Any system that needs to read content programmatically

:::caution
API keys grant read access to all published content. Treat them as secrets — store in environment variables, never commit to git.
:::

## Key management

- Rotate keys periodically by creating a new key and updating your frontend config
- Delete unused keys from the admin to reduce your attack surface
- Each key's last-used timestamp is tracked for auditing
