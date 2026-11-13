/**
 * Read legacy inline CSS without depending on styles applied to parsed markup.
 * CSP can leave element.style empty after DOMParser/innerHTML. Parsing the raw
 * attribute through a detached CSS declaration preserves shorthand/!important
 * handling without attaching the element or applying arbitrary styles.
 */
export function readInlineStyle(element: HTMLElement): CSSStyleDeclaration {
  const style = element.ownerDocument.createElement('span').style;
  style.cssText = element.getAttribute('style') || '';
  return style;
}

/** Accept CSS lengths, excluding expressions and additional declarations. */
export function imageWidth(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const width = value.trim().toLowerCase();
  return /^(?:\d+(?:\.\d+)?|\.\d+)(?:%|px|em|rem|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/.test(width)
    ? width
    : null;
}

export function imageAlignment(value: unknown): string | null {
  return typeof value === 'string' && ['none', 'left', 'center', 'right'].includes(value)
    ? value
    : null;
}
