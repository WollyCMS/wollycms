/** Accessibility content audit for WCAG AA compliance */

export interface A11yIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  region?: string;
  blockPbId?: number;
  field?: string;
}

/** Check if a TipTap node has any visible text content */
function hasTextContent(node: any): boolean {
  if (node.type === 'text' && node.text?.trim()) return true;
  if (node.content) {
    return node.content.some((child: any) => hasTextContent(child));
  }
  return false;
}

const HEADING_ANCHOR_PATTERN = /^[a-z][a-z0-9-]{0,79}$/;

interface ExtractedHeading {
  level: number;
  empty: boolean;
  anchorId: string | null;
}

/** Extract heading nodes from a TipTap JSON document */
function extractHeadings(doc: any): ExtractedHeading[] {
  const headings: ExtractedHeading[] = [];
  if (!doc?.content) return headings;
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'heading' && node.attrs?.level) {
        headings.push({
          level: node.attrs.level,
          empty: !hasTextContent(node),
          anchorId: typeof node.attrs?.id === 'string' && node.attrs.id ? node.attrs.id : null,
        });
      }
      if (node.content) walk(node.content);
    }
  }
  walk(doc.content);
  return headings;
}

/** Extract same-page fragment links from TipTap link marks. */
function extractFragmentLinks(doc: any): string[] {
  const links = new Set<string>();
  if (!doc?.content) return [];
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.marks) {
        for (const mark of node.marks) {
          const href = mark.type === 'link' ? mark.attrs?.href : null;
          if (typeof href === 'string' && href.startsWith('#')) links.add(href);
        }
      }
      if (node.content) walk(node.content);
    }
  }
  walk(doc.content);
  return [...links];
}

/** Extract fragment links from block URL fields, including nested repeater fields. */
function extractFragmentFieldLinks(value: unknown, fieldName: string): string[] {
  if (typeof value === 'string') {
    const isUrlField = fieldName === 'url' || fieldName === 'href' || fieldName.endsWith('_url');
    return isUrlField && value.startsWith('#') ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractFragmentFieldLinks(item, fieldName));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([name, item]) => extractFragmentFieldLinks(item, name));
  }
  return [];
}

/** Extract image nodes from TipTap JSON */
function extractImages(doc: any): { alt: string }[] {
  const images: { alt: string }[] = [];
  if (!doc?.content) return images;
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'image') {
        images.push({ alt: node.attrs?.alt || '' });
      }
      if (node.content) walk(node.content);
    }
  }
  walk(doc.content);
  return images;
}

/** Extract link nodes and check for empty text content */
function extractEmptyLinks(doc: any): boolean[] {
  const results: boolean[] = [];
  if (!doc?.content) return results;
  function walk(nodes: any[]) {
    for (const node of nodes) {
      if (node.type === 'text' && node.marks) {
        const linkMark = node.marks.find((m: any) => m.type === 'link');
        if (linkMark && (!node.text || !node.text.trim())) {
          results.push(true);
        }
      }
      if (node.content) walk(node.content);
    }
  }
  walk(doc.content);
  return results;
}

/** Check heading hierarchy across all blocks in all regions */
export function checkHeadingHierarchy(
  regions: { name: string; label: string }[],
  pageRegions: Record<string, any[]>,
): A11yIssue[] {
  const issues: A11yIssue[] = [];

  // Collect all headings in page order (across regions)
  const allHeadings: { level: number; empty: boolean; region: string; pbId: number; field: string }[] = [];

  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      const fields = block.fields || {};
      for (const [fieldName, value] of Object.entries(fields)) {
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          for (const h of extractHeadings(value)) {
            allHeadings.push({
              level: h.level,
              empty: h.empty,
              region: region.name,
              pbId: block.pb_id,
              field: fieldName,
            });
          }
        }
      }
    }
  }

  // Check for skipped levels and empty headings
  let prevLevel = 1; // page title is the implicit H1
  for (const h of allHeadings) {
    if (h.empty) {
      issues.push({
        type: 'warning',
        code: 'heading-empty',
        message: `Empty H${h.level} — heading has no text content`,
        region: h.region,
        blockPbId: h.pbId,
        field: h.field,
      });
    }
    if (h.level > prevLevel + 1) {
      issues.push({
        type: 'warning',
        code: 'heading-skip',
        message: `H${h.level} follows H${prevLevel} — skips H${prevLevel + 1}`,
        region: h.region,
        blockPbId: h.pbId,
        field: h.field,
      });
    }
    prevLevel = h.level;
  }

  return issues;
}

