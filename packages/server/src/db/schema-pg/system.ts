import { pgTable, text, serial, integer, boolean, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const siteConfig = pgTable('site_config', {
  id: integer('id').primaryKey().default(1),
  value: text('value').notNull().default('{}'),
}, (table) => [
  check('single_row', sql`${table.id} = 1`),
]);

export const redirects = pgTable('redirects', {
  id: serial('id').primaryKey(),
  fromPath: text('from_path').notNull(),
  toPath: text('to_path').notNull(),
  statusCode: integer('status_code').notNull().default(301),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  uniqueIndex('idx_redirects_from').on(table.fromPath),
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  createdAt: text('created_at').notNull(),
});

export const userTotp = pgTable('user_totp', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const trustedDevices = pgTable('trusted_devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  label: text('label'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const userRecoveryCodes = pgTable('user_recovery_codes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull(),
});

export const userOauth = pgTable('user_oauth', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  email: text('email'),
  name: text('name'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('user_oauth_provider_unique').on(table.provider, table.providerId),
]);
