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

/** Extract heading nodes from a TipTap JSON document */
function extractHeadings(doc: any): { level: number; empty: boolean }[] {
  const headings: { level: number; empty: boolean }[] = [];
  if (!doc?.content) return headings;
  for (const node of doc.content) {
    if (node.type === 'heading' && node.attrs?.level) {
      headings.push({ level: node.attrs.level, empty: !hasTextContent(node) });
    }
  }
  return headings;
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
  ];
}
