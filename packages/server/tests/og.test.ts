import { describe, it, expect } from 'vitest';
import { defaultTemplate, type OgTemplateData } from '../src/og/template.js';

describe('OG Template', () => {
  it('returns a valid Satori node with required fields', () => {
    const data: OgTemplateData = { title: 'Test Page', siteName: 'MySite' };
    const node = defaultTemplate(data);
    expect(node.type).toBe('div');
    expect(node.props.style).toBeDefined();
    expect(node.props.children).toBeDefined();
  });

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(100);
    const node = defaultTemplate({ title: longTitle, siteName: 'MySite' });
    const middle = (node.props.children as any[])[1];
    const titleNode = middle.props.children[0];
    expect(titleNode.props.children).toHaveLength(80); // 77 chars + '...'
  });

  it('includes content type badge when provided', () => {
    const node = defaultTemplate({ title: 'Test', siteName: 'MySite', contentType: 'Blog' });
    const top = (node.props.children as any[])[0];
    const badge = top.props.children[1];
    expect(badge.props.children).toBe('Blog');
  });

  it('omits content type badge when not provided', () => {
    const node = defaultTemplate({ title: 'Test', siteName: 'MySite' });
    const top = (node.props.children as any[])[0];
    expect(top.props.children).toHaveLength(1); // just the accent bar
  });

  it('includes description when provided', () => {
    const node = defaultTemplate({ title: 'Test', siteName: 'MySite', description: 'A description' });
    const middle = (node.props.children as any[])[1];
    expect(middle.props.children).toHaveLength(2); // title + description
  });

  it('uses custom accent color', () => {
    const node = defaultTemplate({ title: 'Test', siteName: 'MySite', accentColor: '#FF0000' });
    const top = (node.props.children as any[])[0];
    const bar = top.props.children[0];
    expect(bar.props.style.backgroundColor).toBe('#FF0000');
  });
});
