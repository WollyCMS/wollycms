---
title: Menus
description: Hierarchical navigation menus with deep nesting and multiple independent menus.
---

WollyCMS supports multiple independent menus with unlimited nesting depth. Menus are managed through the admin UI and fetched via the content API.

## How menus work

A **menu** is a named collection of menu items organized in a tree structure. Each menu item can either:

- Link to an internal CMS page (by page ID, resolved to the page slug)
- Link to an external URL
- Act as a container (no link, just a parent for child items)

### Menu item properties

| Property | Type | Description |
|---|---|---|
| `id` | number | Unique identifier |
| `title` | string | Display text |
| `url` | string or null | External URL |
| `page_slug` | string or null | Resolved slug from linked CMS page |
| `target` | string | Link target (`_self`, `_blank`) |
| `attributes` | object or null | Custom attributes (CSS classes, icons, etc.) |
| `children` | array | Nested child items |

## Fetching menus

Use the content API to fetch a menu by slug:

```typescript
const menu = await wolly.menus.get('main-nav');
```

This returns the full nested tree:

```json
{
  "id": 1,
  "name": "Main Navigation",
  "slug": "main-nav",
  "items": [
    {
      "id": 1,
      "title": "Home",
      "url": null,
      "page_slug": "home",
      "target": "_self",
      "attributes": null,
      "children": []
    },
    {
      "id": 2,
      "title": "Products",
      "url": null,
      "page_slug": "products",
      "target": "_self",
      "attributes": null,
      "children": [
        {
          "id": 3,
          "title": "WollyCMS",
          "url": null,
          "page_slug": "products/wollycms",
          "target": "_self",
          "attributes": null,
          "children": []
        }
      ]
    },
    {
      "id": 4,
      "title": "GitHub",
      "url": "https://github.com/wollycms",
      "page_slug": null,
      "target": "_blank",
      "attributes": { "class": "external" },
      "children": []
    }
  ]
}
```

### Limiting depth

Pass a `depth` parameter to limit nesting:

```typescript
// Only fetch top-level items (no children)
const menu = await wolly.menus.get('main-nav', 1);

// Fetch two levels deep
const menu = await wolly.menus.get('main-nav', 2);
```

## Container items

A menu item with no `url` and no `page_slug` acts as a **container** — a non-clickable parent that groups child items. This is useful for dropdown menus where the top-level label opens a submenu but does not navigate anywhere.

## Multiple menus

Create as many menus as your site needs. Common patterns:

| Menu | Slug | Purpose |
|---|---|---|
| Main Navigation | `main-nav` | Primary site navigation |
| Footer Links | `footer` | Footer column links |
| Sidebar | `sidebar-nav` | Documentation or section navigation |
| Mobile Menu | `mobile-nav` | Simplified mobile navigation |

## Rendering in Astro

```astro
---
import { createClient, menuHelpers } from '@wollycms/astro';

const wolly = createClient({ apiUrl: import.meta.env.CMS_API_URL });
const menu = await wolly.menus.get('main-nav');
const currentPath = Astro.url.pathname;
---

<nav>
  <ul>
    {menu.items.map((item) => {
      const href = menuHelpers.getItemHref(item);
      const active = menuHelpers.isActive(item, currentPath);
      return (
        <li class:list={[{ active }]}>
          {href ? (
            <a href={href} target={item.target}>{item.title}</a>
          ) : (
            <span>{item.title}</span>
          )}
          {item.children.length > 0 && (
            <ul>
              {item.children.map((child) => (
                <li>
                  <a href={menuHelpers.getItemHref(child)}>{child.title}</a>
                </li>
              ))}
            </ul>
          )}
        </li>
      );
    })}
  </ul>
</nav>
```

See [Menu Helpers](/astro/menus/) for the full helper API including breadcrumbs.
