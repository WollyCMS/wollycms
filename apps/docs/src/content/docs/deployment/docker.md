---
title: Docker
description: Deploy WollyCMS with Docker and docker-compose.
---

WollyCMS ships with a multi-stage Dockerfile and a ready-to-use `docker-compose.yml`. This is the recommended deployment method for self-hosted environments.

## Quick start

```bash
# Clone the repository
git clone https://github.com/wollycms/wollycms.git
cd wollycms

# Create your .env file
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
```

Generate a JWT secret:

```bash
openssl rand -base64 32
```

Add it to `.env`:

```bash
JWT_SECRET=your-generated-secret-here
SITE_URL=https://your-site.example.com
CORS_ORIGINS=https://your-site.example.com
```

Start the containers:

```bash
docker compose up -d
```

WollyCMS is now running at `http://localhost:4321`.

## docker-compose.yml

```yaml
services:
  wollycms:
    build: .
    ports:
      - "4321:4321"
    environment:
      - NODE_ENV=production
      - PORT=4321
      - HOST=0.0.0.0
      - DATABASE_URL=sqlite:./data/wolly.db
      - MEDIA_DIR=./uploads
      - JWT_SECRET=${JWT_SECRET:?Set JWT_SECRET in .env}
      - CORS_ORIGINS=${CORS_ORIGINS:-*}
      - RATE_LIMIT_AUTH=${RATE_LIMIT_AUTH:-10}
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-900000}
      - SITE_URL=${SITE_URL:-http://localhost:4322}
    volumes:
      - wolly-data:/app/data
      - wolly-uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:4321/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3

volumes:
  wolly-data:
  wolly-uploads:
```

## Volumes

| Volume | Container path | Purpose |
|---|---|---|
| `wolly-data` | `/app/data` | SQLite database file |
| `wolly-uploads` | `/app/uploads` | Uploaded media files |

:::caution
Always use named volumes (or bind mounts to a backed-up directory). Losing the `wolly-data` volume means losing your database.
:::

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `4321` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `DATABASE_URL` | `sqlite:./data/wolly.db` | Database connection string |
| `MEDIA_DIR` | `./uploads` | Local media storage directory |
| `JWT_SECRET` | **required** | Secret for JWT signing |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `SITE_URL` | `http://localhost:4322` | Frontend URL (for sitemaps) |
| `RATE_LIMIT_AUTH` | `10` | Max auth attempts per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |

## Using PostgreSQL

To use PostgreSQL instead of SQLite, set the `DATABASE_URL` to a PostgreSQL connection string:

```yaml
services:
  wollycms:
    environment:
      - DATABASE_URL=postgresql://wolly:password@db:5432/wollycms
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: wolly
      POSTGRES_PASSWORD: password
      POSTGRES_DB: wollycms
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wolly"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  wolly-data:
  wolly-uploads:
  pg-data:
```

## Using S3/R2 for media

For production deployments, store media in S3-compatible storage instead of local volumes:

```yaml
environment:
  - MEDIA_STORAGE=s3
  - S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
  - S3_BUCKET=wollycms-media
  - S3_REGION=us-east-1
  - S3_ACCESS_KEY=${S3_ACCESS_KEY}
  - S3_SECRET_KEY=${S3_SECRET_KEY}
  - S3_PUBLIC_URL=https://cdn.example.com
```

## Reverse proxy

Put WollyCMS behind a reverse proxy (Caddy, Nginx, Traefik) for TLS and custom domains:

```
# Caddyfile
cms.example.com {
    reverse_proxy wollycms:4321
}
```

## Health check

The health endpoint is available at `/api/health`:

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "timestamp": "2025-01-15T12:00:00.000Z",
  "cache": { "entries": 42 }
}
```

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

The container runs database migrations automatically on startup.
