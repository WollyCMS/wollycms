# WollyCMS Deployment Checklist

## Phase A: CI/CD Pipeline
- [ ] Add `REGISTRY_TOKEN` secret to your repo settings
- [ ] Set `REGISTRY_HOST` variable in repo settings (your container registry hostname)
- [ ] Push code to trigger first CI build
- [ ] Verify Docker image appears in container registry
- [ ] Verify tests pass in CI

## Phase B: Server Deployment
- [ ] Create compose directory on server (e.g., `/srv/compose/wollycms/`)
- [ ] Copy `compose.yaml` to server
- [ ] Create `.env` with generated JWT_SECRET (see `.env.example`)
- [ ] Create data and uploads directories
- [ ] Login to container registry on server (`docker login`)
- [ ] `docker compose up -d` and verify container starts
- [ ] Verify health endpoint: `curl http://localhost:4321/api/health`

## Phase C: Reverse Proxy + DNS
- [ ] Add reverse proxy rule for WollyCMS (see `caddy-snippet.txt` for Caddy example)
- [ ] Reload reverse proxy
- [ ] Add DNS record pointing to your server
- [ ] Verify admin UI accessible via HTTPS

## Phase D: Initial Content Setup
- [ ] Visit admin URL — onboarding page creates first admin account
- [ ] Set up content types
- [ ] Create initial block types (hero, rich text, code block, etc.)
- [ ] Create a few test pages/posts

## Phase E: Astro Frontend Site (separate project)
- [ ] Create new Astro project
- [ ] Wire up WollyCMS content API fetching at build time
- [ ] Deploy to your hosting provider
- [ ] Set `WOLLY_API_URL` environment variable

## Phase F: Webhook Integration
- [ ] Get deploy hook URL from your hosting provider
- [ ] Add webhook in WollyCMS admin pointing to deploy hook
- [ ] Test: publish a page in WollyCMS, verify site rebuilds

## Phase G: Hardening
- [ ] Add data/uploads directories to backup paths
- [ ] Verify Watchtower picks up new images automatically (if using Watchtower)
- [ ] Test recovery: stop container, restart, verify data persists
