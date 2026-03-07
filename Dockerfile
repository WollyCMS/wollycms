# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/astro/package.json packages/astro/
COPY examples/college-site/package.json examples/college-site/
RUN npm ci --ignore-scripts
# Rebuild native modules (better-sqlite3, sharp)
RUN npm rebuild better-sqlite3 && cd packages/server && npm rebuild sharp

# Stage 2: Build admin SPA
FROM deps AS build-admin
COPY packages/admin/ packages/admin/
COPY tsconfig.json ./
RUN npm run build --workspace=packages/admin

# Stage 3: Build server
FROM deps AS build-server
COPY packages/server/ packages/server/
COPY tsconfig.json ./
RUN npm run build --workspace=packages/server

# Stage 4: Production image
FROM node:22-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user with fixed UID/GID for volume mount compatibility
RUN groupadd -g 1000 wolly && useradd -u 1000 -g wolly -m wolly

# Copy production node_modules (workspaces hoists to root)
COPY --from=deps /app/node_modules ./node_modules

# Copy built server
COPY --from=build-server /app/packages/server/dist ./packages/server/dist
COPY --from=build-server /app/packages/server/drizzle ./packages/server/drizzle
COPY packages/server/package.json packages/server/

# Copy built admin SPA
COPY --from=build-admin /app/packages/admin/build ./packages/admin/build

# Copy root package.json for workspace resolution
COPY package.json ./

# Create data and uploads directories
RUN mkdir -p data uploads && chown -R wolly:wolly /app

USER wolly

ENV NODE_ENV=production
ENV PORT=4321
ENV HOST=0.0.0.0
ENV DATABASE_URL=sqlite:./data/wolly.db
ENV MEDIA_DIR=./uploads
# JWT_SECRET must be provided at runtime via .env or docker compose

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:4321/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["tini", "--"]
CMD ["node", "packages/server/dist/index.js"]
