import { Extension } from '@tiptap/core';

export const HEADING_ANCHOR_PATTERN = /^[a-z][a-z0-9-]*$/;
export const HEADING_ANCHOR_MAX_LENGTH = 80;

/** Convert editor input or heading text into a stable, human-readable fragment ID. */
export function normalizeHeadingAnchorId(value: string): string {
  let normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (!normalized) return '';
  if (!/^[a-z]/.test(normalized)) normalized = `section-${normalized}`;

  return normalized
    .slice(0, HEADING_ANCHOR_MAX_LENGTH)
    .replace(/-+$/g, '');
}

export function isValidHeadingAnchorId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= HEADING_ANCHOR_MAX_LENGTH
    && HEADING_ANCHOR_PATTERN.test(value);
}

/** Adds an optional HTML fragment ID to TipTap heading nodes. */
export const HeadingAnchor = Extension.create({
  name: 'headingAnchor',

  addGlobalAttributes() {
    return [{
      types: ['heading'],
      attributes: {
        id: {
          default: null,
          parseHTML: (element: HTMLElement) => element.getAttribute('id'),
          renderHTML: (attributes: Record<string, unknown>) => {
            if (!isValidHeadingAnchorId(attributes.id)) return {};
            return {
              id: attributes.id,
              // Fragment targets can receive focus without entering normal Tab order.
              tabindex: '-1',
            };
          },
        },
      },
    }];
  },
});
