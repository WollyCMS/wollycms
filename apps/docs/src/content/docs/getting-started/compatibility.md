---
title: Compatibility
description: Supported Node.js, Astro, database, and deployment versions for WollyCMS 0.3.
---

## WollyCMS 0.3 support matrix

| Component | Supported or recommended version |
|---|---|
| Node.js | 22 LTS; 22.23.4 or later for the current source/example/docs toolchain |
| npm | 10 or later |
| Astro | 5, 6, or 7 |
| SQLite | Default for local and small self-hosted installations |
| PostgreSQL | Supported for larger self-hosted installations |
| Cloudflare D1 | Supported through the Workers build |
| Cloudflare R2 | Supported for Workers media storage |

Node.js 22 is the tested runtime for the server, CLI, CI, and Docker image.
WollyCMS uses native modules such as `better-sqlite3` and Sharp, so using the
tested LTS runtime avoids native-binary compatibility problems.

## Astro compatibility

`@wollycms/astro` 0.3 declares peer compatibility with Astro 5, 6, and 7. New
projects should use Astro 7. Existing Astro 5 or 6 sites can upgrade the WollyCMS
integration independently and move to Astro 7 on their own schedule.

For Cloudflare Workers SSR sites, use the current `@astrojs/cloudflare` adapter
that matches your Astro major version and read runtime bindings from
`cloudflare:workers`.

## Deployment targets

WollyCMS supports:

- Cloudflare Workers with D1 and R2
- Docker through `ghcr.io/wollycms/wollycms`
- Bare Node.js behind a TLS reverse proxy

The Astro frontend remains a separate application and can be hosted on any
platform supported by Astro.

## Source security maintenance (2026-10-30)

The current source lockfile includes Hono 4.13.14, Sharp 0.35.5, Svelte 5.57.3,
SvelteKit 2.70.2, TipTap 3.32.1, Zod 4.6.7, and Vitest 4.1.12. The example and
documentation use Astro 7.4.4; documentation uses Cloudflare adapter 14.4.3.
The Astro toolchain requires Node.js 22.23.4 or later. These versions describe
this source snapshot; manifests and lockfiles remain authoritative.

This maintenance does not introduce a database migration or content conversion.
The server and integration manifests remain at 0.3.1; no new npm or Docker
release was published for this source maintenance. Check the release notes and
artifact tag before assuming an npm install or Docker pull includes it. Worker
deployment and package/image publication are separate release actions.

Extensions that import Zod directly must account for Zod 4: records take both
key and value schemas, and defaults inside optional fields can affect partial
updates. Core API regression tests cover preservation of omitted fields.
