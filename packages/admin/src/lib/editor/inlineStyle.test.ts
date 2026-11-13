import { describe, expect, it } from 'vitest';
import { imageAlignment, imageWidth } from './inlineStyle.js';

describe('image presentation values', () => {
  it('accepts existing editor sizes and legacy CSS lengths', () => {
    for (const width of ['25%', '50%', '75%', '100%', '320px', '12.5rem']) {
      expect(imageWidth(width)).toBe(width);
    }
    expect(imageWidth(' 50% ')).toBe('50%');
  });

  it('rejects declarations, expressions, and invalid alignments', () => {
    for (const width of [null, 50, '', '-1px', '50%; color: red', 'url(/x)', 'expression(alert(1))']) {
      expect(imageWidth(width)).toBeNull();
    }
    expect(imageAlignment('right')).toBe('right');
    expect(imageAlignment('none')).toBe('none');
    expect(imageAlignment('right; position: fixed')).toBeNull();
  });
});
