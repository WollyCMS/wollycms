/**
 * Lifecycle hook system for WollyCMS.
 *
 * Plugins and custom code register hooks that run before/after
 * content operations. Hooks can modify data (before*) or react
 * to changes (after*).
 *
 * Usage:
 *   import { hooks } from './hooks.js';
 *
 *   // Block publishing if title is empty
 *   hooks.on('beforePublish', async ({ page }) => {
 *     if (!page.title) throw new Error('Title is required to publish');
 *   });
 *
 *   // Sync to external search after publish
 *   hooks.on('afterPublish', async ({ page }) => {
 *     await fetch('https://search.example.com/index', {
 *       method: 'POST',
 *       body: JSON.stringify({ id: page.id, title: page.title }),
 *     });
 *   });
 *
 * "before" hooks can:
 *   - Throw to abort the operation (error returned to client)
 *   - Modify context.data to transform input before save
 *
 * "after" hooks can:
 *   - Perform side effects (notifications, sync, etc.)
 *   - Errors are logged but don't affect the response
 */

/** All supported lifecycle events. */
export type HookEvent =
  // Page lifecycle
  | 'beforeCreate' | 'afterCreate'
  | 'beforeUpdate' | 'afterUpdate'
  | 'beforeDelete' | 'afterDelete'
  | 'beforePublish' | 'afterPublish'
  | 'beforeUnpublish' | 'afterUnpublish'
  // Media lifecycle
  | 'beforeUpload' | 'afterUpload'
  | 'beforeMediaDelete' | 'afterMediaDelete'
  // Block lifecycle
  | 'beforeBlockCreate' | 'afterBlockCreate'
  | 'beforeBlockUpdate' | 'afterBlockUpdate'
  | 'beforeBlockDelete' | 'afterBlockDelete';

/** Context passed to hook handlers. Shape varies by event. */
export interface HookContext {
  /** The entity being operated on (page, block, media). */
  entity?: Record<string, unknown>;
  /** The input data for create/update operations. Mutable in "before" hooks. */
  data?: Record<string, unknown>;
  /** The entity ID (for update/delete). */
  id?: number;
  /** The authenticated user performing the action. */
  user?: { id: number; email: string; role: string };
}

type HookHandler = (context: HookContext) => Promise<void> | void;

class HookRegistry {
  private handlers = new Map<HookEvent, HookHandler[]>();

  /** Register a hook handler for an event. */
  on(event: HookEvent, handler: HookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /** Remove a specific handler. */
  off(event: HookEvent, handler: HookHandler): void {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  /** Remove all handlers for an event, or all handlers if no event specified. */
  clear(event?: HookEvent): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Run all handlers for a "before" event. Runs sequentially.
   * Throws if any handler throws (aborts the operation).
   */
  async runBefore(event: HookEvent, context: HookContext): Promise<void> {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) return;
    for (const handler of list) {
      await handler(context);
    }
  }

  /**
   * Run all handlers for an "after" event. Runs sequentially.
   * Errors are logged but not thrown (don't break the response).
   */
  async runAfter(event: HookEvent, context: HookContext): Promise<void> {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) return;
    for (const handler of list) {
      try {
        await handler(context);
      } catch (err) {
        console.error(`[hooks] Error in ${event} handler:`, err);
      }
    }
  }

  /** Check if any handlers are registered for an event. */
  has(event: HookEvent): boolean {
    const list = this.handlers.get(event);
    return !!list && list.length > 0;
  }
}

/** Global hook registry. Import this to register or trigger hooks. */
export const hooks = new HookRegistry();
