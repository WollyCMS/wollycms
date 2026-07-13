import type { FieldDefinition } from './db/schema/content-types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneJsonValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneJsonValue(nested)]),
    );
  }
  return value;
}

/**
 * Normalize schema-defined container fields before content reaches a renderer.
 *
 * Editors are allowed to save incomplete draft blocks, so older and in-progress
 * content may omit repeater arrays entirely. Returning an empty array for a
 * missing or malformed repeater preserves the draft workflow while preventing
 * consumer renderers from crashing when they iterate schema-defined collections.
 * Explicit field defaults are also applied without mutating stored content.
 */
export function normalizeContentFields(
  fields: unknown,
  schema: FieldDefinition[] | null | undefined,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = isRecord(fields) ? { ...fields } : {};

  for (const field of schema ?? []) {
    const value = normalized[field.name];

    if (value === undefined || value === null) {
      if (field.type === 'repeater') {
        const defaultItems = Array.isArray(field.default) ? field.default : [];
        normalized[field.name] = defaultItems.map((item) =>
          normalizeContentFields(cloneJsonValue(item), field.fields),
        );
      } else if (field.default !== undefined) {
        normalized[field.name] = cloneJsonValue(field.default);
      }
      continue;
    }

    if (field.type === 'repeater') {
      normalized[field.name] = Array.isArray(value)
        ? value.map((item) => normalizeContentFields(item, field.fields))
        : [];
    }
  }

  return normalized;
}
