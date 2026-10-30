# October 2026 dependency maintenance

The docs application has its own package manifest, lockfile, and deployment.
This update refreshes Astro to 7.4.4, the Cloudflare adapter to 14.4.3, Sharp to
0.35.5, Vite to 8.3.5, Wrangler to 4.156.0, and compatible transitive patches.
It requires Node >=22.23.4 to build.

The deployment workflow resolves the current Node 22 patch and uses Wrangler
4.156.0, matching the refreshed docs toolchain instead of the older CLI pin.

A clean `npm ci` followed by `npm run build` succeeds, including all 44 generated
HTML routes and Pagefind indexing. The older satteri WASM resolution failure does
not recur. The lockfile audit has no critical/high findings; one moderate remains.

This changes no docs content, bindings, compatibility date, or CMS database.
Deploy only after required PR checks pass; keep a previous docs Worker version
available for rollback. The CMS automatic-release hold is independent of this
docs-only deployment workflow.
