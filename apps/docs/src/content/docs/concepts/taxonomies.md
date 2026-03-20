---
title: Taxonomies
description: Organize content with vocabularies and hierarchical terms.
---

Taxonomies let you categorize pages using **vocabularies** (groups of terms) and **terms** (the individual categories or tags). Terms can be flat or hierarchical.

## Vocabularies and terms

A **vocabulary** (also called a taxonomy) is a named collection of terms. For example:

- **Category** vocabulary with terms: News, Tutorials, Announcements
- **Tags** vocabulary with terms: JavaScript, Astro, CMS, Deployment
- **Region** vocabulary with terms: North America > United States > California

### Creating a taxonomy

```bash
curl -X POST http://localhost:4321/api/admin/taxonomies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Category",
    "slug": "category",
    "description": "Blog post categories",
    "hierarchical": false
  }'
```

### Creating terms

```bash
curl -X POST http://localhost:4321/api/admin/taxonomies/1/terms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tutorials",
    "slug": "tutorials",
    "weight": 0
  }'
```

## Hierarchical terms

Set `hierarchical: true` on the taxonomy to enable parent-child relationships between terms. Child terms reference their parent via `parentId`:

```bash
# Create parent term
curl -X POST http://localhost:4321/api/admin/taxonomies/2/terms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "North America", "slug": "north-america", "weight": 0 }'

# Create child term
curl -X POST http://localhost:4321/api/admin/taxonomies/2/terms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "United States", "slug": "united-states", "parentId": 1, "weight": 0 }'
```

The content API returns hierarchical terms as a nested tree:

```json
{
  "data": [
    {
      "id": 1,
      "name": "North America",
      "slug": "north-america",
      "weight": 0,
      "fields": null,
      "children": [
        {
          "id": 2,
          "name": "United States",
          "slug": "united-states",
          "weight": 0,
          "fields": null,
          "children": []
        }
      ]
    }
  ]
}
```

Flat (non-hierarchical) taxonomies return a simple list without `children`.

## Term fields

Terms support custom `fields` — a JSON object for storing extra data like colors, icons, or descriptions:

```bash
curl -X POST http://localhost:4321/api/admin/taxonomies/1/terms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tutorials",
    "slug": "tutorials",
    "weight": 0,
    "fields": { "color": "#10b981", "icon": "book-open" }
  }'
```

## Assigning terms to pages

Pages are linked to terms through the admin API's page-terms endpoints. Once assigned, terms appear in the page's API response:

```json
{
  "data": {
    "title": "Getting Started with Astro",
    "terms": [
      { "taxonomy": "category", "term": "tutorials", "weight": 0 },
      { "taxonomy": "tags", "term": "astro", "weight": 0 }
    ]
  }
}
```

## Filtering content by taxonomy

The content API's page list endpoint supports taxonomy filtering:

```typescript
// All pages in the "tutorials" category
const tutorials = await wolly.pages.list({
  taxonomy: 'category:tutorials',
});

// All pages that have any term in the "tags" vocabulary
const tagged = await wolly.pages.list({
  taxonomy: 'tags',
});
```

The filter format is `vocabulary_slug:term_slug` for a specific term, or just `vocabulary_slug` for any term in that vocabulary.

## Fetching terms in Astro

```typescript
const wolly = createClient({ apiUrl: import.meta.env.CMS_API_URL });

// Get all terms in the "category" taxonomy
const categories = await wolly.taxonomies.getTerms('category');
```

### Rendering a tag list

```astro
---
const categories = await wolly.taxonomies.getTerms('category');
---

<ul>
  {categories.map((term) => (
    <li>
      <a href={`/blog?category=${term.slug}`}>{term.name}</a>
    </li>
  ))}
</ul>
```

:::tip
Combine taxonomy filtering with content type filtering for powerful queries: `wolly.pages.list({ type: 'blog_post', taxonomy: 'category:tutorials' })` returns only blog posts in the tutorials category.
:::
