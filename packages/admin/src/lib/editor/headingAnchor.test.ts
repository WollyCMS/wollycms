import { createDocument, getSchema, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';

import {
  HeadingAnchor,
  isValidHeadingAnchorId,
  normalizeHeadingAnchorId,
} from './headingAnchor.js';

const schema = getSchema([StarterKit, HeadingAnchor]);

function roundTrip(content: JSONContent): JSONContent {
  return createDocument(content, schema, {}, { errorOnInvalidContent: true }).toJSON();
}

describe('heading anchors', () => {
  it('creates readable IDs from heading text', () => {
    expect(normalizeHeadingAnchorId(' Hear From Fellow Panthers! ')).toBe('hear-from-fellow-panthers');
    expect(normalizeHeadingAnchorId('2026 Student Stories')).toBe('section-2026-student-stories');
    expect(normalizeHeadingAnchorId('Crème brûlée')).toBe('creme-brulee');
  });

  it('rejects fragment IDs outside the editor policy', () => {
    expect(isValidHeadingAnchorId('student-stories')).toBe(true);
    expect(isValidHeadingAnchorId('Student Stories')).toBe(false);
    expect(isValidHeadingAnchorId('123-stories')).toBe(false);
  });

  it('preserves an optional heading ID in TipTap JSON', () => {
    const content = roundTrip({
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2, id: 'student-stories' },
        content: [{ type: 'text', text: 'Student Stories' }],
      }],
    });

    expect(content.content?.[0]?.attrs?.id).toBe('student-stories');
  });

  it('keeps legacy headings without an ID compatible', () => {
    const content = roundTrip({
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Legacy heading' }],
      }],
    });

    expect(content.content?.[0]?.attrs?.id).toBeNull();
  });
});
