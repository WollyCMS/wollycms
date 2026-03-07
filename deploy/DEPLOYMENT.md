# WollyCMS Production Deployment

## Architecture

```
Mothership (internal)                Cloudflare (public)
──────────────────────               ──────────────────
WollyCMS API (Docker)                Cloudflare Pages
wollycms.home.cwolly.com:4321        cwolly.com
  |                                    ^
  +-- webhook on content publish ----->+ triggers rebuild
                                       |
                                  Astro SSG builds,
                                  fetches from WollyCMS API
```

- WollyCMS server runs on mothership as a Docker container (internal only)
- Admin UI served by the same container at wollycms.home.cwolly.com
- Astro site (cwolly.com) deployed as static HTML to Cloudflare Pages
- Content changes trigger a Cloudflare Pages deploy hook via WollyCMS webhooks

## Prerequisites

- Forgejo repo: `chad/WollyCms`
- Forgejo runner operational
- `REGISTRY_TOKEN` secret set in Forgejo repo settings
- Docker + Docker Compose on mothership

## Step 1: Set Up Forgejo CI

The workflow at `.forgejo/workflows/build-push.yml` handles this automatically.
On push to `main`:
1. Runs tests (npm test)
2. Builds Docker image from Dockerfile
3. Pushes to `forgejo.home.cwolly.com/chad/wollycms:latest`

### Required Forgejo Secret

Go to WollyCms repo > Settings > Actions > Secrets and add:
- `REGISTRY_TOKEN`: Your Forgejo access token with `package:write` scope

## Step 2: Deploy on Mothership

```bash
# SSH into mothership
ssh mothership

# Create compose directory
sudo mkdir -p /srv/compose/wollycms
sudo mkdir -p /tank/appdata/wollycms/data
sudo mkdir -p /tank/appdata/wollycms/uploads

# Copy compose.yaml (from this repo's deploy/ folder, or create manually)
sudo cp compose.yaml /srv/compose/wollycms/compose.yaml

# Create .env with production secrets
sudo tee /srv/compose/wollycms/.env << 'EOF'
JWT_SECRET=<generate with: openssl rand -base64 32>
CORS_ORIGINS=https://cwolly.com
SITE_URL=https://cwolly.com
EOF

# Login to Forgejo registry (first time only)
docker login forgejo.home.cwolly.com

# Start the service
cd /srv/compose/wollycms
docker compose up -d

# Verify
docker logs wollycms-wollycms-1 --follow
curl http://localhost:4321/api/health
```

## Step 3: Add Caddy Route

Edit `/srv/compose/caddy/Caddyfile` and add:

```
wollycms.home.cwolly.com {
    import home_tls
    reverse_proxy host.docker.internal:4321
}
```

Then reload Caddy:
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Step 4: Initial Setup

1. Open `https://wollycms.home.cwolly.com` in browser
2. Log in with default credentials: `admin@wollycms.local` / `admin123`
3. **Immediately change the password** via the admin UI
4. Create your content types, blocks, and pages for cwolly.com

## Step 5: Cloudflare Pages (cwolly.com Astro site)

This is a separate repo/project. See the cwolly.com project for details.

1. Create Astro site repo on Forgejo
2. Connect Cloudflare Pages to the repo (or use Wrangler CLI to deploy)
3. Set environment variable `WOLLY_API_URL=https://wollycms.home.cwolly.com`
4. In WollyCMS admin, add a webhook:
   - URL: Cloudflare Pages deploy hook URL
   - Events: `page.published`, `page.updated`, `page.deleted`
   - This triggers a site rebuild when content changes

## Step 6: DNS (Cloudflare)

In Cloudflare dashboard for cwolly.com:
- Cloudflare Pages deployment handles DNS automatically
- No A record needed — Pages provides its own domain routing

## Watchtower Auto-Updates

The compose.yaml includes the watchtower label. When you push to main:
1. Forgejo CI builds and pushes new image
2. Watchtower detects the update (hourly check)
3. Container is automatically restarted with the new image

For immediate updates:
```bash
cd /srv/compose/wollycms
docker compose pull && docker compose up -d
```

## Ports

| Service | Port | Access |
|---------|------|--------|
| WollyCMS API + Admin | 4321 | wollycms.home.cwolly.com (internal) |

## Data Locations

| Path | Contents |
|------|----------|
| `/tank/appdata/wollycms/data/` | SQLite database (wolly.db) |
| `/tank/appdata/wollycms/uploads/` | Uploaded media files |

## Backup

The SQLite database and uploads directory are under `/tank/appdata/wollycms/`.
Add to existing backup strategy:
```bash
# Add to restic backup paths
/tank/appdata/wollycms/
```
