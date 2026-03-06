<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Underline from '@tiptap/extension-underline';
  import Image from '@tiptap/extension-image';
  import Table from '@tiptap/extension-table';
  import TableRow from '@tiptap/extension-table-row';
  import TableCell from '@tiptap/extension-table-cell';
  import TableHeader from '@tiptap/extension-table-header';

  let { content, onUpdate }: { content: any; onUpdate: (json: any) => void } = $props();

  let editorEl: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();

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
      ],
      content: content || '',
      onTransaction: () => {
        // Force Svelte reactivity so toolbar active states update
        editor = editor;
      },
      onBlur: () => {
        if (editor) {
          onUpdate(editor.getJSON());
        }
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
  });

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
    if (!editor) return;
    const url = prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
  <div class="rte-editor" bind:this={editorEl}></div>
</div>

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

  .rte-editor {
    min-height: 200px;
    padding: 12px 16px;
    font-family: var(--font, system-ui);
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--c-text, #2d3748);
  }

  /* TipTap ProseMirror element styles */
  .rte-editor :global(.ProseMirror) {
    outline: none;
    min-height: 200px;
  }

  .rte-editor :global(.ProseMirror p) {
    margin: 0 0 0.5em;
  }

  .rte-editor :global(.ProseMirror h2) {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 1em 0 0.4em;
  }

  .rte-editor :global(.ProseMirror h3) {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0.8em 0 0.3em;
  }

  .rte-editor :global(.ProseMirror h4) {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.6em 0 0.25em;
  }

  .rte-editor :global(.ProseMirror ul),
  .rte-editor :global(.ProseMirror ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  .rte-editor :global(.ProseMirror li) {
    margin: 0.15em 0;
  }

  .rte-editor :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--c-border, #e2e8f0);
    padding-left: 1em;
    margin: 0.5em 0;
    color: var(--c-text-light, #718096);
  }

  .rte-editor :global(.ProseMirror hr) {
    border: none;
    border-top: 1px solid var(--c-border, #e2e8f0);
    margin: 1em 0;
  }

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
</style>
