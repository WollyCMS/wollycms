/** TipTap JSON node types */
interface TipTapNode {
  type: string;
  content?: TipTapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render marks (bold, italic, links, etc.) around text */
function renderMarks(text: string, marks?: TipTapNode['marks']): string {
  if (!marks || marks.length === 0) return escapeHtml(text);

  let result = escapeHtml(text);
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href ?? ''));
        const target = mark.attrs?.target ? ` target="${escapeHtml(String(mark.attrs.target))}"` : '';
        result = `<a href="${href}"${target}>${result}</a>`;
        break;
      }
      case 'subscript':
        result = `<sub>${result}</sub>`;
        break;
      case 'superscript':
        result = `<sup>${result}</sup>`;
        break;
    }
  }
  return result;
}

/** Render a TipTap JSON node to HTML */
function renderNode(node: TipTapNode): string {
  if (node.type === 'text') {
    return renderMarks(node.text ?? '', node.marks);
  }

  const children = node.content?.map(renderNode).join('') ?? '';

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return `<p>${children}</p>`;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      return `<h${level}>${children}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${children}</ul>`;
    case 'orderedList':
      return `<ol>${children}</ol>`;
    case 'listItem':
      return `<li>${children}</li>`;
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;
    case 'codeBlock': {
      const lang = node.attrs?.language ? ` class="language-${escapeHtml(String(node.attrs.language))}"` : '';
      return `<pre><code${lang}>${children}</code></pre>`;
    }
    case 'horizontalRule':
      return '<hr />';
    case 'hardBreak':
      return '<br />';
    case 'image': {
      const src = escapeHtml(String(node.attrs?.src ?? ''));
      const alt = escapeHtml(String(node.attrs?.alt ?? ''));
      const title = node.attrs?.title ? ` title="${escapeHtml(String(node.attrs.title))}"` : '';
      const width = node.attrs?.width ? String(node.attrs.width) : '';
      const float = node.attrs?.float ? String(node.attrs.float) : 'none';
      const caption = node.attrs?.caption ? String(node.attrs.caption) : '';

      const styles: string[] = [];
      if (width) styles.push(`width: ${escapeHtml(width)}`);
      if (float === 'center') {
        styles.push('display: block', 'margin-left: auto', 'margin-right: auto');
      } else if (float === 'left') {
        styles.push('float: left', 'margin: 0 1rem 0.5rem 0');
      } else if (float === 'right') {
        styles.push('float: right', 'margin: 0 0 0.5rem 1rem');
      } else if (width) {
        styles.push('display: inline-block', 'vertical-align: top');
      }
      const style = styles.length ? ` style="${styles.join('; ')}"` : '';

      const imgTag = `<img src="${src}" alt="${alt}"${title}${style} />`;
      const href = node.attrs?.href ? escapeHtml(String(node.attrs.href)) : '';
      const linkTarget = node.attrs?.linkTarget ? ` target="${escapeHtml(String(node.attrs.linkTarget))}"` : '';
      const wrapLink = (html: string) => href ? `<a href="${href}"${linkTarget}>${html}</a>` : html;
      if (caption) {
        const figStyle = width ? ` style="width: ${escapeHtml(width)}"` : '';
        const figClass = float === 'left' ? ' class="fig-left"' : float === 'right' ? ' class="fig-right"' : float === 'center' ? ' class="fig-center"' : '';
        return `<figure${figClass}${figStyle}>${wrapLink(`<img src="${src}" alt="${alt}"${title} style="width: 100%" />`)}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
      }
      return wrapLink(imgTag);
    }
    case 'table':
      return `<table>${children}</table>`;
    case 'tableRow':
      return `<tr>${children}</tr>`;
    case 'tableHeader':
      return `<th>${children}</th>`;
    case 'tableCell':
      return `<td>${children}</td>`;
    default:
      return children;
  }
}

/** Convert TipTap JSON document to HTML string */
export function renderRichText(doc: TipTapNode | null | undefined): string {
  if (!doc || doc.type !== 'doc') return '';
  return renderNode(doc);
}
