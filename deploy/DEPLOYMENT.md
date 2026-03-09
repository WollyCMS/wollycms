# WollyCMS Production Deployment

## Architecture

```
Internal Server                      Public CDN / Hosting
──────────────────────               ──────────────────
WollyCMS API (Docker)                Static Site Host
wollycms.internal:4321               your-site.example.com
  |                                    ^
  +-- webhook on content publish ----->+ triggers rebuild
                                       |
                                  Astro SSG builds,
                                  fetches from WollyCMS API
```

- WollyCMS server runs as a Docker container (internal only)
- Admin UI served by the same container
- Astro site deployed as static HTML to your hosting provider
- Content changes trigger a deploy hook via WollyCMS webhooks

## Prerequisites

- Git repo hosting (Forgejo, Gitea, GitHub, etc.)
- CI runner operational
- `REGISTRY_TOKEN` secret set in repo settings
- Docker + Docker Compose on your server

## Step 1: Set Up CI

The workflow at `.forgejo/workflows/build-push.yml` handles this automatically.
On push to `main`:
1. Runs tests (npm test)
2. Builds Docker image from Dockerfile
3. Pushes to your container registry

### Required CI Secrets

In your repo settings, add:
- `REGISTRY_TOKEN`: Access token with `package:write` scope

### Required CI Variables

- `REGISTRY_HOST`: Your container registry hostname (e.g., `registry.example.com`)

## Step 2: Deploy on Server

```bash
# SSH into your server
ssh your-server

# Create compose directory
sudo mkdir -p /srv/compose/wollycms
sudo mkdir -p /path/to/appdata/wollycms/data
sudo mkdir -p /path/to/appdata/wollycms/uploads

# Copy compose.yaml (from this repo's deploy/ folder, or create manually)
sudo cp compose.yaml /srv/compose/wollycms/compose.yaml

# Create .env with production secrets
sudo tee /srv/compose/wollycms/.env << 'EOF'
JWT_SECRET=<generate with: openssl rand -base64 32>
CORS_ORIGINS=https://your-site.example.com
SITE_URL=https://your-site.example.com
EOF

# Login to your container registry (first time only)
docker login your-registry.example.com

# Start the service
cd /srv/compose/wollycms
docker compose up -d

# Verify
docker logs wollycms-wollycms-1 --follow
curl http://localhost:4321/api/health
```

## Step 3: Add Reverse Proxy Route

Example using Caddy:

```
wollycms.internal {
    reverse_proxy host.docker.internal:4321
}
```

Then reload:
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Step 4: Initial Setup

1. Open your WollyCMS admin URL in browser
2. Log in with default credentials: `admin@wollycms.local` / `admin123`
3. **Immediately change the password** via the admin UI
4. Create your content types, blocks, and pages

## Step 5: Astro Frontend Site

This is a separate repo/project:

1. Create Astro site repo
2. Deploy to your hosting provider (Cloudflare Pages, Vercel, Netlify, etc.)
3. Set environment variable `WOLLY_API_URL=https://wollycms.internal`
4. In WollyCMS admin, add a webhook:
   - URL: Your hosting provider's deploy hook URL
   - Events: `page.published`, `page.updated`, `page.deleted`
   - This triggers a site rebuild when content changes

## Watchtower Auto-Updates

The compose.yaml includes the watchtower label. When you push to main:
1. CI builds and pushes new image
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
| WollyCMS API + Admin | 4321 | Internal only (behind reverse proxy) |

## Data Locations

| Path | Contents |
|------|----------|
| `/path/to/appdata/wollycms/data/` | SQLite database (wolly.db) |
| `/path/to/appdata/wollycms/uploads/` | Uploaded media files |

## Backup

The SQLite database and uploads directory should be included in your backup strategy:
```bash
# Example: add to restic/borg backup paths
/path/to/appdata/wollycms/
```
