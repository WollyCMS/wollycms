---
title: Tracking Scripts
description: Manage analytics and tracking code through the WollyCMS admin.
---

WollyCMS lets you manage tracking scripts (Google Analytics, Plausible, custom pixels, etc.) from the admin UI without touching your frontend code.

## Adding tracking scripts

Navigate to **System → Tracking** in the admin UI. Add scripts with:

- **Name** — Descriptive label (e.g., "Google Analytics", "Facebook Pixel")
- **Code** — The script tag or inline JavaScript
- **Position** — Head or body placement
- **Enabled** — Toggle scripts on/off without deleting them

## How it works

Tracking scripts are stored in the CMS and served via the content API. Your Astro layout fetches them and injects them into the page:

```astro
---
import { getWolly } from '../lib/wolly';

const scripts = await getWolly().tracking.list();
const headScripts = scripts.filter(s => s.position === 'head');
const bodyScripts = scripts.filter(s => s.position === 'body');
---

<html>
  <head>
    {headScripts.map(s => <Fragment set:html={s.code} />)}
  </head>
  <body>
    <slot />
    {bodyScripts.map(s => <Fragment set:html={s.code} />)}
  </body>
</html>
```

## Use cases

- **Analytics** — Google Analytics, Plausible, Fathom, Matomo
- **Tag managers** — Google Tag Manager, Segment
- **Conversion pixels** — Facebook, LinkedIn, Twitter
- **Chat widgets** — Intercom, Crisp, Drift
- **Custom scripts** — Any JavaScript you want managed through the CMS

## Benefits

- **Non-developers can manage tracking** — No code deployments needed
- **Toggle without deploys** — Enable/disable scripts instantly
- **Centralized management** — All tracking code in one place
- **Per-environment control** — Different scripts for staging vs production

:::caution
Tracking scripts execute arbitrary JavaScript on your site. Only grant access to trusted users and review scripts before enabling them.
:::
