---
title: GraphQL API
description: Query WollyCMS content with GraphQL — fetch exactly the data you need in a single request.
---

WollyCMS provides a GraphQL API alongside the REST API. Both return the same data — use whichever fits your workflow.

**Endpoint:** `POST /api/content/graphql` (or `GET /api/content/graphql?query=...`)

No authentication required — the GraphQL API is read-only and returns only published content (same as the REST content API).

## Quick example

Fetch a page with its blocks and a menu in one request:

```graphql
{
  page(slug: "about") {
    title
    slug
    locale
    seo { metaTitle, metaDescription }
    regions
    translations { locale, slug, title }
  }
  menu(slug: "main-navigation") {
    items {
      title
      url
      pageSlug
      children { title, url }
    }
  }
}
```

## Queries

### pages

List published pages with filtering.

```graphql
{
  pages(type: "article", locale: "en", limit: 10, offset: 0, sort: "published_at:desc") {
    data {
      id, title, slug, type, locale
      fields
      meta { createdAt, updatedAt, publishedAt }
    }
    meta { total, limit, offset }
  }
}
```

**Arguments:**

| Argument | Type | Default | Description |
|---|---|---|---|
| `type` | String | — | Filter by content type slug |
| `locale` | String | default locale | Filter by locale |
| `sort` | String | `published_at:desc` | Sort field and direction |
| `limit` | Int | 20 | Max results (capped at 50) |
| `offset` | Int | 0 | Pagination offset |

### page

Get a single page by slug with blocks, SEO, and translations.

```graphql
{
  page(slug: "about", locale: "en") {
    id
    title
    slug
    type
    locale
    translationGroupId
    translations {
      id, locale, slug, title
    }
    fields
    seo {
      metaTitle
      metaDescription
      ogImage
      canonicalUrl
      robots
    }
    regions
    meta {
      createdAt
      updatedAt
      publishedAt
    }
  }
}
```

The `regions` field returns JSON with blocks grouped by region:

```json
{
  "hero": [{ "block_type": "hero", "fields": { "heading": "..." } }],
  "content": [{ "block_type": "rich_text", "fields": { "body": "..." } }]
}
```

### menu

Get a menu with nested items.

```graphql
{
  menu(slug: "main-navigation") {
    id
    name
    items {
      title
      url
      pageSlug
      target
      depth
      children {
        title
        url
        pageSlug
      }
    }
  }
}
```

### menus

List all menus (without items — fetch individually for items).

```graphql
{
  menus {
    id, name, slug
  }
}
```

### taxonomy / taxonomies

```graphql
{
  taxonomy(slug: "tags") {
    name
    hierarchical
    terms {
      id, name, slug, weight
    }
  }

  taxonomies {
    name, slug, hierarchical
  }
}
```

### config

```graphql
{
  config {
    siteName
    tagline
    logo
    defaultLocale
    supportedLocales
  }
}
```

## Using with fetch

```javascript
const response = await fetch('https://cms.example.com/api/content/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `{
      pages(type: "article", limit: 5) {
        data { title, slug, fields }
      }
    }`
  }),
});
const { data } = await response.json();
```

## Using with variables

```javascript
const query = `
  query GetPage($slug: String!, $locale: String) {
    page(slug: $slug, locale: $locale) {
      title, regions, seo { metaTitle, metaDescription }
    }
  }
`;

const response = await fetch('/api/content/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { slug: 'about', locale: 'en' } }),
});
```

## GraphQL vs REST

| | REST | GraphQL |
|---|---|---|
| Endpoint | Multiple (`/pages`, `/menus`, etc.) | Single (`/graphql`) |
| Data fetching | Fixed response shape | Request exactly what you need |
| Multiple resources | Multiple requests | One query |
| Caching | HTTP cache headers + ETags | Application-level |
| Best for | Simple fetches, Astro SSR | Complex queries, AI tooling, data migration |

Both APIs return the same data and stay in sync. Use REST for standard Astro pages, GraphQL for complex queries or when you need multiple resources in one request.
