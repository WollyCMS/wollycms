# Deploying SpacelyCMS

## Quick Deploy with Docker

The fastest way to deploy SpacelyCMS is with Docker Compose.

### 1. Clone and configure

```bash
git clone <your-repo> spacelycms && cd spacelycms
cp .env.example .env
```

Edit `.env`:
```bash
JWT_SECRET=<generate-a-random-64-char-hex-string>
SITE_URL=https://www.yoursite.com
CORS_ORIGINS=https://cms.yoursite.com
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```

### 2. Start with Docker Compose

**Development:**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**Production (with Caddy HTTPS):**

Edit `Caddyfile` — replace `cms.example.com` with your domain:
```
cms.yoursite.com {
    reverse_proxy spacelycms:4321
    encode gzip zstd
    # ... (security headers included by default)
}
```

```bash
docker compose -f docker-compose.prod.yml up -d
```

Caddy automatically provisions Let's Encrypt certificates.

### 3. Choose a database

**SQLite (default — zero config):**
```bash
# .env
DATABASE_URL=sqlite:./data/spacely.db
```

**PostgreSQL (production scale):**
```bash
# .env
DATABASE_URL=postgresql://spacely:secretpassword@db:5432/spacely
```

When using PostgreSQL with Docker Compose, add a Postgres service to your compose file:
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: spacely
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: spacely
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spacely"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 4. Initialize the database

```bash
docker compose exec spacelycms node packages/server/dist/cli.js migrate
docker compose exec spacelycms node packages/server/dist/cli.js seed
```

Migrations and seeds auto-detect the dialect from `DATABASE_URL`.

### 5. Access the admin

Open `https://cms.yoursite.com/admin`

Default credentials: `admin@spacelycms.local` / `admin123`

**Change the default password immediately** in Settings > Users.

---

## Recommended Production Architecture

The recommended way to run SpacelyCMS in production is a three-layer
architecture using Cloudflare services. This gives you zero open ports,
global CDN media delivery, and edge-hosted static pages — all on
commodity hardware.

```
┌─────────────────────────────────┐
│       Your Infrastructure       │
│                                 │
│   SpacelyCMS Server (:4321)     │
│   SQLite or PostgreSQL          │
│         │                       │
│    cloudflared tunnel           │
└────────┬────────────────────────┘
         │ encrypted tunnel (no open ports)
         ▼
┌──────────────────────────────────────────────────────────┐
│                     Cloudflare                            │
│                                                           │
│  ┌─────────────────┐  ┌────────────────┐  ┌───────────┐  │
│  │ Cloudflare      │  │ Cloudflare R2  │  │ Cloudflare│  │
│  │ Tunnel          │  │ (media bucket) │  │ Pages     │  │
│  │                 │  │                │  │           │  │
│  │ cms.yoursite.com│  │ media.yoursite │  │ yoursite  │  │
│  │ → localhost:4321│  │ .com (CDN)     │  │ .com      │  │
│  └─────────────────┘  └────────────────┘  └───────────┘  │
│                                                           │
│  Admin UI + API        Images, video,      Astro static   │
│  (authenticated)       documents (global)  site (edge)    │
└──────────────────────────────────────────────────────────┘
```

**Why this setup?**

- **No open ports** — `cloudflared` creates an outbound tunnel; your server
  never listens on a public IP.
- **No egress fees** — R2 has zero egress costs, unlike AWS S3.
- **Global edge** — Media and the Astro site are served from 300+ PoPs.
- **Automatic rebuilds** — A SpacelyCMS webhook triggers Cloudflare Pages
  to rebuild when content changes.

### 1. Set up a Cloudflare Tunnel

Install `cloudflared` and create a tunnel that points to your local CMS:

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# Authenticate with Cloudflare
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create spacelycms

# Route your CMS domain to the tunnel
cloudflared tunnel route dns spacelycms cms.yoursite.com

# Run the tunnel (points to your local CMS server)
cloudflared tunnel --url http://localhost:4321 run spacelycms
```

For production, run `cloudflared` as a systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Your CMS admin is now accessible at `https://cms.yoursite.com` with no
open ports on your server.

### 2. Set up Cloudflare R2 for media

1. In the Cloudflare dashboard, go to **R2 Object Storage** and create a
   bucket (e.g., `spacely-media`).
2. Under **Settings > Public access**, connect a custom domain
   (e.g., `media.yoursite.com`).
3. Under **Manage R2 API Tokens**, create an API token with read/write
   access to the bucket. Note the **Access Key ID** and **Secret Access Key**.
4. Find your **Account ID** in the Cloudflare dashboard sidebar.

Add to your `.env`:

```bash
MEDIA_STORAGE=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=spacely-media
S3_REGION=auto
S3_ACCESS_KEY=<your-r2-access-key-id>
S3_SECRET_KEY=<your-r2-secret-access-key>
S3_PUBLIC_URL=https://media.yoursite.com
```

R2 is S3-compatible, so SpacelyCMS uses the standard S3 client internally.
Set `S3_REGION=auto` — R2 ignores regions but the S3 SDK requires a value.

### 3. Deploy the Astro frontend to Cloudflare Pages

