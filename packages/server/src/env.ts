import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '4321', 10),
  HOST: process.env.HOST || 'localhost',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite:./data/spacely.db',
  MEDIA_STORAGE: process.env.MEDIA_STORAGE || 'local',
  MEDIA_DIR: process.env.MEDIA_DIR || './uploads',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
} as const;

export function getDatabasePath(): string {
  return env.DATABASE_URL.replace('sqlite:', '');
}
