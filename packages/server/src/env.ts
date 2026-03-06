import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '4321', 10),
  HOST: process.env.HOST || 'localhost',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:./data/spacely.db',
  MEDIA_STORAGE: process.env.MEDIA_STORAGE || 'local',
  MEDIA_DIR: process.env.MEDIA_DIR || './uploads',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
  RATE_LIMIT_AUTH: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_REGION: process.env.S3_REGION || 'auto',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || '',
  SITE_URL: process.env.SITE_URL || 'http://localhost:4322',
} as const;

export function getDatabasePath(): string {
  return env.DATABASE_URL.replace('sqlite:', '');
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}
