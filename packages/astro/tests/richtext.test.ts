import { describe, expect, it } from 'vitest';

import { renderRichText } from '../src/helpers/richtext.js';

describe('rich-text heading anchors', () => {
  it('renders a valid heading anchor as a focusable fragment target', () => {
    const html = renderRichText({
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2, id: 'hear-from-students' },
        content: [{ type: 'text', text: 'Hear from Students' }],
      }],
    });

    expect(html).toBe('<h2 id="hear-from-students" tabindex="-1">Hear from Students</h2>');
  });

  it('omits an invalid heading anchor from rendered HTML', () => {
    const html = renderRichText({
      type: 'doc',
      content: [{
        type: 'heading',
        attrs: { level: 2, id: 'invalid anchor' },
        content: [{ type: 'text', text: 'Heading' }],
      }],
    });

    expect(html).toBe('<h2>Heading</h2>');
  });
});
