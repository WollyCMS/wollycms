import type { MenuItem } from '../types.js';

/** Get the href for a menu item */
export function getItemHref(item: MenuItem): string | null {
  if (item.url) return item.url;
  if (item.page_slug) return `/${item.page_slug}`;
  return null;
}

/** Check if a menu item or any of its children match the current path */
export function isActive(item: MenuItem, currentPath: string): boolean {
  const href = getItemHref(item);
  const normalized = currentPath.replace(/\/+$/, '') || '/';

  if (href) {
    const normalizedHref = href.replace(/\/+$/, '') || '/';
    if (normalizedHref === normalized) return true;
  }

  return item.children.some((child) => isActive(child, currentPath));
}

/** Get the breadcrumb trail from a menu tree to the current path */
export function getBreadcrumbs(
  items: MenuItem[],
  currentPath: string,
): MenuItem[] {
  const normalized = currentPath.replace(/\/+$/, '') || '/';

  for (const item of items) {
    const href = getItemHref(item);
    const normalizedHref = href ? href.replace(/\/+$/, '') || '/' : null;

    if (normalizedHref === normalized) {
      return [item];
    }

    if (item.children.length > 0) {
      const trail = getBreadcrumbs(item.children, currentPath);
      if (trail.length > 0) {
        return [item, ...trail];
      }
    }
  }

  return [];
}

/** Get direct children of a menu item by its slug or URL */
export function getChildren(
  items: MenuItem[],
  identifier: string,
): MenuItem[] {
  for (const item of items) {
    const href = getItemHref(item);
    if (href === identifier || href === `/${identifier}`) {
      return item.children;
    }
    const found = getChildren(item.children, identifier);
    if (found.length > 0) return found;
  }
  return [];
}

/** Flatten a menu tree into a list */
export function flattenMenu(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.children.length > 0) {
      result.push(...flattenMenu(item.children));
    }
  }
  return result;
}
