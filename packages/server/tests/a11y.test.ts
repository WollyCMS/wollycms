import { describe, it, expect } from 'vitest';
import {
  checkHeadingHierarchy,
  checkImageAlt,
  checkEmptyLinks,
  auditPageAccessibility,
} from '../../admin/src/lib/a11y.js';

const regions = [
  { name: 'hero', label: 'Hero' },
  { name: 'content', label: 'Content' },
];

function makeDoc(...nodes: any[]) {
  return { type: 'doc', content: nodes };
}

function heading(level: number, text = '') {
  return {
    type: 'heading',
    attrs: { level },
    content: text ? [{ type: 'text', text }] : [],
  };
}

describe('checkHeadingHierarchy', () => {
  it('returns no issues for correct heading order', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(heading(2, 'Intro'), heading(3, 'Details')),
        },
      }],
    };
    const issues = checkHeadingHierarchy(regions, pageRegions);
    expect(issues).toHaveLength(0);
  });

  it('detects skipped heading level H2 -> H4', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(heading(2, 'Intro'), heading(4, 'Deep')),
        },
      }],
    };
    const issues = checkHeadingHierarchy(regions, pageRegions);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('heading-skip');
    expect(issues[0].message).toContain('H4 follows H2');
    expect(issues[0].blockPbId).toBe(1);
  });

  it('detects starting at H3 (skipping H2)', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 2,
        fields: {
          body: makeDoc(heading(3, 'Section')),
        },
      }],
    };
    const issues = checkHeadingHierarchy(regions, pageRegions);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('H3 follows H1');
  });

  it('checks across multiple blocks and regions', () => {
    const pageRegions = {
      hero: [{
        pb_id: 1,
        fields: { body: makeDoc(heading(2, 'Hero Title')) },
      }],
      content: [{
        pb_id: 2,
        fields: { body: makeDoc(heading(4, 'Skipped')) },
      }],
    };
    const issues = checkHeadingHierarchy(regions, pageRegions);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('H4 follows H2');
    expect(issues[0].blockPbId).toBe(2);
  });
});

describe('checkImageAlt', () => {
  it('returns no issues when media has alt text', () => {
    const cache = new Map([[5, { altText: 'A nice photo' }]]);
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: { media: 5 },
      }],
    };
    const issues = checkImageAlt(regions, pageRegions, cache);
    expect(issues).toHaveLength(0);
  });

  it('detects media field missing alt text', () => {
    const cache = new Map([[5, { altText: '' }]]);
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: { media: 5 },
      }],
    };
    const issues = checkImageAlt(regions, pageRegions, cache);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('img-alt');
  });

  it('detects inline image missing alt in richtext', () => {
    const cache = new Map();
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc({
            type: 'image',
            attrs: { src: '/img/test.jpg', alt: '' },
          }),
        },
      }],
    };
    const issues = checkImageAlt(regions, pageRegions, cache);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('img-alt-inline');
  });
});

describe('checkEmptyLinks', () => {
  it('returns no issues for normal links', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc({
            type: 'paragraph',
            content: [{
              type: 'text',
              text: 'Click here',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            }],
          }),
        },
      }],
    };
    const issues = checkEmptyLinks(regions, pageRegions);
    expect(issues).toHaveLength(0);
  });

  it('detects links with empty text', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc({
            type: 'paragraph',
            content: [{
              type: 'text',
              text: '',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            }],
          }),
        },
      }],
    };
    const issues = checkEmptyLinks(regions, pageRegions);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('link-empty');
  });
});

describe('auditPageAccessibility', () => {
  it('combines all checks', () => {
    const cache = new Map([[3, { altText: '' }]]);
    const pageRegions = {
      hero: [{
        pb_id: 1,
        fields: { media: 3 },
      }],
      content: [{
        pb_id: 2,
        fields: {
          body: makeDoc(heading(3, 'Skipped')),
        },
      }],
    };
    const issues = auditPageAccessibility(regions, pageRegions, cache);
    expect(issues.length).toBeGreaterThanOrEqual(2);
    const codes = issues.map(i => i.code);
    expect(codes).toContain('heading-skip');
    expect(codes).toContain('img-alt');
  });

  it('returns empty for clean page', () => {
    const cache = new Map();
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(heading(2, 'Good'), heading(3, 'Also Good')),
        },
      }],
    };
    const issues = auditPageAccessibility(regions, pageRegions, cache);
    expect(issues).toHaveLength(0);
  });
});
