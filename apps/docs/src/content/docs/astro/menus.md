---
title: Menu Helpers
description: Fetch menus, render navigation, detect active states, and build breadcrumbs.
---

The `@wollycms/astro` package exports `menuHelpers` with utility functions for working with menu data in your Astro templates.

## Fetching a menu

```typescript
import { createClient } from '@wollycms/astro';

const wolly = createClient({ apiUrl: import.meta.env.CMS_API_URL });
const menu = await wolly.menus.get('main-nav');
```

## Helper functions

Import the helpers:

```typescript
import { menuHelpers } from '@wollycms/astro';
```

### getItemHref(item)

Returns the resolved URL for a menu item. Returns `null` for container items (no URL, no page).

```typescript
const href = menuHelpers.getItemHref(item);
// "/about" (from page_slug) or "https://github.com" (from url) or null
```

Logic:
1. If `item.url` exists, return it (external link)
2. If `item.page_slug` exists, return `/${item.page_slug}` (internal page)
3. Otherwise return `null` (container item)

### isActive(item, currentPath)

Returns `true` if the item or any of its children match the current path. Useful for highlighting the active navigation item.

```typescript
const active = menuHelpers.isActive(item, '/about');
```

### getBreadcrumbs(items, currentPath)

Walks the menu tree and returns the trail of items from root to the current path. Returns an empty array if the path is not found in the menu.

```typescript
const trail = menuHelpers.getBreadcrumbs(menu.items, '/products/wollycms');
// [{ title: "Products", ... }, { title: "WollyCMS", ... }]
```

### getChildren(items, identifier)

Returns the direct children of a menu item matched by its href or slug.

```typescript
const subItems = menuHelpers.getChildren(menu.items, '/products');
```

### flattenMenu(items)

Flattens a nested menu tree into a single-level array. Useful for sitemaps or search.

```typescript
const allItems = menuHelpers.flattenMenu(menu.items);
```

## Rendering a navigation bar

```astro
---
import { createClient, menuHelpers } from '@wollycms/astro';

const wolly = createClient({ apiUrl: import.meta.env.CMS_API_URL });
const menu = await wolly.menus.get('main-nav');
const currentPath = Astro.url.pathname;
---

<nav aria-label="Main navigation">
  <ul>
    {menu.items.map((item) => {
      const href = menuHelpers.getItemHref(item);
      const active = menuHelpers.isActive(item, currentPath);
      return (
        <li class:list={[{ active }]}>
          {href ? (
            <a href={href} target={item.target} aria-current={active ? 'page' : undefined}>
              {item.title}
            </a>
          ) : (
            <span>{item.title}</span>
          )}
          {item.children.length > 0 && (
            <ul class="submenu">
              {item.children.map((child) => (
                <li class:list={[{ active: menuHelpers.isActive(child, currentPath) }]}>
                  <a href={menuHelpers.getItemHref(child)} target={child.target}>
                    {child.title}
                  </a>
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

## Rendering breadcrumbs

```astro
---
import { createClient, menuHelpers } from '@wollycms/astro';

const wolly = createClient({ apiUrl: import.meta.env.CMS_API_URL });
const menu = await wolly.menus.get('main-nav');
const currentPath = Astro.url.pathname;
const breadcrumbs = menuHelpers.getBreadcrumbs(menu.items, currentPath);
---

{breadcrumbs.length > 0 && (
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      {breadcrumbs.map((crumb, i) => {
        const href = menuHelpers.getItemHref(crumb);
        const isLast = i === breadcrumbs.length - 1;
        return (
          <li>
            {isLast ? (
              <span aria-current="page">{crumb.title}</span>
            ) : (
              <a href={href}>{crumb.title}</a>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
)}
```

## Footer navigation

```astro
---
const footer = await wolly.menus.get('footer');
---

<footer>
  <div class="footer-columns">
    {footer.items.map((column) => (
      <div class="footer-column">
        <h3>{column.title}</h3>
        <ul>
          {column.children.map((link) => (
            <li>
              <a href={menuHelpers.getItemHref(link)} target={link.target}>
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
</footer>
```

:::tip
Use `item.attributes` to store custom data like CSS classes or icons. Access them in your templates with `item.attributes?.class` or `item.attributes?.icon`.
:::
