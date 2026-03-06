/**
 * Simple in-memory cache with TTL for content API responses.
 * Invalidated on admin writes (page/menu/block/media mutations).
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 30_000; // 30 seconds

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

/** Invalidate all entries matching a prefix (e.g. "pages:" or "menus:"). */
export function cacheInvalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

/** Invalidate everything. Called on bulk operations. */
export function cacheClear(): void {
  store.clear();
}

/** Number of cached entries (for health/debug). */
export function cacheSize(): number {
  return store.size;
}
