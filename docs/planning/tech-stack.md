# SpacelyCMS — Technology Stack

## CMS Server

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Runtime** | Node.js | 22 LTS | Universal, stable, runs everywhere |
| **Language** | TypeScript | 5.x | Type safety, better DX, catches bugs early |
| **Web Framework** | Hono | 4.x | Lightweight (14KB), fast, runs on Node/Bun/Workers |
| **ORM** | Drizzle | 0.38+ | Type-safe SQL, SQLite + Postgres, zero overhead |
| **Database (dev)** | SQLite | via better-sqlite3 | Zero-config, single file, perfect for dev |
| **Database (prod)** | PostgreSQL | 16+ | Concurrent writes, full-text search, production scale |
| **Auth** | Custom JWT + scrypt | — | Simple, no external dependency. Better Auth if needed. |
| **Validation** | Zod | 3.x | Schema validation for API inputs and field schemas |
| **Media Processing** | Sharp | 0.33+ | Image resize, format conversion, EXIF extraction |
| **Rich Text Storage** | TipTap JSON format | — | Structured, portable, renderable anywhere |
| **Testing** | Vitest | 3.x | Fast, TypeScript-native, compatible with Node |
| **Linting** | ESLint + Prettier | — | Consistent code style |

## Admin UI

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Framework** | SvelteKit (SPA mode) | 2.x | Light, fast, excellent DX, small bundle |
| **Alternative** | React + Vite | 19.x | Larger ecosystem if Svelte doesn't fit |
| **Rich Text Editor** | TipTap | 2.x | Extensible, stores as JSON, excellent API |
| **UI Components** | Bits UI + Tailwind CSS | — | Accessible primitives + utility CSS |
| **Drag & Drop** | dnd-kit or Svelte DnD | — | Block reordering, menu tree editing |
| **Icons** | Lucide | — | Clean, consistent icon set |
| **Forms** | Superforms (Svelte) | — | Form handling with Zod validation |
| **HTTP Client** | Fetch API | — | Native, no extra dependency |
| **State Management** | Svelte stores | — | Built-in, reactive |

## Astro Integration (`@spacelycms/astro`)

| Layer | Technology | Rationale |
|---|---|---|
| **Package** | TypeScript npm package | Installable in any Astro project |
| **Astro Version** | 5.x+ | Current stable, content collections v2 |
| **Build** | tsup | Fast TypeScript bundler for npm packages |

## Infrastructure / DevOps

| Layer | Technology | Rationale |
|---|---|---|
| **Containerization** | Docker | Multi-stage builds, consistent deployments |
| **Compose** | Docker Compose | Dev environment with CMS + DB + media |
| **Monorepo** | npm workspaces | CMS server + admin UI + Astro integration |
| **CI/CD** | Forgejo Actions | Self-hosted, matches git host |
| **Media Storage** | Local FS / S3-compatible | Pluggable: local for dev, R2/S3 for prod |

---

## Monorepo Structure

```
SpacelyCMS/
├── packages/
│   ├── server/           # Hono API server + database
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema/      # SQLite Drizzle schema + smart barrel
│   │   │   │   └── schema-pg/   # PostgreSQL Drizzle schema
│   │   │   ├── api/      # Route handlers
│   │   │   ├── services/ # Business logic
│   │   │   ├── media/    # Media processing + storage
│   │   │   └── auth/     # Authentication
│   │   ├── tests/
│   │   ├── drizzle/              # SQLite migrations
│   │   ├── drizzle-pg/           # PostgreSQL migrations
│   │   ├── drizzle.config.ts     # SQLite drizzle-kit config
│   │   ├── drizzle-pg.config.ts  # PG drizzle-kit config
│   │   └── package.json
│   │
│   ├── admin/            # Admin UI (SvelteKit SPA)
│   │   ├── src/
│   │   │   ├── routes/   # Admin pages
│   │   │   ├── lib/      # Components, stores, utils
│   │   │   └── blocks/   # Block editor components
│   │   └── package.json
│   │
│   └── astro/            # @spacelycms/astro integration
│       ├── src/
│       │   ├── client.ts     # API client
│       │   ├── components/   # BlockRenderer, SpacelyImage, RichText
│       │   ├── helpers/      # Menu helpers, type utils
│       │   └── index.ts      # Package exports
│       └── package.json
│
├── examples/
│   └── college-site/     # Reference Astro site (SVCC-inspired)
│       ├── src/
│       │   ├── blocks/   # Block components
│       │   ├── layouts/  # Page layouts
│       │   └── pages/    # Astro routes
│       └── package.json
│
├── docs/                 # This documentation
├── scripts/              # Dev/build/deploy scripts
├── docker-compose.yml    # Dev environment
├── Dockerfile            # Production build
├── package.json          # Workspace root
└── tsconfig.json         # Shared TypeScript config
```

---

## Key Dependency Choices Explained

### Why Hono over Express/Fastify?

- **Size**: Hono is ~14KB vs Express ~200KB vs Fastify ~130KB
- **Performance**: Hono benchmarks faster than both
- **Future-proof**: Runs on Node, Bun, Deno, and Cloudflare Workers
- **TypeScript**: First-class TS support with typed routes and middleware
- **Standards-based**: Uses Web Standards (Request/Response), not proprietary APIs

### Why Drizzle over Prisma?

- **Zero runtime overhead**: Drizzle compiles to raw SQL, no query engine binary
- **SQLite support**: First-class, not an afterthought
- **Schema in TypeScript**: Not a separate DSL (.prisma files)
- **Lightweight**: ~50KB vs Prisma's multi-MB runtime engine
- **SQL-like API**: Developers think in SQL, Drizzle respects that

### Why TipTap for Rich Text?

- **JSON storage**: Content stored as structured JSON, not HTML blobs
- **Extensible**: Custom nodes (media embeds, internal links) are straightforward
- **Framework-agnostic**: JSON can be rendered by any frontend (Astro, React, etc.)
- **Mature**: Built on ProseMirror, battle-tested
- **Headless**: Server doesn't need the editor — just store/serve JSON

### Why SvelteKit for Admin UI?

- **Small bundles**: Svelte compiles away the framework, smaller JS payloads
- **Reactivity built-in**: No extra state management libraries needed
- **SPA mode**: Can be compiled as a static SPA, served by the Hono server
- **Form handling**: Superforms + Zod = excellent form UX with validation
- **Learning curve**: Simpler than React for the patterns we need
- **Alternative**: If the team prefers React, switch. Architecture doesn't depend on it.

### Why SQLite as Default?

- **Zero configuration**: No database server to install or configure
- **Single file**: The entire database is one `.db` file — easy backup, easy deploy
- **Performance**: For read-heavy CMS workloads, SQLite is incredibly fast
- **Sufficient scale**: Handles thousands of pages, millions of reads
- **Upgrade path**: When concurrent writes matter, switch to Postgres with one config change
