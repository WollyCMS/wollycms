import { getDialect } from '../../env.js';
import type * as SqliteSchema from './_sqlite.js';

const mod: typeof SqliteSchema = getDialect() === 'postgresql'
  ? (await import('../schema-pg/index.js')) as unknown as typeof SqliteSchema
  : await import('./_sqlite.js');

export const { contentTypes, blockTypes } = mod;
export const { pages, pageRevisions } = mod;
export const { blocks, pageBlocks } = mod;
export const { taxonomies, terms, contentTerms } = mod;
export const { menus, menuItems } = mod;
export const { media } = mod;
export const { redirects, users } = mod;
export const { webhooks, apiKeys, auditLogs } = mod;
export const { trackingScripts } = mod;
export type { FieldDefinition, RegionDefinition } from './_sqlite.js';
