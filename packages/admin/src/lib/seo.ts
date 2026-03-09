/** SEO scoring and content analysis for page editor */

export interface SeoCheck {
  code: string;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'info';
  message: string;
}

/** Count words across all richtext fields in all regions */
export function countWords(
  regions: { name: string }[],
  pageRegions: Record<string, any[]>,
): number {
  let total = 0;
  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      for (const value of Object.values(block.fields || {})) {
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          total += countDocWords(value);
        }
        if (typeof value === 'string') {
          total += value.split(/\s+/).filter(Boolean).length;
        }
      }
    }
  }
  return total;
}

function countDocWords(doc: any): number {
  let count = 0;
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'text' && node.text) {
        count += node.text.split(/\s+/).filter(Boolean).length;
      }
      if (node.content) walk(node.content);
    }
  }
  if (doc?.content) walk(doc.content);
  return count;
}

/** Check for H2/H3/H4 headings in richtext content */
export function hasHeadings(
  regions: { name: string }[],
  pageRegions: Record<string, any[]>,
): boolean {
  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      for (const value of Object.values(block.fields || {})) {
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          if (docHasNodeType(value, 'heading')) return true;
        }
      }
    }
  }
  return false;
}

/** Check for images (media fields or inline images) */
export function hasImages(
  regions: { name: string }[],
  pageRegions: Record<string, any[]>,
): boolean {
  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      for (const value of Object.values(block.fields || {})) {
        if (typeof value === 'number') return true; // media ID
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          if (docHasNodeType(value, 'image')) return true;
        }
      }
    }
  }
  return false;
}

/** Check for links in richtext */
export function hasLinks(
  regions: { name: string }[],
  pageRegions: Record<string, any[]>,
): boolean {
  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      for (const value of Object.values(block.fields || {})) {
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          if (docHasLinkMark(value)) return true;
        }
      }
    }
  }
  return false;
}

function docHasNodeType(doc: any, type: string): boolean {
  if (!doc?.content) return false;
  function walk(nodes: any[]): boolean {
    for (const node of nodes) {
      if (node.type === type) return true;
      if (node.content && walk(node.content)) return true;
    }
    return false;
  }
  return walk(doc.content);
}

function docHasLinkMark(doc: any): boolean {
  if (!doc?.content) return false;
  function walk(nodes: any[]): boolean {
    for (const node of nodes) {
      if (node.marks?.some((m: any) => m.type === 'link')) return true;
      if (node.content && walk(node.content)) return true;
    }
    return false;
  }
  return walk(doc.content);
}

/** Run all SEO checks and return scored results */
export function scorePage(
  pageData: any,
  regions: { name: string }[],
  pageRegions: Record<string, any[]>,
): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const title = pageData.metaTitle || '';
  const desc = pageData.metaDescription || '';
  const slug = pageData.slug || '';

  // Meta title length
  if (!title) {
    checks.push({
      code: 'title-length',
      label: 'Meta title',
      status: 'fail',
      message: 'No meta title set — search engines will use the page title',
    });
  } else if (title.length >= 30 && title.length <= 60) {
    checks.push({
      code: 'title-length',
      label: 'Meta title',
      status: 'pass',
      message: `${title.length} characters — ideal length`,
    });
  } else if (title.length > 70) {
    checks.push({
      code: 'title-length',
      label: 'Meta title',
      status: 'fail',
      message: `${title.length} characters — will be truncated in search results (max ~60)`,
    });
  } else {
    checks.push({
      code: 'title-length',
      label: 'Meta title',
      status: 'warn',
      message: `${title.length} characters — aim for 30-60 characters`,
    });
  }

  // Meta description length
  if (!desc) {
    checks.push({
      code: 'desc-length',
      label: 'Meta description',
      status: 'fail',
      message: 'No meta description — search engines will auto-generate one',
    });
  } else if (desc.length >= 120 && desc.length <= 160) {
    checks.push({
      code: 'desc-length',
      label: 'Meta description',
      status: 'pass',
      message: `${desc.length} characters — ideal length`,
    });
  } else if (desc.length < 50) {
    checks.push({
      code: 'desc-length',
      label: 'Meta description',
      status: 'fail',
      message: `${desc.length} characters — too short, aim for 120-160`,
    });
  } else {
    checks.push({
      code: 'desc-length',
      label: 'Meta description',
      status: 'warn',
      message: `${desc.length} characters — aim for 120-160 characters`,
    });
  }

  // Slug quality
  if (slug.length > 75) {
    checks.push({
      code: 'slug-length',
      label: 'URL slug',
      status: 'fail',
      message: `${slug.length} characters — too long for search engines`,
    });
  } else if (slug.length > 50) {
    checks.push({
      code: 'slug-length',
      label: 'URL slug',
      status: 'warn',
      message: `${slug.length} characters — consider shortening`,
    });
  } else {
    checks.push({
      code: 'slug-length',
      label: 'URL slug',
      status: 'pass',
      message: 'Good length',
    });
  }

  // Content length
  const wordCount = countWords(regions, pageRegions);
  if (wordCount >= 300) {
    checks.push({
      code: 'content-length',
      label: 'Content length',
      status: 'pass',
      message: `${wordCount} words — good content length`,
    });
  } else if (wordCount >= 100) {
    checks.push({
      code: 'content-length',
      label: 'Content length',
      status: 'warn',
      message: `${wordCount} words — consider adding more content (aim for 300+)`,
    });
  } else {
    checks.push({
      code: 'content-length',
      label: 'Content length',
      status: 'fail',
      message: `${wordCount} words — thin content may rank poorly`,
    });
  }

  // Heading presence
  if (hasHeadings(regions, pageRegions)) {
    checks.push({
      code: 'headings',
      label: 'Headings',
      status: 'pass',
      message: 'Content uses heading structure',
    });
  } else {
    checks.push({
      code: 'headings',
      label: 'Headings',
      status: 'fail',
      message: 'No headings found — add H2/H3 headings to structure content',
    });
  }

  // Images (info only)
  checks.push({
    code: 'images',
    label: 'Images',
    status: hasImages(regions, pageRegions) ? 'pass' : 'info',
    message: hasImages(regions, pageRegions) ? 'Page includes images' : 'No images — consider adding visuals',
  });

  // Links (info only)
  checks.push({
    code: 'links',
    label: 'Links',
    status: hasLinks(regions, pageRegions) ? 'pass' : 'info',
    message: hasLinks(regions, pageRegions) ? 'Page includes links' : 'No links found',
  });

  return checks;
}

/** Calculate overall SEO score as percentage (0-100) */
export function calculateScore(checks: SeoCheck[]): number {
  const scorable = checks.filter(c => c.status !== 'info');
  if (scorable.length === 0) return 100;
  const passed = scorable.filter(c => c.status === 'pass').length;
  return Math.round((passed / scorable.length) * 100);
}
