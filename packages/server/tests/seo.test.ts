import { describe, it, expect } from 'vitest';
import {
  scorePage,
  calculateScore,
  countWords,
  hasHeadings,
  hasImages,
  hasLinks,
} from '../../admin/src/lib/seo.js';

const regions = [
  { name: 'hero', label: 'Hero' },
  { name: 'content', label: 'Content' },
];

function makeDoc(...nodes: any[]) {
  return { type: 'doc', content: nodes };
}

function paragraph(text: string) {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function heading(level: number, text: string) {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function link(text: string, href: string) {
  return {
    type: 'text',
    text,
    marks: [{ type: 'link', attrs: { href } }],
  };
}

describe('countWords', () => {
  it('counts words in richtext blocks', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(paragraph('Hello world this is a test')),
        },
      }],
    };
    expect(countWords(regions, pageRegions)).toBe(6);
  });

  it('counts words in text fields', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          heading: 'Welcome to our site',
        },
      }],
    };
    expect(countWords(regions, pageRegions)).toBe(4);
  });

  it('counts across multiple blocks and regions', () => {
    const pageRegions = {
      hero: [{
        pb_id: 1,
        fields: { heading: 'Big hero title' },
      }],
      content: [{
        pb_id: 2,
        fields: {
          body: makeDoc(paragraph('Some content here')),
        },
      }],
    };
    expect(countWords(regions, pageRegions)).toBe(6);
  });

  it('returns 0 for empty page', () => {
    expect(countWords(regions, { hero: [], content: [] })).toBe(0);
  });
});

describe('hasHeadings', () => {
  it('detects headings in richtext', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(heading(2, 'Section')),
        },
      }],
    };
    expect(hasHeadings(regions, pageRegions)).toBe(true);
  });

  it('returns false when no headings', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(paragraph('Just text')),
        },
      }],
    };
    expect(hasHeadings(regions, pageRegions)).toBe(false);
  });
});

describe('hasImages', () => {
  it('detects media ID fields as images', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: { media: 42 },
      }],
    };
    expect(hasImages(regions, pageRegions)).toBe(true);
  });

  it('detects inline images in richtext', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc({ type: 'image', attrs: { src: '/img.jpg' } }),
        },
      }],
    };
    expect(hasImages(regions, pageRegions)).toBe(true);
  });

  it('returns false when no images', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(paragraph('No images here')),
        },
      }],
    };
    expect(hasImages(regions, pageRegions)).toBe(false);
  });
});

describe('hasLinks', () => {
  it('detects links in richtext', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc({
            type: 'paragraph',
            content: [link('Click here', 'https://example.com')],
          }),
        },
      }],
    };
    expect(hasLinks(regions, pageRegions)).toBe(true);
  });

  it('returns false when no links', () => {
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(paragraph('No links')),
        },
      }],
    };
    expect(hasLinks(regions, pageRegions)).toBe(false);
  });
});

describe('scorePage', () => {
  it('returns all check types', () => {
    const pageData = {
      metaTitle: 'A Good Meta Title For This Page',
      metaDescription: 'This is a well-crafted meta description that provides enough detail about the page content for search engines to display in results.',
      slug: 'good-page',
    };
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(
            heading(2, 'Introduction'),
            ...Array.from({ length: 60 }, (_, i) => paragraph(`Word${i} content goes here for testing purposes.`)),
          ),
        },
      }],
    };
    const checks = scorePage(pageData, regions, pageRegions);
    const codes = checks.map(c => c.code);
    expect(codes).toContain('title-length');
    expect(codes).toContain('desc-length');
    expect(codes).toContain('slug-length');
    expect(codes).toContain('content-length');
    expect(codes).toContain('headings');
  });

  it('fails checks for missing meta fields', () => {
    const pageData = { metaTitle: '', metaDescription: '', slug: 'test' };
    const pageRegions = { hero: [], content: [] };
    const checks = scorePage(pageData, regions, pageRegions);

    const titleCheck = checks.find(c => c.code === 'title-length');
    expect(titleCheck?.status).toBe('fail');

    const descCheck = checks.find(c => c.code === 'desc-length');
    expect(descCheck?.status).toBe('fail');
  });

  it('passes checks for good meta fields', () => {
    const pageData = {
      metaTitle: 'A Perfect Length Title For SEO Purposes',
      metaDescription: 'This meta description is exactly the right length for search engine optimization and provides a clear summary of what users will find on this page.',
      slug: 'good-page',
    };
    const pageRegions = {
      hero: [],
      content: [{
        pb_id: 1,
        fields: {
          body: makeDoc(
            heading(2, 'Section'),
            ...Array.from({ length: 50 }, () => paragraph('Lorem ipsum dolor sit amet consectetur adipiscing elit.')),
          ),
        },
      }],
    };
    const checks = scorePage(pageData, regions, pageRegions);

    const titleCheck = checks.find(c => c.code === 'title-length');
    expect(titleCheck?.status).toBe('pass');

    const descCheck = checks.find(c => c.code === 'desc-length');
    expect(descCheck?.status).toBe('pass');
  });
});

describe('calculateScore', () => {
  it('returns 100 for all passing checks', () => {
    const checks = [
      { code: 'a', label: 'A', status: 'pass' as const, message: '' },
      { code: 'b', label: 'B', status: 'pass' as const, message: '' },
    ];
    expect(calculateScore(checks)).toBe(100);
  });

  it('returns 0 for all failing checks', () => {
    const checks = [
      { code: 'a', label: 'A', status: 'fail' as const, message: '' },
      { code: 'b', label: 'B', status: 'fail' as const, message: '' },
    ];
    expect(calculateScore(checks)).toBe(0);
  });

  it('excludes info checks from score', () => {
    const checks = [
      { code: 'a', label: 'A', status: 'pass' as const, message: '' },
      { code: 'b', label: 'B', status: 'info' as const, message: '' },
    ];
    expect(calculateScore(checks)).toBe(100);
  });

  it('calculates mixed scores correctly', () => {
    const checks = [
      { code: 'a', label: 'A', status: 'pass' as const, message: '' },
      { code: 'b', label: 'B', status: 'fail' as const, message: '' },
      { code: 'c', label: 'C', status: 'warn' as const, message: '' },
      { code: 'd', label: 'D', status: 'pass' as const, message: '' },
    ];
    // 2 pass out of 4 scorable = 50%
    expect(calculateScore(checks)).toBe(50);
  });
});
