---
title: Node.js
description: Run WollyCMS directly on Node.js with PM2 or systemd.
---

Run WollyCMS directly on a Node.js server for maximum control and simplicity.

## Prerequisites

- Node.js 22 or later
- npm 10 or later

## Installation

```bash
npx create-wolly my-cms
cd my-cms
npm install
```

## Configuration

Create a `.env` file (the scaffold generates one for you):

```bash
NODE_ENV=production
PORT=4321
HOST=0.0.0.0
DATABASE_URL=sqlite:./data/wolly.db
MEDIA_DIR=./uploads
JWT_SECRET=your-strong-random-secret
CORS_ORIGINS=https://your-site.example.com
SITE_URL=https://your-site.example.com
```

Generate a JWT secret:

```bash
openssl rand -base64 32
```

:::caution
WollyCMS refuses to start in production mode with the default JWT secret. Always set a strong, unique `JWT_SECRET`.
:::

## Running

### Run database migrations and seed

```bash
npm run migrate
npm run seed
```

### Start the server

```bash
npm start
```

The CMS is now running at `http://localhost:4321`.

## Process management with PM2

[PM2](https://pm2.keymetrics.io/) keeps the process running, handles restarts, and manages logs.

```bash
npm install -g pm2
```

Create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'wollycms',
    script: 'node_modules/@wollycms/server/dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4321,
      HOST: '0.0.0.0',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # Auto-start on boot
```

### PM2 commands

| Command | Description |
|---|---|
| `pm2 status` | Show running processes |
| `pm2 logs wollycms` | Tail logs |
| `pm2 restart wollycms` | Restart the server |
| `pm2 stop wollycms` | Stop the server |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` for production |
| `PORT` | `4321` | Server port |
| `HOST` | `localhost` | Bind address (`0.0.0.0` for all interfaces) |
| `DATABASE_URL` | `sqlite:./data/wolly.db` | SQLite path or PostgreSQL URL |
| `MEDIA_STORAGE` | `local` | `local`, `s3`, or `r2` |
| `MEDIA_DIR` | `./uploads` | Local storage directory |
| `JWT_SECRET` | **required** | JWT signing secret |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `SITE_URL` | `http://localhost:4322` | Frontend URL for sitemaps/OG images |
| `S3_ENDPOINT` | - | S3-compatible endpoint URL |
| `S3_BUCKET` | - | S3 bucket name |
| `S3_REGION` | `auto` | S3 region |
| `S3_ACCESS_KEY` | - | S3 access key |
| `S3_SECRET_KEY` | - | S3 secret key |
| `S3_PUBLIC_URL` | - | Public CDN URL for S3 media |

## Using PostgreSQL

Set `DATABASE_URL` to a PostgreSQL connection string:

```bash
DATABASE_URL=postgresql://wolly:password@localhost:5432/wollycms
```

WollyCMS auto-detects the database type from the URL prefix (`sqlite:`, `postgresql://`, or `postgres://`).

## Reverse proxy

In production, put WollyCMS behind a reverse proxy for TLS termination.

### Caddy

```
cms.example.com {
    reverse_proxy localhost:4321
}
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name cms.example.com;

    ssl_certificate     /etc/letsencrypt/live/cms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cms.example.com/privkey.pem;

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

:::tip
Set `client_max_body_size` to at least `50M` to match the CMS upload limit.
:::

## Directory structure in production

```
my-cms/
├── data/           # SQLite database (back this up!)
├── uploads/        # Media files (back this up!)
├── node_modules/
├── .env            # Environment variables
└── package.json
```

## Backups

Back up these two directories regularly:

- `data/` — the SQLite database
- `uploads/` — media files (unless using S3/R2)

```bash
# Example: daily backup with rsync
rsync -a data/ /backup/wollycms/data/
rsync -a uploads/ /backup/wollycms/uploads/
```
