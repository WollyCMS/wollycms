import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const webhooks = sqliteTable('webhooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  secret: text('secret'),
  events: text('events').notNull(), // JSON array: ["page.published","page.unpublished","media.uploaded"]
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastTriggeredAt: text('last_triggered_at'),
  lastStatus: integer('last_status'),
  createdAt: text('created_at').notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(), // first 8 chars for display
  permissions: text('permissions').notNull().default('content:read'), // comma-separated
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(), // create, update, delete, publish, unpublish, login
  entity: text('entity').notNull(), // page, block, media, menu, user, webhook, config
  entityId: integer('entity_id'),
  details: text('details'), // JSON with change summary
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});
