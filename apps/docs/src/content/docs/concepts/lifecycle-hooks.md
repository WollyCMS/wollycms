---
title: Lifecycle Hooks
description: Run custom server-side logic before or after content operations — validation, transformation, notifications, and integrations.
---

Lifecycle hooks let you run custom code when content is created, updated, published, or deleted. Unlike webhooks (which fire HTTP requests to external URLs), lifecycle hooks run inside the WollyCMS server process and can modify data or block operations.

## Overview

| Hook | When it runs | Can block? | Can modify data? |
|---|---|---|---|
| `beforeCreate` | Before a page is inserted | Yes | Yes (via `context.data`) |
| `afterCreate` | After a page is inserted | No | No |
| `beforeUpdate` | Before a page is updated | Yes | Yes |
| `afterUpdate` | After a page is updated | No | No |
| `beforeDelete` | Before a page is deleted | Yes | No |
| `afterDelete` | After a page is deleted | No | No |
| `beforePublish` | Before a page transitions to published | Yes | Yes |
| `afterPublish` | After a page is published | No | No |
| `beforeUnpublish` | Before a page is unpublished | Yes | Yes |
| `afterUnpublish` | After a page is unpublished | No | No |

Additional hooks are available for media and blocks: `beforeUpload`, `afterUpload`, `beforeMediaDelete`, `afterMediaDelete`, `beforeBlockCreate`, `afterBlockCreate`, `beforeBlockUpdate`, `afterBlockUpdate`, `beforeBlockDelete`, `afterBlockDelete`.

## Registering hooks

Import the `hooks` registry and call `hooks.on()`:

```typescript
import { hooks } from '@wollycms/server/hooks';

// Block publishing if title is too short
hooks.on('beforePublish', async ({ data }) => {
  if (data?.title && String(data.title).length < 10) {
    throw new Error('Title must be at least 10 characters to publish');
  }
});

// Sync to external search index after publish
hooks.on('afterPublish', async ({ entity, id }) => {
  await fetch('https://search.example.com/index', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title: entity?.title }),
  });
});
```

## Hook context

Every hook handler receives a `HookContext` object:

```typescript
interface HookContext {
  entity?: Record<string, unknown>;  // The existing entity (for update/delete)
  data?: Record<string, unknown>;    // Input data (for create/update) — mutable in "before" hooks
  id?: number;                       // Entity ID (for update/delete)
  user?: { id: number; email: string; role: string };  // The authenticated user
}
```

## "before" hooks

- Run **sequentially** before the database operation
- Can **throw** to abort the operation — the error message is returned to the client as a 400 response
- Can **modify `context.data`** to transform input before it's saved
- If multiple handlers are registered, they run in registration order

```typescript
// Transform data before save
hooks.on('beforeCreate', async ({ data }) => {
  if (data?.title) {
    data.title = String(data.title).trim();
  }
});

// Block deletion of important pages
hooks.on('beforeDelete', async ({ entity }) => {
  if (entity?.slug === 'home') {
    throw new Error('Cannot delete the home page');
  }
});
```

## "after" hooks

- Run **sequentially** after the database operation
- **Cannot** block the operation (it already happened)
- Errors are **logged** but don't affect the API response
- Use for side effects: notifications, cache invalidation, external syncs

```typescript
// Send Slack notification on new page
hooks.on('afterCreate', async ({ entity, user }) => {
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `${user?.email} created "${entity?.title}"`,
    }),
  });
});
```

## Removing hooks

```typescript
const handler = async ({ entity }) => { /* ... */ };

// Register
hooks.on('afterPublish', handler);

// Remove specific handler
hooks.off('afterPublish', handler);

// Remove all handlers for an event
hooks.clear('afterPublish');

// Remove all handlers
hooks.clear();
```

## Where to register hooks

Register hooks in your server entry point or a dedicated hooks file that runs at startup. For self-hosted deployments, create a `hooks.ts` file and import it in your server entry:

```typescript
// hooks-setup.ts
import { hooks } from './hooks.js';

hooks.on('beforePublish', async ({ data }) => {
  // Your custom logic
});
```

For Cloudflare Workers deployments, register hooks in the worker entry point before the Hono app handles requests.

## Relationship to webhooks

| Feature | Lifecycle Hooks | Webhooks |
|---|---|---|
| Where it runs | Inside the server process | External HTTP endpoint |
| Can block operations | Yes ("before" hooks) | No |
| Can modify data | Yes ("before" hooks) | No |
| Requires code deployment | Yes | No (configured in admin UI) |
| Use case | Validation, transformation, server-side logic | External notifications, CI/CD triggers |

Use hooks for logic that must run reliably (validation, data transformation). Use webhooks for fire-and-forget notifications to external services.