1. Push your Astro site to a Git repository (GitHub or GitLab).
2. In the Cloudflare dashboard, go to **Pages** and create a new project
   from your repository.
3. Set the build command to `npm run build` and the output directory to
   `dist/`.
4. Add environment variable `PUBLIC_CMS_URL=https://cms.yoursite.com`.
5. Note the **Deploy Hook URL** from **Settings > Builds & deployments >
   Deploy hooks** (create one named "spacely-publish").

In the SpacelyCMS admin, go to **Webhooks** and create a webhook:

- **URL**: the Cloudflare Pages deploy hook URL
- **Events**: `page.published`, `page.unpublished`, `page.deleted`

Now when you publish content in the CMS, Cloudflare Pages automatically
rebuilds and deploys the Astro site.

---

## Manual Deployment (No Docker)

### Prerequisites

- Node.js 22 LTS
- npm 10+
- PostgreSQL 16+ (optional — SQLite works out of the box)

### Steps

```bash
git clone <your-repo> spacelycms && cd spacelycms
npm install
npm run build

# Configure
cp .env.example .env
# Edit .env with production values
# For PostgreSQL: DATABASE_URL=postgresql://user:pass@localhost:5432/spacely

# Initialize database (auto-detects SQLite or PostgreSQL from DATABASE_URL)
node packages/server/dist/cli.js migrate
node packages/server/dist/cli.js seed

# Start
NODE_ENV=production node packages/server/dist/index.js
```

### Process Manager (PM2)

```bash
npm install -g pm2

pm2 start packages/server/dist/index.js \
  --name spacelycms \
  --env production

pm2 save
pm2 startup
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name cms.yoursite.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cms.yoursite.com;

    ssl_certificate /etc/letsencrypt/live/cms.yoursite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cms.yoursite.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Connecting an Astro Frontend

### 1. Create the Astro site

```bash
npm create astro@latest my-site
cd my-site
npm install @spacelycms/astro
```

### 2. Configure the client

```typescript
// src/lib/spacely.ts
import { createClient } from '@spacelycms/astro';

export const cms = createClient({
  apiUrl: 'https://cms.yoursite.com/api/content',
});
```

### 3. Fetch pages

```astro
---
// src/pages/[...slug].astro
import { cms } from '../lib/spacely';

export async function getStaticPaths() {
  const { data } = await cms.pages.list({ limit: 100 });
  return data.map((page) => ({
    params: { slug: page.slug === 'home' ? undefined : page.slug },
    props: { slug: page.slug },
  }));
}

const { slug } = Astro.props;
const page = await cms.pages.getBySlug(slug || 'home');
---
```

### 4. Set up build webhooks

In SpacelyCMS admin, go to Webhooks and create a webhook pointing to your
Astro hosting platform's deploy hook URL. Subscribe to `page.published`,
`page.unpublished`, and `page.deleted` events.

---

## Backups

### Export data

```bash
# CLI
spacely export > backup-$(date +%Y%m%d).json

# Docker
docker compose exec spacelycms node packages/server/dist/cli.js export > backup.json
```

### Import data

```bash
spacely import backup.json

# Docker
docker compose cp backup.json spacelycms:/tmp/backup.json
docker compose exec spacelycms node packages/server/dist/cli.js import /tmp/backup.json
```

### Media files

Back up the `uploads/` directory separately:
```bash
tar -czf media-backup.tar.gz uploads/
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:./data/spacely.db` | Database connection (`sqlite:` or `postgresql://`) |
| `PORT` | `4321` | Server port |
| `HOST` | `localhost` | Server bind address |
| `JWT_SECRET` | — | **Required.** Secret for JWT signing |
| `MEDIA_STORAGE` | `local` | Media backend: `local` or `s3` |
| `MEDIA_DIR` | `./uploads` | Media storage path (local mode) |
| `S3_ENDPOINT` | — | S3-compatible endpoint URL (e.g., `https://<id>.r2.cloudflarestorage.com`) |
| `S3_BUCKET` | — | Bucket name (e.g., `spacely-media`) |
| `S3_REGION` | — | Bucket region (`auto` for Cloudflare R2) |
| `S3_ACCESS_KEY` | — | S3/R2 access key ID |
| `S3_SECRET_KEY` | — | S3/R2 secret access key |
| `S3_PUBLIC_URL` | — | Public URL for media (e.g., `https://media.yoursite.com`) |
| `SITE_URL` | `http://localhost:4322` | Frontend URL |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated) |
| `RATE_LIMIT_AUTH` | `10` | Max login attempts per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `NODE_ENV` | `development` | Set to `production` for prod |

---

## Health Check

```bash
curl https://cms.yoursite.com/api/health
```

Returns:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "timestamp": "2026-03-06T12:00:00.000Z",
  "cache": { "entries": 5 }
}
```

---

## Security Checklist

- [ ] Change default admin password
- [ ] Set a strong `JWT_SECRET` (at least 32 random bytes)
- [ ] Set `CORS_ORIGINS` to your specific domains (not `*`)
- [ ] Use HTTPS (Caddy handles this automatically)
- [ ] Back up database and media regularly
- [ ] Keep Node.js and dependencies updated
- [ ] Review API keys periodically (revoke unused keys)
