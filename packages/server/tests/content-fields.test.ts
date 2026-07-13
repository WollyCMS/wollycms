import { describe, expect, it } from 'vitest';
import { normalizeContentFields } from '../src/content-fields.js';
import type { FieldDefinition } from '../src/db/schema/content-types.js';

const schema: FieldDefinition[] = [
  {
    name: 'items',
    type: 'repeater',
    default: null,
    min: 1,
    fields: [
      { name: 'title', type: 'text', required: true },
      {
        name: 'links',
        type: 'repeater',
        fields: [{ name: 'url', type: 'url', required: true }],
      },
    ],
  },
  { name: 'display', type: 'select', default: 'accordion' },
];

describe('normalizeContentFields', () => {
  it('supplies empty arrays for missing repeater fields', () => {
    expect(normalizeContentFields({}, schema)).toEqual({
      items: [],
      display: 'accordion',
    });
  });

  it('replaces malformed repeater values with empty arrays', () => {
    expect(normalizeContentFields({ items: 'not-an-array' }, schema).items).toEqual([]);
  });

  it('normalizes nested repeater fields without mutating stored content', () => {
    const stored = { items: [{ title: 'First item' }] };
    const normalized = normalizeContentFields(stored, schema);

    expect(normalized).toEqual({
      items: [{ title: 'First item', links: [] }],
      display: 'accordion',
    });
    expect(stored).toEqual({ items: [{ title: 'First item' }] });
  });
});
