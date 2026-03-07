<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, Extension } from '@tiptap/core';
  import { Plugin, PluginKey } from '@tiptap/pm/state';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Underline from '@tiptap/extension-underline';
  import Image from '@tiptap/extension-image';
  import { focusTrap } from '$lib/focusTrap.js';
  import Table from '@tiptap/extension-table';
  import TableRow from '@tiptap/extension-table-row';
  import TableCell from '@tiptap/extension-table-cell';
  import TableHeader from '@tiptap/extension-table-header';
  import Placeholder from '@tiptap/extension-placeholder';
  import Dropcursor from '@tiptap/extension-dropcursor';
  import MediaPicker from './MediaPicker.svelte';

  let { content, onUpdate }: { content: any; onUpdate: (json: any) => void } = $props();

  let editorEl: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();
  let showImagePicker = $state(false);
  let showSlashMenu = $state(false);
  let slashMenuPos = $state({ top: 0, left: 0 });
  let slashFilter = $state('');
  let slashSelectedIndex = $state(0);
  let isInTable = $state(false);

  const slashCommands = [
    { label: 'Heading 2', description: 'Large section heading', command: 'h2' },
    { label: 'Heading 3', description: 'Medium section heading', command: 'h3' },
    { label: 'Heading 4', description: 'Small section heading', command: 'h4' },
    { label: 'Bullet List', description: 'Unordered list', command: 'bullet' },
    { label: 'Numbered List', description: 'Ordered list', command: 'ordered' },
    { label: 'Blockquote', description: 'Quoted text block', command: 'quote' },
    { label: 'Code Block', description: 'Preformatted code', command: 'code' },
    { label: 'Horizontal Rule', description: 'Visual separator', command: 'hr' },
    { label: 'Image', description: 'Insert from media library', command: 'image' },
    { label: 'Table', description: '3x3 table', command: 'table' },
    { label: 'Link', description: 'Insert hyperlink', command: 'link' },
  ];

  let filteredSlashCommands = $derived(
    slashFilter
      ? slashCommands.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase()))
      : slashCommands
  );

  // Paste cleanup: strip Word/Google Docs cruft
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
        Link.configure({ openOnClick: false }),
        Image,
        Table.configure({ resizable: false }),
        TableRow,
        TableCell,
        TableHeader,
        Placeholder.configure({ placeholder: 'Type / for commands...' }),
        Dropcursor.configure({ color: '#2563eb', width: 2 }),
        PasteCleanup,
      ],
      content: content || '',
      onTransaction: () => {
        editor = editor;
        // Track if cursor is in a table
        isInTable = !!editor?.isActive('table');
      },
      onBlur: () => {
        if (editor) {
          onUpdate(editor.getJSON());
        }
        // Delay hiding slash menu so clicks on it register
        setTimeout(() => { showSlashMenu = false; }, 200);
      },
    });

    // Listen for / key to trigger slash menu
    editorEl!.addEventListener('keydown', handleSlashKey);
  });

  onDestroy(() => {
    editorEl?.removeEventListener('keydown', handleSlashKey);
    editor?.destroy();
  });

  function handleSlashKey(e: KeyboardEvent) {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        slashSelectedIndex = Math.min(slashSelectedIndex + 1, filteredSlashCommands.length - 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        slashSelectedIndex = Math.max(slashSelectedIndex - 1, 0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSlashCommand(slashSelectedIndex);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        showSlashMenu = false;
        return;
      }
      // Update filter for any other key
      // The filter is updated by the input handler below
      return;
    }

    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Check if we're at the start of an empty block
      if (!editor) return;
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 1), from, '\n'
      );
      // Only trigger at the start of a line or on empty content
      if (textBefore === '' || textBefore === '\n') {
        e.preventDefault();
        openSlashMenu();
      }
    }
  }

  function openSlashMenu() {
    if (!editor || !editorEl) return;
    // Get cursor position for menu placement
    const { view } = editor;
    const coords = view.coordsAtPos(view.state.selection.from);
    const editorRect = editorEl.getBoundingClientRect();
    slashMenuPos = {
      top: coords.bottom - editorRect.top + 4,
      left: coords.left - editorRect.left,
    };
    slashFilter = '';
    slashSelectedIndex = 0;
    showSlashMenu = true;
  }

  function executeSlashCommand(index: number) {
    const cmd = filteredSlashCommands[index];
    if (!cmd || !editor) return;
    showSlashMenu = false;

    // Delete the "/" character if it was typed
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (textBefore === '/') {
      editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    }

    switch (cmd.command) {
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'h4': editor.chain().focus().toggleHeading({ level: 4 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
      case 'hr': editor.chain().focus().setHorizontalRule().run(); break;
      case 'image': showImagePicker = true; break;
      case 'table': editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); break;
      case 'link': toggleLink(); break;
    }
  }

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function insertImage() {
    showImagePicker = true;
  }

  function onImageSelect(mediaId: number | null) {
    showImagePicker = false;
    if (!editor || !mediaId) return;
    const src = `/api/content/media/${mediaId}/large`;
    editor.chain().focus().setImage({ src }).run();
  }

  function insertTable() {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  type BtnDef = {
    label: string;
    action: () => void;
    isActive?: () => boolean;
    divider?: false;
  };

  type DividerDef = { divider: true };

  type ToolbarItem = BtnDef | DividerDef;

  const toolbarItems: ToolbarItem[] = [
    { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), isActive: () => !!editor?.isActive('bold') },
    { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), isActive: () => !!editor?.isActive('italic') },
    { label: 'U', action: () => editor?.chain().focus().toggleUnderline().run(), isActive: () => !!editor?.isActive('underline') },
    { label: 'S', action: () => editor?.chain().focus().toggleStrike().run(), isActive: () => !!editor?.isActive('strike') },
    { label: 'Code', action: () => editor?.chain().focus().toggleCode().run(), isActive: () => !!editor?.isActive('code') },
    { divider: true },
    { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => !!editor?.isActive('heading', { level: 2 }) },
    { label: 'H3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => !!editor?.isActive('heading', { level: 3 }) },
    { label: 'H4', action: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(), isActive: () => !!editor?.isActive('heading', { level: 4 }) },
    { divider: true },
    { label: 'UL', action: () => editor?.chain().focus().toggleBulletList().run(), isActive: () => !!editor?.isActive('bulletList') },
    { label: 'OL', action: () => editor?.chain().focus().toggleOrderedList().run(), isActive: () => !!editor?.isActive('orderedList') },
    { label: 'BQ', action: () => editor?.chain().focus().toggleBlockquote().run(), isActive: () => !!editor?.isActive('blockquote') },
    { label: 'HR', action: () => editor?.chain().focus().setHorizontalRule().run() },
    { divider: true },
    { label: 'Link', action: toggleLink, isActive: () => !!editor?.isActive('link') },
    { label: 'Img', action: insertImage },
    { label: 'Table', action: insertTable },
    { divider: true },
    { label: 'Undo', action: () => editor?.chain().focus().undo().run() },
    { label: 'Redo', action: () => editor?.chain().focus().redo().run() },
  ];
</script>

<div class="rte-wrap">
  <div class="rte-toolbar">
    {#each toolbarItems as item}
      {#if item.divider}
        <span class="rte-divider"></span>
      {:else}
        <button
          type="button"
          class="rte-btn"
          class:active={item.isActive?.() ?? false}
          onclick={item.action}
          title={item.label}
        >
          {item.label}
        </button>
      {/if}
    {/each}
  </div>

  {#if isInTable}
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

  <div class="rte-editor-wrap">
    <div class="rte-editor" bind:this={editorEl}></div>

    {#if showSlashMenu}
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

{#if showImagePicker}
  <div class="modal-overlay" onclick={() => showImagePicker = false} role="dialog" aria-modal="true" aria-labelledby="insert-image-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 700px;" use:focusTrap onescape={() => showImagePicker = false}>
      <div class="modal-header">
        <h2 id="insert-image-title">Insert Image</h2>
        <button class="btn-icon" onclick={() => showImagePicker = false} aria-label="Close">&#10005;</button>
      </div>
      <div class="modal-body">
        <MediaPicker value={null} onSelect={onImageSelect} />
      </div>
    </div>
  </div>
{/if}

<style>
  .rte-wrap {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    overflow: hidden;
    background: var(--c-surface, #ffffff);
  }

  .rte-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    background: var(--c-bg, #f7f8fa);
    border-bottom: 1px solid var(--c-border, #e2e8f0);
  }

  .rte-table-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    background: #eff6ff;
    border-bottom: 1px solid #bfdbfe;
  }

  .rte-table-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: #2563eb;
    margin-right: 4px;
  }

  .rte-btn-sm {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 6px;
    font-size: 0.68rem;
    font-weight: 500;
    font-family: var(--font, system-ui);
    color: var(--c-text, #2d3748);
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.12s;
  }

  .rte-btn-sm:hover { background: #f1f5f9; }

  .rte-btn-danger { color: #dc2626; }
  .rte-btn-danger:hover { background: #fef2f2; border-color: #fca5a5; }

  .rte-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: var(--font, system-ui);
    color: var(--c-text, #2d3748);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .rte-btn:hover {
    background: var(--c-border, #e2e8f0);
  }

  .rte-btn.active {
    background: var(--c-accent, #3182ce);
    color: #ffffff;
    border-color: var(--c-accent, #3182ce);
  }

  .rte-divider {
    display: inline-block;
    width: 1px;
    height: 20px;
    background: var(--c-border, #e2e8f0);
    margin: 0 4px;
  }

  .rte-editor-wrap {
    position: relative;
  }

  .rte-editor {
    min-height: 200px;
    padding: 12px 16px;
    font-family: var(--font, system-ui);
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--c-text, #2d3748);
  }

  /* Slash command menu */
  .slash-menu-container {
    position: absolute;
    z-index: 50;
  }

  .slash-menu {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    max-height: 240px;
    overflow-y: auto;
    min-width: 220px;
    padding: 4px;
  }

  .slash-menu-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0.4rem 0.6rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    font-family: inherit;
    transition: background 0.1s;
  }

  .slash-menu-item:hover,
  .slash-menu-item.selected {
    background: var(--c-bg-alt, #f1f5f9);
  }

  .slash-menu-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--c-text, #1e293b);
  }

  .slash-menu-desc {
    font-size: 0.7rem;
    color: var(--c-text-light, #94a3b8);
  }

  .slash-menu-empty {
    padding: 0.5rem 0.6rem;
    font-size: 0.8rem;
    color: var(--c-text-light, #94a3b8);
    text-align: center;
  }

  /* TipTap ProseMirror element styles */
  .rte-editor :global(.ProseMirror) {
    outline: none;
    min-height: 200px;
  }

  .rte-editor :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--c-text-light, #94a3b8);
    pointer-events: none;
    height: 0;
    font-style: italic;
  }

  .rte-editor :global(.ProseMirror p) {
    margin: 0 0 0.5em;
  }

  .rte-editor :global(.ProseMirror h2) { font-size: 1.4rem; font-weight: 700; margin: 1em 0 0.4em; }
  .rte-editor :global(.ProseMirror h3) { font-size: 1.15rem; font-weight: 600; margin: 0.8em 0 0.3em; }
  .rte-editor :global(.ProseMirror h4) { font-size: 1rem; font-weight: 600; margin: 0.6em 0 0.25em; }

  .rte-editor :global(.ProseMirror ul),
  .rte-editor :global(.ProseMirror ol) { padding-left: 1.5em; margin: 0.5em 0; }
  .rte-editor :global(.ProseMirror li) { margin: 0.15em 0; }
  .rte-editor :global(.ProseMirror blockquote) { border-left: 3px solid var(--c-border, #e2e8f0); padding-left: 1em; margin: 0.5em 0; color: var(--c-text-light, #718096); }
  .rte-editor :global(.ProseMirror hr) { border: none; border-top: 1px solid var(--c-border, #e2e8f0); margin: 1em 0; }

  .rte-editor :global(.ProseMirror code) {
    background: var(--c-bg, #f7f8fa);
    padding: 0.15em 0.35em;
    border-radius: 3px;
    font-size: 0.85em;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .rte-editor :global(.ProseMirror pre) {
    background: var(--c-bg, #f7f8fa);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    padding: 0.75em 1em;
    margin: 0.5em 0;
    overflow-x: auto;
  }

  .rte-editor :global(.ProseMirror pre code) {
    background: none;
    padding: 0;
  }

  .rte-editor :global(.ProseMirror a) {
    color: var(--c-accent, #3182ce);
    text-decoration: underline;
  }

  .rte-editor :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius, 6px);
  }

  .rte-editor :global(.ProseMirror table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
  }

  .rte-editor :global(.ProseMirror th),
  .rte-editor :global(.ProseMirror td) {
    border: 1px solid var(--c-border, #e2e8f0);
    padding: 0.4em 0.6em;
    text-align: left;
    vertical-align: top;
  }

  .rte-editor :global(.ProseMirror th) {
    background: var(--c-bg, #f7f8fa);
    font-weight: 600;
  }

  /* Dropcursor */
  .rte-editor :global(.ProseMirror-dropcursor) {
    border-color: #2563eb;
  }
</style>
