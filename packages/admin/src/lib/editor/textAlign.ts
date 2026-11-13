import TextAlign from '@tiptap/extension-text-align';
import { readInlineStyle } from './inlineStyle.js';

/** Preserve paragraph/heading alignment through HTML Source under strict CSP. */
export const SourceTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        textAlign: {
          default: this.options.defaultAlignment,
          parseHTML: (element: HTMLElement) => {
            const dataAlign = element.getAttribute('data-text-align');
            if (dataAlign && this.options.alignments.includes(dataAlign)) return dataAlign;
            const alignment = readInlineStyle(element).textAlign;
            return this.options.alignments.includes(alignment)
              ? alignment
              : this.options.defaultAlignment;
          },
          renderHTML: (attributes: Record<string, unknown>) => {
            const alignment = attributes.textAlign;
            if (typeof alignment !== 'string' || !this.options.alignments.includes(alignment)) return {};
            return { 'data-text-align': alignment, style: `text-align: ${alignment}` };
          },
        },
      },
    }];
  },
});
