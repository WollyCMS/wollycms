import { sqliteTable, text, integer, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const siteConfig = sqliteTable('site_config', {
  id: integer('id').primaryKey().default(1),
  value: text('value').notNull().default('{}'),
}, (table) => [
  check('single_row', sql`${table.id} = 1`),
]);

export const redirects = sqliteTable('redirects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromPath: text('from_path').notNull(),
  toPath: text('to_path').notNull(),
  statusCode: integer('status_code').notNull().default(301),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => [
  uniqueIndex('idx_redirects_from').on(table.fromPath),
]);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  createdAt: text('created_at').notNull(),
});

export const userTotp = sqliteTable('user_totp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const trustedDevices = sqliteTable('trusted_devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  label: text('label'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const userRecoveryCodes = sqliteTable('user_recovery_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull(),
});

export const userOauth = sqliteTable('user_oauth', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  email: text('email'),
  name: text('name'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('user_oauth_provider_unique').on(table.provider, table.providerId),
  uniqueIndex('user_oauth_user_provider_unique').on(table.userId, table.provider),
]);
