<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, Extension } from '@tiptap/core';
  import { Plugin, PluginKey } from '@tiptap/pm/state';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Underline from '@tiptap/extension-underline';
  import Image from '@tiptap/extension-image';
  import Subscript from '@tiptap/extension-subscript';
  import Superscript from '@tiptap/extension-superscript';
  import TextAlign from '@tiptap/extension-text-align';
  import { focusTrap } from '$lib/focusTrap.js';
  import Table from '@tiptap/extension-table';
  import TableRow from '@tiptap/extension-table-row';
  import TableCell from '@tiptap/extension-table-cell';
  import TableHeader from '@tiptap/extension-table-header';
  import Placeholder from '@tiptap/extension-placeholder';
  import MediaPicker from './MediaPicker.svelte';

  let { content, onUpdate }: { content: any; onUpdate: (json: any) => void } = $props();

  let editorEl: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();
  let hasUserEdit = false;
  let isDestroying = false;
  let txCount = $state(0);
  let headingWarnings = $state<string[]>([]);
  let showImagePicker = $state(false);
  let showSlashMenu = $state(false);
  let slashMenuPos = $state({ top: 0, left: 0 });
  let slashFilter = $state('');
  let slashSelectedIndex = $state(0);
  let isInTable = $state(false);
  let isImageSelected = $state(false);
  let showSource = $state(false);
  let sourceHtml = $state('');
  let pendingImage = $state<{ id: number; src: string; alt: string; title: string } | null>(null);
  let showLinkDialog = $state(false);
  let linkUrl = $state('');
  let linkText = $state('');
  let linkNewTab = $state(false);
  let linkTab = $state<'url' | 'media'>('url');

  // --- SVG icons ---
  const s = (d: string) => `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ico = {
    bold: '<strong style="font-family:serif;font-size:14px">B</strong>',
    italic: '<em style="font-family:serif;font-size:14px">I</em>',
    underline: '<span style="text-decoration:underline;font-size:13px">U</span>',
    strike: '<span style="text-decoration:line-through;font-size:13px">S</span>',
    sub: '<span style="font-size:11px">X<sub style="font-size:8px">2</sub></span>',
    sup: '<span style="font-size:11px">X<sup style="font-size:8px">2</sup></span>',
    bulletList: s('<line x1="8" y1="4" x2="17" y2="4"/><line x1="8" y1="10" x2="17" y2="10"/><line x1="8" y1="16" x2="17" y2="16"/><circle cx="4" cy="4" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="16" r="1.5" fill="currentColor" stroke="none"/>'),
    orderedList: s('<line x1="9" y1="4" x2="17" y2="4"/><line x1="9" y1="10" x2="17" y2="10"/><line x1="9" y1="16" x2="17" y2="16"/><rect x="2.5" y="2" width="4" height="4" rx="0.8" fill="currentColor" stroke="none" opacity="0.15"/><text x="3.2" y="5.4" font-size="4.5" fill="currentColor" stroke="none" style="font-family:system-ui;font-weight:700">1</text><rect x="2.5" y="8" width="4" height="4" rx="0.8" fill="currentColor" stroke="none" opacity="0.15"/><text x="3.2" y="11.4" font-size="4.5" fill="currentColor" stroke="none" style="font-family:system-ui;font-weight:700">2</text><rect x="2.5" y="14" width="4" height="4" rx="0.8" fill="currentColor" stroke="none" opacity="0.15"/><text x="3.2" y="17.4" font-size="4.5" fill="currentColor" stroke="none" style="font-family:system-ui;font-weight:700">3</text>'),
    blockquote: s('<line x1="9" y1="5" x2="17" y2="5"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="15" x2="17" y2="15"/><line x1="4" y1="3" x2="4" y2="17" stroke-width="2.5"/>'),
    divider: s('<line x1="2" y1="10" x2="18" y2="10" stroke-width="2"/>'),
    alignLeft: s('<line x1="3" y1="4" x2="17" y2="4"/><line x1="3" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="16" x2="10" y2="16"/>'),
    alignCenter: s('<line x1="3" y1="4" x2="17" y2="4"/><line x1="5.5" y1="8" x2="14.5" y2="8"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="6" y1="16" x2="14" y2="16"/>'),
    alignRight: s('<line x1="3" y1="4" x2="17" y2="4"/><line x1="8" y1="8" x2="17" y2="8"/><line x1="5" y1="12" x2="17" y2="12"/><line x1="10" y1="16" x2="17" y2="16"/>'),
    link: s('<path d="M10 13l-2 2a3 3 0 0 1-4.24-4.24l2-2"/><path d="M10 7l2-2a3 3 0 0 1 4.24 4.24l-2 2"/><line x1="8.5" y1="11.5" x2="11.5" y2="8.5"/>'),
    image: s('<rect x="2" y="3" width="16" height="14" rx="2"/><circle cx="7" cy="8" r="2" fill="currentColor" stroke="none"/><path d="M18 13l-4-4-3 3-2-2-5 5v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z" fill="currentColor" stroke="none" opacity="0.2"/>'),
    table: s('<rect x="2" y="3" width="16" height="14" rx="1.5"/><line x1="2" y1="8" x2="18" y2="8"/><line x1="2" y1="13" x2="18" y2="13"/><line x1="8" y1="3" x2="8" y2="17"/><line x1="13" y1="3" x2="13" y2="17"/>'),
    undo: s('<path d="M4 7h10a4 4 0 0 1 0 8h-4"/><polyline points="7 4 4 7 7 10"/>'),
    redo: s('<path d="M16 7H6a4 4 0 0 0 0 8h4"/><polyline points="13 4 16 7 13 10"/>'),
    source: '<span style="font-size:12px;font-weight:600;font-family:monospace">&lt;/&gt;</span>',
  };

  // --- Reactive toolbar state (re-evaluates on every transaction via txCount) ---
  let active = $derived.by(() => {
    void txCount;
    if (!editor) return {
      bold: false, italic: false, underline: false, strike: false,
      subscript: false, superscript: false,
      bulletList: false, orderedList: false, blockquote: false, link: false,
      alignLeft: true, alignCenter: false, alignRight: false,
      blockFormat: 'paragraph' as string,
    };
    return {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      subscript: editor.isActive('subscript'),
      superscript: editor.isActive('superscript'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      link: editor.isActive('link'),
      alignLeft: !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }),
      alignCenter: editor.isActive({ textAlign: 'center' }),
      alignRight: editor.isActive({ textAlign: 'right' }),
      blockFormat:
        editor.isActive('heading', { level: 2 }) ? 'h2'
        : editor.isActive('heading', { level: 3 }) ? 'h3'
        : editor.isActive('heading', { level: 4 }) ? 'h4'
        : editor.isActive('heading', { level: 5 }) ? 'h5'
        : 'paragraph',
    };
  });

  let imageAttrs = $derived.by(() => {
    void txCount;
    if (!isImageSelected || !editor) return { width: '50%', float: 'none', caption: '' };
    const attrs = editor.getAttributes('image');
    return { width: attrs.width || '50%', float: attrs.float || 'none', caption: attrs.caption || '' };
  });

  function setBlockFormat(format: string) {
    if (!editor) return;
    if (format === 'paragraph') editor.chain().focus().setParagraph().run();
    else if (format === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (format === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
    else if (format === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
    else if (format === 'h5') editor.chain().focus().toggleHeading({ level: 5 }).run();
  }

  // --- Custom Image with width, float (incl. center), caption ---
  const CustomImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: { default: '50%', parseHTML: (el: HTMLElement) => el.style.width || null },
        float: {
          default: 'none',
          parseHTML: (el: HTMLElement) => {
            if (el.style.marginLeft === 'auto' && el.style.marginRight === 'auto') return 'center';
            return el.style.float || el.getAttribute('data-float') || null;
          },
        },
        caption: { default: '', parseHTML: (el: HTMLElement) => el.getAttribute('data-caption') || null },
      };
    },
    renderHTML({ node }) {
      const { src, alt, title, width, float: f, caption } = node.attrs;
      const st: string[] = [];
      if (width) st.push(`width: ${width}`);
      if (f === 'center') {
        st.push('display: block', 'margin-left: auto', 'margin-right: auto');
      } else if (f && f !== 'none') {
        st.push(`float: ${f}`);
        st.push(f === 'left' ? 'margin: 0 1rem 0.5rem 0' : 'margin: 0 0 0.5rem 1rem');
      }
      const a: Record<string, any> = {};
      if (src) a.src = src;
      if (alt) a.alt = alt;
      if (title) a.title = title;
      if (st.length) a.style = st.join('; ');
      if (caption) a['data-caption'] = caption;
      return ['img', a];
    },
  });

  const slashCommands = [
    { label: 'Heading 2', description: 'Large section heading', command: 'h2' },
    { label: 'Heading 3', description: 'Medium section heading', command: 'h3' },
    { label: 'Heading 4', description: 'Small section heading', command: 'h4' },
    { label: 'Heading 5', description: 'Minor section heading', command: 'h5' },
    { label: 'Bullet List', description: 'Unordered list', command: 'bullet' },
    { label: 'Numbered List', description: 'Ordered list', command: 'ordered' },
    { label: 'Blockquote', description: 'Quoted text block', command: 'quote' },
    { label: 'Divider', description: 'Horizontal separator line', command: 'hr' },
    { label: 'Image', description: 'Insert from media library', command: 'image' },
    { label: 'Document', description: 'Link to a file or document', command: 'document' },
    { label: 'Table', description: '3x3 table', command: 'table' },
    { label: 'Link', description: 'Insert hyperlink', command: 'link' },
  ];

  let filteredSlashCommands = $derived(
    slashFilter
      ? slashCommands.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase()))
      : slashCommands
  );

  function checkHeadings(doc: any) {
    const warnings: string[] = [];
    if (!doc?.content) { headingWarnings = warnings; return; }
    let prev = 1;
    for (const node of doc.content) {
      if (node.type === 'heading' && node.attrs?.level) {
        const lvl = node.attrs.level;
        if (lvl > prev + 1) warnings.push(`H${lvl} follows H${prev} — skips H${prev + 1}`);
        prev = lvl;
      }
    }
    headingWarnings = warnings;
  }

  const PasteCleanup = Extension.create({
    name: 'pasteCleanup',
    addProseMirrorPlugins() {
      return [new Plugin({
        key: new PluginKey('pasteCleanup'),
        props: {
          transformPastedHTML(html: string) {
            return html
              .replace(/<!--\[if[^]*?endif\]-->/gi, '')
              .replace(/<\/?o:[^>]*>/gi, '')
              .replace(/<\/?v:[^>]*>/gi, '')
              .replace(/<\/?w:[^>]*>/gi, '')
              .replace(/\s*class="[^"]*"/gi, '')
              .replace(/\s*style="[^"]*"/gi, '')
              .replace(/<span[^>]*>\s*<\/span>/gi, '')
              .replace(/mso-[^;"']*/gi, '')
              .replace(/&nbsp;/gi, ' ');
          },
        },
      })];
    },
  });

  onMount(() => {
    editor = new Editor({
      element: editorEl!,
      extensions: [
        StarterKit,
        Underline,
        Subscript,
        Superscript,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        CustomImage,
        Table.configure({ resizable: false }),
        TableRow, TableCell, TableHeader,
        Placeholder.configure({ placeholder: 'Type / for commands...' }),
        PasteCleanup,
      ],
      content: content || '',
      onTransaction: ({ transaction }) => {
        if (isDestroying) return;
        txCount++;
        isInTable = !!editor?.isActive('table');
        isImageSelected = !!editor?.isActive('image');
        if (editor) checkHeadings(editor.getJSON());
        if (transaction.docChanged) hasUserEdit = true;
      },
      onBlur: () => {
        if (isDestroying) return;
        if (editor && !showSource && hasUserEdit) {
          onUpdate(editor.getJSON());
          hasUserEdit = false;
        }
        setTimeout(() => { if (!isDestroying) showSlashMenu = false; }, 200);
      },
    });
    editorEl!.addEventListener('keydown', handleSlashKey);
  });

  onDestroy(() => {
    isDestroying = true;
    editorEl?.removeEventListener('keydown', handleSlashKey);
    editor?.destroy();
  });

  function handleSlashKey(e: KeyboardEvent) {
    if (showSource) return;
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') { e.preventDefault(); slashSelectedIndex = Math.min(slashSelectedIndex + 1, filteredSlashCommands.length - 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); slashSelectedIndex = Math.max(slashSelectedIndex - 1, 0); return; }
      if (e.key === 'Enter') { e.preventDefault(); executeSlashCommand(slashSelectedIndex); return; }
      if (e.key === 'Escape') { e.preventDefault(); showSlashMenu = false; return; }
      return;
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!editor) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from, '\n');
      if (textBefore === '' || textBefore === '\n') { e.preventDefault(); openSlashMenu(); }
    }
  }

  function openSlashMenu() {
    if (!editor || !editorEl) return;
    const coords = editor.view.coordsAtPos(editor.view.state.selection.from);
    const rect = editorEl.getBoundingClientRect();
    slashMenuPos = { top: coords.bottom - rect.top + 4, left: coords.left - rect.left };
    slashFilter = '';
    slashSelectedIndex = 0;
    showSlashMenu = true;
  }

  function executeSlashCommand(index: number) {
    const cmd = filteredSlashCommands[index];
    if (!cmd || !editor) return;
    showSlashMenu = false;
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (textBefore === '/') editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    switch (cmd.command) {
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'h4': editor.chain().focus().toggleHeading({ level: 4 }).run(); break;
      case 'h5': editor.chain().focus().toggleHeading({ level: 5 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'hr': editor.chain().focus().setHorizontalRule().run(); break;
      case 'image': showImagePicker = true; pendingImage = null; break;
      case 'document': linkTab = 'media'; openLinkDialog(); break;
      case 'table': editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'link': openLinkDialog(); break;
    }
  }

  // --- Source toggle (editor div stays in DOM, just hidden) ---
  function toggleSource() {
    if (!editor) return;
    if (showSource) {
      editor.commands.setContent(sourceHtml, false);
      onUpdate(editor.getJSON());
      showSource = false;
    } else {
      sourceHtml = editor.getHTML();
      showSource = true;
    }
  }

  function onSourceBlur() {
    if (editor && showSource) {
      editor.commands.setContent(sourceHtml, false);
      onUpdate(editor.getJSON());
    }
  }

  // --- Link dialog ---
  function openLinkDialog() {
    if (!editor) return;
    if (editor.isActive('link')) {
      const attrs = editor.getAttributes('link');
      linkUrl = attrs.href || '';
      linkNewTab = attrs.target === '_blank';
    } else {
      linkUrl = '';
      linkNewTab = false;
    }
    const { from, to } = editor.state.selection;
    linkText = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
    if (linkTab !== 'media') linkTab = 'url';
    showLinkDialog = true;
  }

  function insertLink() {
    if (!editor || !linkUrl) return;
    const linkAttrs: Record<string, any> = { href: linkUrl };
    if (linkNewTab) linkAttrs.target = '_blank';
    else linkAttrs.target = null;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().setLink(linkAttrs).run();
    } else {
      const text = linkText || linkUrl;
      editor.chain().focus().insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: linkAttrs }] }).run();
    }
    showLinkDialog = false;
  }

  function removeLink() { editor?.chain().focus().unsetLink().run(); showLinkDialog = false; }

  function onLinkMediaSelect(mediaId: number | null) {
    if (mediaId) linkUrl = `/api/content/media/${mediaId}/original`;
  }

  function onLinkMediaSelectItem(item: any) {
    if (!linkText) linkText = item.title || item.originalName || '';
    linkTab = 'url';
  }

  // --- Image picker (two-step) ---
  function openImagePicker() { pendingImage = null; showImagePicker = true; }
  function onImageSelect(mediaId: number | null) { if (!mediaId) showImagePicker = false; }
  function onImageSelectItem(item: any) {
    pendingImage = { id: item.id, src: `/api/content/media/${item.id}/large`, alt: item.altText || '', title: item.title || item.originalName || '' };
  }
  function confirmImageInsert() {
    if (!editor || !pendingImage) return;
    editor.chain().focus().setImage({ src: pendingImage.src, alt: pendingImage.alt }).run();
    pendingImage = null; showImagePicker = false;
  }
  function backToImagePick() { pendingImage = null; }
  function closeImagePicker() { showImagePicker = false; pendingImage = null; }

  // --- Image toolbar ---
  function setImageAttr(attr: string, value: any) { editor?.chain().focus().updateAttributes('image', { [attr]: value }).run(); }
  function editImageAlt() {
    if (!editor) return;
    const alt = prompt('Alt text for this image:', editor.getAttributes('image').alt || '');
    if (alt !== null) editor.chain().focus().updateAttributes('image', { alt }).run();
  }
  function editImageCaption() {
    if (!editor) return;
    const caption = prompt('Image caption:', editor.getAttributes('image').caption || '');
    if (caption !== null) editor.chain().focus().updateAttributes('image', { caption }).run();
  }
</script>

<div class="rte-wrap">
  <div class="rte-toolbar">
    {#if showSource}
      <button type="button" class="rte-btn active" onclick={toggleSource} title="Visual editor">{@html ico.source}</button>
      <span class="rte-source-label">HTML Source — click to return to visual editor</span>
    {:else}
      <select class="rte-format-select" value={active.blockFormat}
        onchange={(e) => setBlockFormat((e.target as HTMLSelectElement).value)}
        aria-label="Block format">
        <option value="paragraph">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h5">Heading 5</option>
      </select>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" class:active={active.bold} onclick={() => editor?.chain().focus().toggleBold().run()} title="Bold">{@html ico.bold}</button>
      <button type="button" class="rte-btn" class:active={active.italic} onclick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">{@html ico.italic}</button>
      <button type="button" class="rte-btn" class:active={active.underline} onclick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline">{@html ico.underline}</button>
      <button type="button" class="rte-btn" class:active={active.strike} onclick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough">{@html ico.strike}</button>
      <button type="button" class="rte-btn" class:active={active.subscript} onclick={() => editor?.chain().focus().toggleSubscript().run()} title="Subscript">{@html ico.sub}</button>
      <button type="button" class="rte-btn" class:active={active.superscript} onclick={() => editor?.chain().focus().toggleSuperscript().run()} title="Superscript">{@html ico.sup}</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" class:active={active.alignLeft} onclick={() => editor?.chain().focus().setTextAlign('left').run()} title="Align Left">{@html ico.alignLeft}</button>
      <button type="button" class="rte-btn" class:active={active.alignCenter} onclick={() => editor?.chain().focus().setTextAlign('center').run()} title="Align Center">{@html ico.alignCenter}</button>
      <button type="button" class="rte-btn" class:active={active.alignRight} onclick={() => editor?.chain().focus().setTextAlign('right').run()} title="Align Right">{@html ico.alignRight}</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" class:active={active.bulletList} onclick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet List">{@html ico.bulletList}</button>
      <button type="button" class="rte-btn" class:active={active.orderedList} onclick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered List">{@html ico.orderedList}</button>
      <button type="button" class="rte-btn" class:active={active.blockquote} onclick={() => editor?.chain().focus().toggleBlockquote().run()} title="Block Quote">{@html ico.blockquote}</button>
      <button type="button" class="rte-btn" onclick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider Line">{@html ico.divider}</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" class:active={active.link} onclick={() => openLinkDialog()} title="Insert Link">{@html ico.link}</button>
      <button type="button" class="rte-btn" onclick={openImagePicker} title="Insert Image">{@html ico.image}</button>
      <button type="button" class="rte-btn" onclick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">{@html ico.table}</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" onclick={() => editor?.chain().focus().undo().run()} title="Undo">{@html ico.undo}</button>
      <button type="button" class="rte-btn" onclick={() => editor?.chain().focus().redo().run()} title="Redo">{@html ico.redo}</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn" onclick={toggleSource} title="HTML Source">{@html ico.source}</button>
    {/if}
  </div>

  {#if isInTable && !showSource}
    <div class="rte-table-toolbar">
      <span class="rte-table-label">Table:</span>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addRowBefore().run()}>+ Row Above</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addRowAfter().run()}>+ Row Below</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addColumnBefore().run()}>+ Col Left</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().addColumnAfter().run()}>+ Col Right</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteRow().run()}>Del Row</button>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteColumn().run()}>Del Col</button>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteTable().run()}>Del Table</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().toggleHeaderRow().run()}>Toggle Header</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().mergeCells().run()}>Merge</button>
      <button type="button" class="rte-btn-sm" onclick={() => editor?.chain().focus().splitCell().run()}>Split</button>
    </div>
  {/if}

  {#if isImageSelected && !showSource}
    <div class="rte-image-toolbar">
      <span class="rte-image-label">Size:</span>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.width === '25%'} onclick={() => setImageAttr('width', '25%')}>S</button>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.width === '50%'} onclick={() => setImageAttr('width', '50%')}>M</button>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.width === '75%'} onclick={() => setImageAttr('width', '75%')}>L</button>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.width === '100%'} onclick={() => setImageAttr('width', '100%')}>Full</button>
      <span class="rte-divider"></span>
      <span class="rte-image-label">Align:</span>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.float === 'none'} onclick={() => setImageAttr('float', 'none')}>Inline</button>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.float === 'left'} onclick={() => setImageAttr('float', 'left')}>Left</button>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.float === 'center'} onclick={() => setImageAttr('float', 'center')}>Center</button>
      <button type="button" class="rte-btn-sm" class:active={imageAttrs.float === 'right'} onclick={() => setImageAttr('float', 'right')}>Right</button>
      <span class="rte-divider"></span>
      <button type="button" class="rte-btn-sm" onclick={editImageAlt}>Alt</button>
      <button type="button" class="rte-btn-sm" onclick={editImageCaption}>Caption</button>
      <button type="button" class="rte-btn-sm rte-btn-danger" onclick={() => editor?.chain().focus().deleteSelection().run()}>Remove</button>
    </div>
    {#if imageAttrs.caption}
      <div class="rte-image-caption-bar">Caption: <em>{imageAttrs.caption}</em></div>
    {/if}
  {/if}

  {#if headingWarnings.length > 0 && !showSource}
    <div class="rte-heading-warn" role="status">
      {#each headingWarnings as warn}
        <span class="rte-heading-warn-item">{warn}</span>
      {/each}
    </div>
  {/if}

  <div class="rte-editor-wrap">
    {#if showSource}
      <textarea class="rte-source" bind:value={sourceHtml} onblur={onSourceBlur} spellcheck="false"></textarea>
    {/if}
    <div class="rte-editor" bind:this={editorEl} class:rte-hidden={showSource}></div>

    {#if showSlashMenu && !showSource}
      <div class="slash-menu-container" style="top: {slashMenuPos.top}px; left: {slashMenuPos.left}px;">
        <div class="slash-menu">
          {#each filteredSlashCommands as cmd, i}
            <button
              class="slash-menu-item"
              class:selected={i === slashSelectedIndex}
              onmousedown={(e) => { e.preventDefault(); executeSlashCommand(i); }}
              onmouseenter={() => { slashSelectedIndex = i; }}
            >
              <span class="slash-menu-label">{cmd.label}</span>
              <span class="slash-menu-desc">{cmd.description}</span>
            </button>
          {/each}
          {#if filteredSlashCommands.length === 0}
            <div class="slash-menu-empty">No matching commands</div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Image picker modal -->
{#if showImagePicker}
  <div class="modal-overlay" onclick={closeImagePicker} role="dialog" aria-modal="true" aria-labelledby="insert-image-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 700px;" use:focusTrap onescape={closeImagePicker}>
      <div class="modal-header">
        <h2 id="insert-image-title">{pendingImage ? 'Set Alt Text' : 'Insert Image'}</h2>
        <button class="btn-icon" onclick={closeImagePicker} aria-label="Close">&#10005;</button>
      </div>
      {#if pendingImage}
        <div class="image-confirm">
          <div class="image-confirm-preview-wrap">
            <img src={`/api/content/media/${pendingImage.id}/medium`} alt="" class="image-confirm-preview" />
          </div>
          <div class="image-confirm-form">
            <label class="link-label" for="image-alt-input">Alt Text</label>
            <input id="image-alt-input" type="text" class="link-input" bind:value={pendingImage.alt}
              placeholder="Describe this image for screen readers" />
            <p class="image-confirm-hint">Describes the image for screen readers and when images can't load.</p>
          </div>
          <div class="link-footer">
            <button class="btn btn-outline" onclick={backToImagePick}>&larr; Back</button>
            <div style="flex: 1;"></div>
            <button class="btn btn-primary" onclick={confirmImageInsert}>Insert Image</button>
          </div>
        </div>
      {:else}
        <MediaPicker inline allowUpload initialTypeFilter="image" value={null}
          onSelect={onImageSelect} onSelectItem={onImageSelectItem} />
      {/if}
    </div>
  </div>
{/if}

<!-- Link dialog modal -->
{#if showLinkDialog}
  <div class="modal-overlay" onclick={() => showLinkDialog = false} role="dialog" aria-modal="true" aria-labelledby="link-dialog-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 700px;" use:focusTrap onescape={() => showLinkDialog = false}>
      <div class="modal-header">
        <h2 id="link-dialog-title">{editor?.isActive('link') ? 'Edit Link' : 'Insert Link'}</h2>
        <button class="btn-icon" onclick={() => showLinkDialog = false} aria-label="Close">&#10005;</button>
      </div>
      <div class="link-tabs">
        <button class="link-tab" class:active={linkTab === 'url'} onclick={() => linkTab = 'url'}>URL</button>
        <button class="link-tab" class:active={linkTab === 'media'} onclick={() => linkTab = 'media'}>Media Library</button>
      </div>
      {#if linkTab === 'url'}
        <div class="link-form">
          <label class="link-label" for="link-url-input">URL</label>
          <input id="link-url-input" type="text" class="link-input" bind:value={linkUrl} placeholder="https://example.com or /page-slug" />
          <label class="link-label link-label-spaced" for="link-text-input">Display Text</label>
          <input id="link-text-input" type="text" class="link-input" bind:value={linkText} placeholder="Link text (uses URL if empty)" />
          <label class="link-checkbox-label">
            <input type="checkbox" bind:checked={linkNewTab} />
            Open in new tab
          </label>
        </div>
      {:else}
        <MediaPicker inline allowUpload initialTypeFilter="document" value={null}
          onSelect={onLinkMediaSelect} onSelectItem={onLinkMediaSelectItem} />
      {/if}
      <div class="link-footer">
        {#if editor?.isActive('link')}
          <button class="btn btn-danger-outline" onclick={removeLink}>Remove Link</button>
        {/if}
        <div style="flex: 1;"></div>
        <button class="btn btn-outline" onclick={() => showLinkDialog = false}>Cancel</button>
        <button class="btn btn-primary" onclick={insertLink} disabled={!linkUrl}>
          {editor?.isActive('link') ? 'Update Link' : 'Insert Link'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .rte-wrap { border: 1px solid var(--c-border, #e2e8f0); border-radius: var(--radius, 6px); background: var(--c-surface, #fff); }
  .rte-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; padding: 6px 8px; background: var(--c-bg, #f7f8fa); border-bottom: 1px solid var(--c-border, #e2e8f0); position: sticky; top: 0; z-index: 10; border-radius: var(--radius, 6px) var(--radius, 6px) 0 0; }
  .rte-format-select { height: 28px; padding: 0 4px; font-size: 0.75rem; font-weight: 600; font-family: var(--font, system-ui); color: var(--c-text, #2d3748); background: var(--c-surface, #fff); border: 1px solid var(--c-border, #e2e8f0); border-radius: 4px; cursor: pointer; outline: none; }
  .rte-format-select:focus { border-color: var(--c-accent, #3182ce); }
  .rte-source-label { font-size: 0.75rem; color: var(--c-text-light, #64748b); margin-left: 0.5rem; }
  .rte-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 4px; font-size: 0.75rem; font-weight: 600; font-family: var(--font, system-ui); color: var(--c-text, #2d3748); background: transparent; border: 1px solid transparent; border-radius: 4px; cursor: pointer; transition: background 0.12s, border-color 0.12s; }
  .rte-btn:hover { background: var(--c-border, #e2e8f0); }
  .rte-btn.active { background: var(--c-accent, #3182ce); color: #fff; border-color: var(--c-accent, #3182ce); }
  .rte-divider { display: inline-block; width: 1px; height: 20px; background: var(--c-border, #e2e8f0); margin: 0 3px; }

  .rte-table-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; padding: 4px 8px; background: color-mix(in srgb, var(--c-accent), transparent 90%); border-bottom: 1px solid color-mix(in srgb, var(--c-accent), transparent 60%); }
  .rte-table-label { font-size: 0.7rem; font-weight: 600; color: var(--c-accent); margin-right: 4px; }
  .rte-image-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; padding: 4px 8px; background: color-mix(in srgb, var(--c-success), transparent 90%); border-bottom: 1px solid color-mix(in srgb, var(--c-success), transparent 60%); }
  .rte-image-label { font-size: 0.7rem; font-weight: 600; color: var(--c-success); margin-right: 2px; margin-left: 2px; }
  .rte-image-caption-bar { padding: 4px 10px; background: color-mix(in srgb, var(--c-success), transparent 90%); border-bottom: 1px solid color-mix(in srgb, var(--c-success), transparent 60%); font-size: 0.72rem; color: var(--c-success); }

  .rte-btn-sm { display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 6px; font-size: 0.68rem; font-weight: 500; font-family: var(--font, system-ui); color: var(--c-text, #2d3748); background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 3px; cursor: pointer; transition: background 0.12s; }
  .rte-btn-sm:hover { background: var(--c-bg-subtle); }
  .rte-btn-sm.active { background: var(--c-success); color: white; border-color: var(--c-success); }
  .rte-btn-danger { color: var(--c-danger); }
  .rte-btn-danger:hover { background: color-mix(in srgb, var(--c-danger), transparent 90%); border-color: var(--c-danger); }

  .rte-heading-warn { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 4px 10px; background: color-mix(in srgb, var(--c-warning), transparent 80%); border-bottom: 1px solid color-mix(in srgb, var(--c-warning), transparent 50%); font-size: 0.72rem; color: var(--c-warning); }
  .rte-heading-warn-item::before { content: '\26A0\FE0F '; }

  .rte-editor-wrap { position: relative; }
  .rte-editor { min-height: 200px; padding: 12px 16px; font-family: var(--font, system-ui); font-size: 0.9rem; line-height: 1.6; color: var(--c-text, #2d3748); }
  .rte-editor.rte-hidden { display: none; }
  .rte-source { display: block; width: 100%; min-height: 300px; padding: 12px 16px; border: none; outline: none; resize: vertical; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.82rem; line-height: 1.6; color: var(--c-text, #2d3748); background: color-mix(in srgb, var(--c-warning), transparent 90%); box-sizing: border-box; tab-size: 2; }

  .slash-menu-container { position: absolute; z-index: 50; }
  .slash-menu { display: flex; flex-direction: column; background: var(--c-surface); border: 1px solid var(--c-border, #e2e8f0); border-radius: var(--radius, 6px); box-shadow: 0 4px 16px rgba(0,0,0,0.12); max-height: 240px; overflow-y: auto; min-width: 220px; padding: 4px; }
  .slash-menu-item { display: flex; flex-direction: column; gap: 1px; padding: 0.4rem 0.6rem; border: none; background: transparent; cursor: pointer; text-align: left; border-radius: 4px; font-family: inherit; transition: background 0.1s; }
  .slash-menu-item:hover, .slash-menu-item.selected { background: var(--c-bg-alt, #f1f5f9); }
  .slash-menu-label { font-size: 0.82rem; font-weight: 600; color: var(--c-text, #1e293b); }
  .slash-menu-desc { font-size: 0.7rem; color: var(--c-text-light, #94a3b8); }
  .slash-menu-empty { padding: 0.5rem 0.6rem; font-size: 0.8rem; color: var(--c-text-light, #94a3b8); text-align: center; }

  .image-confirm { padding: 1.25rem; }
  .image-confirm-preview-wrap { text-align: center; margin-bottom: 1rem; background: var(--c-bg, #f7f8fa); border-radius: var(--radius, 6px); padding: 0.75rem; }
  .image-confirm-preview { max-width: 100%; max-height: 200px; object-fit: contain; border-radius: 4px; }
  .image-confirm-form { margin-bottom: 0.5rem; }
  .image-confirm-hint { font-size: 0.75rem; color: var(--c-text-light, #94a3b8); margin-top: 0.35rem; }

  .link-tabs { display: flex; border-bottom: 1px solid var(--c-border, #e2e8f0); }
  .link-tab { flex: 1; padding: 0.6rem 1rem; border: none; background: transparent; font-size: 0.85rem; font-weight: 500; font-family: inherit; color: var(--c-text-light, #64748b); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
  .link-tab:hover { color: var(--c-text, #1e293b); }
  .link-tab.active { color: var(--c-accent, #3182ce); border-bottom-color: var(--c-accent, #3182ce); }
  .link-form { padding: 1rem 1.25rem; }
  .link-label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.3rem; color: var(--c-text, #1e293b); }
  .link-label-spaced { margin-top: 0.75rem; }
  .link-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--c-border, #e2e8f0); border-radius: var(--radius, 6px); font-size: 0.85rem; font-family: inherit; color: var(--c-text, #1e293b); background: var(--c-surface, #fff); box-sizing: border-box; }
  .link-input:focus { outline: none; border-color: var(--c-accent, #3182ce); box-shadow: 0 0 0 2px var(--c-focus-ring); }
  .link-checkbox-label { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; font-size: 0.82rem; color: var(--c-text, #1e293b); cursor: pointer; user-select: none; }
  .link-checkbox-label input[type="checkbox"] { accent-color: var(--c-accent, #3182ce); width: 15px; height: 15px; cursor: pointer; }
  .link-footer { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; border-top: 1px solid var(--c-border, #e2e8f0); }

  /* ProseMirror content styles */
  .rte-editor :global(.ProseMirror) { outline: none; min-height: 200px; }
  .rte-editor :global(.ProseMirror)::after { content: ''; display: table; clear: both; }
  .rte-editor :global(.ProseMirror p.is-editor-empty:first-child::before) { content: attr(data-placeholder); float: left; color: var(--c-text-light, #94a3b8); pointer-events: none; height: 0; font-style: italic; }
  .rte-editor :global(.ProseMirror p) { margin: 0 0 0.5em; }
  .rte-editor :global(.ProseMirror h2) { font-size: 1.4rem; font-weight: 700; margin: 1em 0 0.4em; }
  .rte-editor :global(.ProseMirror h3) { font-size: 1.15rem; font-weight: 600; margin: 0.8em 0 0.3em; }
  .rte-editor :global(.ProseMirror h4) { font-size: 1rem; font-weight: 600; margin: 0.6em 0 0.25em; }
  .rte-editor :global(.ProseMirror h5) { font-size: 0.9rem; font-weight: 600; margin: 0.5em 0 0.2em; }
  .rte-editor :global(.ProseMirror ul), .rte-editor :global(.ProseMirror ol) { padding-left: 1.5em; margin: 0.5em 0; }
  .rte-editor :global(.ProseMirror li) { margin: 0.15em 0; }
  .rte-editor :global(.ProseMirror blockquote) { border-left: 3px solid var(--c-border, #e2e8f0); padding-left: 1em; margin: 0.5em 0; color: var(--c-text-light, #718096); }
  .rte-editor :global(.ProseMirror hr) { border: none; border-top: 1px solid var(--c-border, #e2e8f0); margin: 1em 0; }
  .rte-editor :global(.ProseMirror sub) { font-size: 0.75em; }
  .rte-editor :global(.ProseMirror sup) { font-size: 0.75em; }
  .rte-editor :global(.ProseMirror code) { background: var(--c-bg, #f7f8fa); padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.85em; font-family: 'SF Mono', 'Fira Code', monospace; }
  .rte-editor :global(.ProseMirror pre) { background: var(--c-bg, #f7f8fa); border: 1px solid var(--c-border, #e2e8f0); border-radius: var(--radius, 6px); padding: 0.75em 1em; margin: 0.5em 0; overflow-x: auto; }
  .rte-editor :global(.ProseMirror pre code) { background: none; padding: 0; }
  .rte-editor :global(.ProseMirror a) { color: var(--c-accent, #3182ce); text-decoration: underline; }
  .rte-editor :global(.ProseMirror img) { max-width: 100%; height: auto; border-radius: var(--radius, 6px); }
  .rte-editor :global(.ProseMirror img.ProseMirror-selectednode) { outline: 2px solid var(--c-accent, #3182ce); outline-offset: 2px; }
  .rte-editor :global(.ProseMirror table) { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
  .rte-editor :global(.ProseMirror th), .rte-editor :global(.ProseMirror td) { border: 1px solid var(--c-border, #e2e8f0); padding: 0.4em 0.6em; text-align: left; vertical-align: top; }
  .rte-editor :global(.ProseMirror th) { background: var(--c-bg, #f7f8fa); font-weight: 600; }
  .rte-editor :global(.ProseMirror-dropcursor) { border-color: var(--c-accent); }
</style>
