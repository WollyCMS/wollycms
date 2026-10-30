---
title: Public AI Discovery
description: Make a WollyCMS and Astro college website accessible to public AI search and retrieval without building an agent service.
---

Make your public website a reliable source for people researching your institution
through search engines and AI assistants. Start with crawler access, accurate
content, and ordinary indexing. A website does not need a custom API, MCP server,
agent registration, or student-facing chatbot to be useful to public AI search.

This guide covers public information only. Keep CMS administration, previews,
student records, and staff systems protected by their existing access controls.
Examples use `college.example`; substitute your own domains and private paths.

## Understand search and training

Providers distinguish several uses of public content:

| Provider | Search or current retrieval | Potential training |
| --- | --- | --- |
| OpenAI | OAI-SearchBot; ChatGPT-User for user-triggered requests | GPTBot |
| Anthropic | Claude-SearchBot; Claude-User for user-triggered requests | ClaudeBot |
| Google | Googlebot for Search; Google-Extended also controls specified Gemini grounding uses | Google-Extended controls specified Gemini training uses |

Check the [official OpenAI crawler documentation](https://developers.openai.com/api/docs/bots),
[Anthropic's crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler),
and [Google's crawler reference](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended)
when you implement your policy. Google-Extended is a robots product token, not a
separate HTTP user agent, and does not control Google Search ranking or inclusion.
User-triggered fetchers can have different robots behavior from automatic crawlers.

Allowing training does not guarantee model inclusion, an update schedule, accurate
answers, or recommendations. For changing college deadlines and requirements,
current retrieval and clear source pages are especially useful.

Google explicitly states that its generative Search features do not use llms.txt
and do not require Markdown or special AI markup. Continue normal SEO and content
maintenance. [Google's guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## Record a baseline

Before editing, record your source commit, runtime versions, deployment target,
current robots.txt, response headers, and the date. Check a short list of useful
pages: campuses, programs, admissions, tuition/aid, the academic calendar, and the
published schedule. Save public evidence separately from private configuration.

Download the [public discovery audit script](/examples/audit-public-discovery.py).
It requires Python 3 and curl, uses no credentials, and does not change your site.
The script was exercised against a local example origin and a live Astro college
site. It reports HTTP responses, canonical URLs, HTML text, sitemap membership,
links from llms.txt, and declared robots access.

```bash
python3 audit-public-discovery.py \
  --origin https://college.example \
  --output before.json
```

The script includes common college paths as starting points. Adjust them for
your site; a guessed path returning 404 is not proof that the institution lacks
that content. Review the real sitemap and navigation. It does not establish
indexing, citations, factual correctness, or actual provider access through a WAF.

User-agent probes imitate a name, not a verified provider identity. Use provider
verification methods and real request logs before claiming that genuine crawlers
can access the site. Do not weaken your WAF based on a spoofed test alone.

## Align robots and edge settings

For a college choosing to allow public search, agent input, and training, a simple
`public/robots.txt` can be:

```text
User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=yes

Disallow: /preview/
Disallow: /pagefind/

Sitemap: https://college.example/sitemap.xml
```

Preserve your actual private path exclusions. The Pagefind exclusion keeps search
index implementation files out of crawling; published pages should remain
discoverable through normal links and the sitemap. Robots directives express
preferences and are not authentication or authorization.

Content-Signal is a content-use preference framework, not a universal replacement
for provider-specific robots rules. An explicit `GPTBot` or `ClaudeBot` exclusion
can still block training access despite `ai-train=yes`. If you maintain separate
bot groups, carry over the private path exclusions into those groups too; a
specific bot group does not simply inherit every wildcard directive.

On Cloudflare, review the **served** robots.txt alongside Security settings and AI
Crawl Control. Bot Preference Sync can prepend restrictions derived from your
search, agent, and training choices. Existing configurations can also expose the
older managed robots setting. Record the original values before adjusting them.

Choose the intended AI policies and check for contradictory managed exclusions.
Do not turn off unrelated WAF rules, Bot Fight Mode, or CMS access controls just
to change robots output. Zone settings may affect other hostnames in the zone;
review those hostnames before making a zone-wide change. API inspection may
require Bot Management read/write and WAF read permissions in addition to a
Workers deployment token. [Cloudflare robots guidance](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).

Re-fetch robots.txt from the public hostname after any change. Confirm the final
file expresses the intended policy, including private exclusions. Check actual
edge enforcement separately: an AI policy set to allow does not bypass unrelated
security rules. A Workers token's ability to deploy code does not prove it can
read or edit bot settings.

## Add response guidance in Astro

An optional Link response header can point to an existing public guide. If you
publish Content-Signal headers, make them consistent with robots and edge policy.
Merge this pattern into your existing middleware; do not replace unrelated
redirect, runtime configuration, security, or cache handling.

```ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const path = context.url.pathname;

  if (path === '/preview' || path.startsWith('/preview/')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Content-Signal', 'search=no, ai-input=no, ai-train=no');
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  } else if (
    response.ok &&
    response.headers.get('Content-Type')?.includes('text/html')
  ) {
    response.headers.set('Content-Signal', 'search=yes, ai-input=yes, ai-train=yes');
    response.headers.append(
      'Link',
      '</llms.txt>; rel="describedby"; type="text/plain"',
    );
  }

  return response;
});
```

This header behavior was tested for public HTML, previews including error
responses, preservation of existing Link values, and non-HTML/error resources.
The exclusions do not replace your preview token validation. Adapt them to all
private routes in your application. Static files may bypass Astro middleware;
check their actual responses instead of assuming SSR header rules cover assets.
Only advertise llms.txt if you actually publish and maintain it.

## Check public HTML and source accuracy

Use a plain HTTP fetch or the audit script before relying on a browser screenshot.
Ensure program names, official detail links, campus labels, semester names, and
requirements appear in the HTML. Content in tabs and accordions can be useful
without JavaScript if it is already present in the document.

For an SSR WollyCMS site, public page data should come from the published content
API. Keep token-authenticated preview data on preview routes. Preserve the
existing renderer and distinguish unavailable source data from an empty result.
In D1-backed list queries, paginate at the supported response limit, commonly
50 records, and verify that the sitemap covers all intended pages.

Check canonical URLs, normal internal links, redirects, page titles, descriptions,
HTTP status, robots directives, and sitemap coverage. Sitemap modification dates
should reflect real source changes. Mark archive years clearly and resolve
contradictory pages. Keep tuition, deadlines, and contact information linked to
their authoritative pages rather than duplicating volatile details everywhere.

If you keep llms.txt, verify every link and summary. Avoid asserting complete
program coverage when the linked page only highlights selected programs. Verify
campus addresses against the official locations page. A campus-events placeholder
with no published events should not be described as an active event listing.

## Treat Markdown as optional

Markdown negotiation can help consumers that request it, but HTML is already a
supported retrieval format. Google does not require Markdown for AI Search.
Measure likely benefit before implementing a custom converter.

Cloudflare's automatic Markdown for Agents is available on eligible paid website
zone plans. Workers Paid, R2 billing, and Zero Trust subscriptions are separate.
A Free website zone with Workers Paid can instead implement conversion in Astro,
using the same published content and existing compute allowance. That still adds
processing and maintenance. [Markdown availability](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/).

If implemented, test `Accept: text/markdown`, its response media type, equivalent
source content, preview restrictions, and cache separation with `Vary: Accept`.
Do not introduce model inference or a paid conversion service solely to satisfy a
scanner. This guide's tested baseline does not depend on Markdown conversion.

## Deploy and verify

Review the diff for secrets, confirm environment files are ignored, run your
project's checks and build, and deploy through its normal workflow. A policy
change may involve both a site release and a separate Cloudflare setting.

```bash
npm run build
python3 audit-public-discovery.py \
  --origin https://college.example \
  --output after.json
```

Compare before/after results and verify:

- Important public pages return usable HTML, canonical URLs, and source links.
- The final robots response permits intended bots and retains private exclusions.
- Public response permissions do not appear on protected previews or error pages.
- Missing/invalid preview credentials still fail; CMS administration retains its
  existing authentication.
- Existing redirect, download, and media behavior remains intact.

This validates delivery, not search-engine inclusion or ranking. Use your existing
webmaster tools for indexing and provider logs for actual crawler behavior.

## Monitor costs and recover

Permission changes can increase ordinary HTML crawling even without APIs or MCP.
Watch requests, CPU, CMS/database activity, error rates, and cache effectiveness
against account-wide allowances. Avoid per-request full-CMS scans, verbose logs,
and new paid services. Rate limits and alerts are useful controls, not a universal
hard spending cap.

Keep the previous site commit and exact prior edge settings. To recover, revert
only the relevant site change through the normal release workflow and restore
the recorded crawler settings. Re-fetch robots and headers; do not assume code
rollback also restores edge policy. Monitor usage during the initial pilot.

Track a small dated set of real public questions, source/citation accuracy,
observable referrals, and indexed priority pages. Assistant answers vary; changes
in a few answers or referral counts do not prove causation. Do not use a generic
agent-readiness score as the success criterion.

## When APIs and MCP become useful

Revisit versioned APIs and MCP when a real application or partner needs to query
college information. Until then, missing API catalogs, MCP cards, agent skills,
DNS-AID, or authentication metadata are not reasons to build those services for
ordinary public AI crawling. Keep those projects separate from this baseline.
