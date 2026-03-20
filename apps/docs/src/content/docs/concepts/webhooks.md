---
title: Webhooks
description: Event-driven notifications when content changes in WollyCMS.
---

Webhooks let you trigger external actions when content changes — rebuild your frontend, clear a CDN cache, notify a Slack channel, or sync content to another system.

## Setting up webhooks

Navigate to **System → Webhooks** in the admin UI and click **+ New Webhook**.

Configure:
- **URL** — The endpoint to receive POST requests
- **Events** — Which events trigger the webhook
- **Secret** — Optional shared secret for verifying request signatures

## Available events

| Event | Fires when |
|-------|-----------|
| `page.created` | A new page is created |
| `page.updated` | A page's content or metadata changes |
| `page.published` | A page is published |
| `page.unpublished` | A page is unpublished |
| `page.deleted` | A page is deleted |
| `menu.updated` | A menu's items change |
| `media.uploaded` | A new media file is uploaded |
| `media.deleted` | A media file is deleted |

## Payload format

Webhook payloads are sent as JSON POST requests:

```json
{
  "event": "page.updated",
  "timestamp": "2026-03-20T14:30:00.000Z",
  "data": {
    "id": 1,
    "type": "blog_post",
    "title": "My Post",
    "slug": "my-post",
    "status": "published"
  }
}
```

## Common use cases

### Trigger a frontend rebuild

Point a webhook at your CI/CD pipeline's trigger URL. When content changes, your Astro site rebuilds automatically.

### Clear CDN cache

Send a purge request to Cloudflare, Fastly, or your CDN when pages are updated.

### Slack notifications

Use a Slack incoming webhook URL to notify your team when content is published.

:::tip
Webhooks fire asynchronously — they don't block the admin UI. If a webhook endpoint is down, the content operation still succeeds.
:::
