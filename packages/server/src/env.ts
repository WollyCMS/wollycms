/**
 * Environment configuration.
 *
 * On Node.js: reads from process.env (with dotenv).
 * On Workers: call initEnvFromBindings(c.env) before first use.
 */

// Only import dotenv on Node.js (Workers has no process.env)
try {
  await import('dotenv/config');
} catch {
  // Running in Workers — dotenv not available, that's fine
}

interface EnvConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: string;
  DATABASE_URL: string;
  MEDIA_STORAGE: string;
  MEDIA_DIR: string;
  JWT_SECRET: string;
  CORS_ORIGINS: string;
  RATE_LIMIT_AUTH: number;
  RATE_LIMIT_WINDOW_MS: number;
  S3_ENDPOINT: string;
  S3_BUCKET: string;
  S3_REGION: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_PUBLIC_URL: string;
  SITE_URL: string;
}

function readProcessEnv(): EnvConfig {
  const p = typeof process !== 'undefined' ? process.env : {} as Record<string, string | undefined>;
  return {
    PORT: parseInt(p.PORT || '4321', 10),
    HOST: p.HOST || 'localhost',
    NODE_ENV: p.NODE_ENV || 'development',
    DATABASE_URL: p.DATABASE_URL || 'sqlite:./data/wolly.db',
    MEDIA_STORAGE: p.MEDIA_STORAGE || 'local',
    MEDIA_DIR: p.MEDIA_DIR || './uploads',
    JWT_SECRET: (() => {
      if (p.JWT_SECRET) return p.JWT_SECRET;
      if (p.NODE_ENV === 'production') throw new Error('JWT_SECRET environment variable is required in production');
      return 'dev-secret-change-me';
    })(),
    CORS_ORIGINS: p.CORS_ORIGINS || '*',
    RATE_LIMIT_AUTH: parseInt(p.RATE_LIMIT_AUTH || '10', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(p.RATE_LIMIT_WINDOW_MS || '900000', 10),
    S3_ENDPOINT: p.S3_ENDPOINT || '',
    S3_BUCKET: p.S3_BUCKET || '',
    S3_REGION: p.S3_REGION || 'auto',
    S3_ACCESS_KEY: p.S3_ACCESS_KEY || '',
    S3_SECRET_KEY: p.S3_SECRET_KEY || '',
    S3_PUBLIC_URL: p.S3_PUBLIC_URL || '',
    SITE_URL: p.SITE_URL || 'http://localhost:4322',
  };
}

export let env: EnvConfig = readProcessEnv();

/**
 * Initialize env from Cloudflare Workers bindings.
 * Call this once in the Workers entry point before handling requests.
 */
export function initEnvFromBindings(bindings: Record<string, unknown>): void {
  const b = (key: string, fallback = '') => String(bindings[key] ?? fallback);
  env = {
    PORT: parseInt(b('PORT', '4321'), 10),
    HOST: b('HOST', 'localhost'),
    NODE_ENV: b('NODE_ENV', 'production'),
    DATABASE_URL: b('DATABASE_URL', 'd1:'),
    MEDIA_STORAGE: b('MEDIA_STORAGE', 'r2'),
    MEDIA_DIR: b('MEDIA_DIR', './uploads'),
    JWT_SECRET: (() => {
      const secret = b('JWT_SECRET');
      if (!secret) throw new Error('JWT_SECRET binding is required');
      return secret;
    })(),
    CORS_ORIGINS: b('CORS_ORIGINS', '*'),
    RATE_LIMIT_AUTH: parseInt(b('RATE_LIMIT_AUTH', '10'), 10),
    RATE_LIMIT_WINDOW_MS: parseInt(b('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    S3_ENDPOINT: b('S3_ENDPOINT'),
    S3_BUCKET: b('S3_BUCKET'),
    S3_REGION: b('S3_REGION', 'auto'),
    S3_ACCESS_KEY: b('S3_ACCESS_KEY'),
    S3_SECRET_KEY: b('S3_SECRET_KEY'),
    S3_PUBLIC_URL: b('S3_PUBLIC_URL'),
    SITE_URL: b('SITE_URL', 'http://localhost:4322'),
  };
}

export function getDialect(): 'sqlite' | 'postgresql' | 'd1' {
  const url = env.DATABASE_URL;
  if (url.startsWith('d1:')) return 'd1';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'postgresql';
  return 'sqlite';
}

export function getDatabasePath(): string {
  return env.DATABASE_URL.replace('sqlite:', '');
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/** Detect if running in a Workers/workerd environment. */
export function isWorkers(): boolean {
  return typeof process === 'undefined' || typeof (globalThis as Record<string, unknown>).caches !== 'undefined' && typeof process.release === 'undefined';
}
