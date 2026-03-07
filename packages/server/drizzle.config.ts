import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/_sqlite.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace('sqlite:', '') || './data/spacely.db',
  },
});