/** Check images for missing alt text */
export function checkImageAlt(
  regions: { name: string; label: string }[],
  pageRegions: Record<string, any[]>,
  mediaCache: Map<number, { altText?: string }>,
): A11yIssue[] {
  const issues: A11yIssue[] = [];

  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      const fields = block.fields || {};
      for (const [fieldName, value] of Object.entries(fields)) {
        // Check media picker fields (numeric media ID)
        if (typeof value === 'number' && mediaCache.has(value)) {
          const media = mediaCache.get(value)!;
          if (!media.altText) {
            issues.push({
              type: 'warning',
              code: 'img-alt',
              message: 'Image missing alt text',
              region: region.name,
              blockPbId: block.pb_id,
              field: fieldName,
            });
          }
        }

        // Check inline images in richtext
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          const imgs = extractImages(value);
          for (const img of imgs) {
            if (!img.alt) {
              issues.push({
                type: 'warning',
                code: 'img-alt-inline',
                message: 'Inline image missing alt text',
                region: region.name,
                blockPbId: block.pb_id,
                field: fieldName,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

/** Check for links with empty text content */
export function checkEmptyLinks(
  regions: { name: string; label: string }[],
  pageRegions: Record<string, any[]>,
): A11yIssue[] {
  const issues: A11yIssue[] = [];

  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      const fields = block.fields || {};
      for (const [fieldName, value] of Object.entries(fields)) {
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          const emptyLinks = extractEmptyLinks(value);
          for (const _ of emptyLinks) {
            issues.push({
              type: 'warning',
              code: 'link-empty',
              message: 'Link has no visible text',
              region: region.name,
              blockPbId: block.pb_id,
              field: fieldName,
            });
          }
        }
      }
    }
  }

  return issues;
}

/** Check heading anchor syntax, uniqueness, and same-page link targets. */
export function checkHeadingAnchors(
  regions: { name: string; label: string }[],
  pageRegions: Record<string, any[]>,
): A11yIssue[] {
  const issues: A11yIssue[] = [];
  const anchors = new Map<string, { region: string; pbId: number; field: string }[]>();
  const fragmentLinks: { href: string; region: string; pbId: number; field: string }[] = [];

  for (const region of regions) {
    const blocks = pageRegions?.[region.name] || [];
    for (const block of blocks) {
      const fields = block.fields || {};
      for (const [fieldName, value] of Object.entries(fields)) {
        if (value && typeof value === 'object' && (value as any).type === 'doc') {
          for (const heading of extractHeadings(value)) {
            if (!heading.anchorId) continue;
            if (!HEADING_ANCHOR_PATTERN.test(heading.anchorId)) {
              issues.push({
                type: 'warning',
                code: 'anchor-invalid',
                message: `Heading anchor "${heading.anchorId}" must start with a letter and use lowercase letters, numbers, or hyphens`,
                region: region.name,
                blockPbId: block.pb_id,
                field: fieldName,
              });
              continue;
            }
            const occurrences = anchors.get(heading.anchorId) || [];
            occurrences.push({ region: region.name, pbId: block.pb_id, field: fieldName });
            anchors.set(heading.anchorId, occurrences);
          }

          for (const href of extractFragmentLinks(value)) {
            fragmentLinks.push({ href, region: region.name, pbId: block.pb_id, field: fieldName });
          }
        } else {
          for (const href of extractFragmentFieldLinks(value, fieldName)) {
            fragmentLinks.push({ href, region: region.name, pbId: block.pb_id, field: fieldName });
          }
        }
      }
    }
  }

  for (const [anchorId, occurrences] of anchors) {
    if (occurrences.length < 2) continue;
    for (const occurrence of occurrences) {
      issues.push({
        type: 'warning',
        code: 'anchor-duplicate',
        message: `Heading anchor "#${anchorId}" is used more than once on this page`,
        region: occurrence.region,
        blockPbId: occurrence.pbId,
        field: occurrence.field,
      });
    }
  }

  for (const link of fragmentLinks) {
    const anchorId = link.href.slice(1);
    if (!anchors.has(anchorId)) {
      issues.push({
        type: 'warning',
        code: 'anchor-target-missing',
        message: `In-page link "${link.href}" has no matching CMS heading anchor`,
        region: link.region,
        blockPbId: link.pbId,
        field: link.field,
      });
    }
  }

  return issues;
}

/** Run all accessibility checks on a page */
export function auditPageAccessibility(
  regions: { name: string; label: string }[],
  pageRegions: Record<string, any[]>,
  mediaCache: Map<number, { altText?: string }>,
): A11yIssue[] {
  return [
    ...checkHeadingHierarchy(regions, pageRegions),
    ...checkImageAlt(regions, pageRegions, mediaCache),
    ...checkEmptyLinks(regions, pageRegions),
    ...checkHeadingAnchors(regions, pageRegions),
  ];
}
