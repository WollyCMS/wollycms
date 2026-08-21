import { describe, expect, it } from 'vitest';

import { checkHeadingAnchors } from './a11y.js';

const regions = [{ name: 'content', label: 'Content' }];

function richTextBlock(pbId: number, content: any[]) {
  return {
    pb_id: pbId,
    fields: { body: { type: 'doc', content } },
  };
}

function heading(id: string | null, text = 'Heading') {
  return {
    type: 'heading',
    attrs: { level: 2, id },
    content: [{ type: 'text', text }],
  };
}

function fragmentLink(href: string, text = 'Jump to section') {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }],
  };
}

describe('heading anchor accessibility checks', () => {
  it('accepts a unique heading anchor with a matching TipTap link', () => {
    const issues = checkHeadingAnchors(regions, {
      content: [richTextBlock(1, [
        fragmentLink('#student-stories'),
        heading('student-stories', 'Student Stories'),
      ])],
    });

    expect(issues).toEqual([]);
  });

  it('warns when a heading anchor is duplicated', () => {
    const issues = checkHeadingAnchors(regions, {
      content: [
        richTextBlock(1, [heading('student-stories')]),
        richTextBlock(2, [heading('student-stories')]),
      ],
    });

    expect(issues.filter((issue) => issue.code === 'anchor-duplicate')).toHaveLength(2);
  });

  it('warns about invalid anchor syntax', () => {
    const issues = checkHeadingAnchors(regions, {
      content: [richTextBlock(1, [heading('Student Stories')])],
    });

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'anchor-invalid' }),
    ]));
  });

  it('warns when rich-text and CTA fragment links have no CMS heading target', () => {
    const issues = checkHeadingAnchors(regions, {
      content: [
        richTextBlock(1, [fragmentLink('#missing-rich-text')]),
        { pb_id: 2, fields: { cta_url: '#missing-cta' } },
      ],
    });

    expect(issues.filter((issue) => issue.code === 'anchor-target-missing')).toHaveLength(2);
  });
});
