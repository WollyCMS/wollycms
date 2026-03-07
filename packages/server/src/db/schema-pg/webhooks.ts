import { pgTable, text, serial, integer, boolean } from 'drizzle-orm/pg-core';

export const webhooks = pgTable('webhooks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  secret: text('secret'),
  events: text('events').notNull(), // JSON array: ["page.published","page.unpublished","media.uploaded"]
  isActive: boolean('is_active').notNull().default(true),
  lastTriggeredAt: text('last_triggered_at'),
  lastStatus: integer('last_status'),
  createdAt: text('created_at').notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(), // first 8 chars for display
  permissions: text('permissions').notNull().default('content:read'), // comma-separated
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  userName: text('user_name'),
  action: text('action').notNull(), // create, update, delete, publish, unpublish, login
  entity: text('entity').notNull(), // page, block, media, menu, user, webhook, config
  entityId: integer('entity_id'),
  details: text('details'), // JSON with change summary
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});
