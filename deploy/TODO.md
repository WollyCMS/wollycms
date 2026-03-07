# WollyCMS Deployment TODO

## Phase A: CI/CD Pipeline
- [ ] Add `REGISTRY_TOKEN` secret to WollyCms repo on Forgejo
- [ ] Push code to trigger first CI build
- [ ] Verify Docker image appears in Forgejo container registry
- [ ] Verify tests pass in CI

## Phase B: Mothership Deployment
- [ ] Create `/srv/compose/wollycms/` directory on mothership
- [ ] Copy `compose.yaml` to mothership
- [ ] Create `.env` with generated JWT_SECRET
- [ ] Create `/tank/appdata/wollycms/data/` and `uploads/` directories
- [ ] Login to Forgejo registry on mothership (`docker login`)
- [ ] `docker compose up -d` and verify container starts
- [ ] Verify health endpoint: `curl http://localhost:4321/api/health`

## Phase C: Caddy + DNS
- [ ] Add `wollycms.home.cwolly.com` block to Caddyfile
- [ ] Reload Caddy
- [ ] Add DNS record for `wollycms.home.cwolly.com` in Pi-hole/Cloudflare
- [ ] Verify admin UI accessible at `https://wollycms.home.cwolly.com`

## Phase D: Initial Content Setup
- [ ] Log in and change default admin password
- [ ] Set up content types for cwolly.com (blog posts, pages)
- [ ] Create initial block types (hero, rich text, code block, etc.)
- [ ] Create a few test pages/posts

## Phase E: cwolly.com Astro Site (separate project)
- [ ] Create new Astro project for cwolly.com
- [ ] Design site theme (personal blog/portfolio)
- [ ] Wire up WollyCMS content API fetching at build time
- [ ] Deploy to Cloudflare Pages
- [ ] Configure custom domain `cwolly.com` in Cloudflare Pages
- [ ] Set `WOLLY_API_URL` environment variable in Cloudflare Pages

## Phase F: Webhook Integration
- [ ] Get Cloudflare Pages deploy hook URL
- [ ] Add webhook in WollyCMS admin pointing to deploy hook
- [ ] Test: publish a page in WollyCMS, verify cwolly.com rebuilds
- [ ] Verify full content pipeline: edit in admin -> publish -> site updates

## Phase G: Hardening
- [ ] Add `/tank/appdata/wollycms/` to backup paths
- [ ] Verify Watchtower picks up new images automatically
- [ ] Update mothership environment.md with WollyCMS entry
- [ ] Test recovery: stop container, restart, verify data persists

## Notes
- WollyCMS port: 4321 (internal only, behind Caddy)
- Admin UI: wollycms.home.cwolly.com (internal, home network + Tailscale)
- Public site: cwolly.com (Cloudflare Pages, static Astro)
- Database: SQLite at /tank/appdata/wollycms/data/wolly.db
- Media: /tank/appdata/wollycms/uploads/
