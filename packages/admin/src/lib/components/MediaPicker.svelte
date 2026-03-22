<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { AlertTriangle, Search, Upload } from 'lucide-svelte';
  import { focusTrap } from '$lib/focusTrap.js';

  let {
    value,
    onSelect,
    inline = false,
    allowUpload = false,
    initialTypeFilter = 'all',
    onSelectItem = undefined,
  }: {
    value: number | null;
    onSelect: (mediaId: number | null) => void;
    inline?: boolean;
    allowUpload?: boolean;
    initialTypeFilter?: 'all' | 'image' | 'video' | 'document';
    onSelectItem?: ((item: any) => void) | undefined;
  } = $props();

  let open = $state(false);
  let mediaList = $state<any[]>([]);
  let loading = $state(false);
  let selected = $state<any>(null);
  let searchQuery = $state('');
  let typeFilter = $state<'all' | 'image' | 'video' | 'document'>('all');
  let total = $state(0);
  let offset = $state(0);
  const PAGE_SIZE = 30;
  let searchDebounce: ReturnType<typeof setTimeout>;

  // Upload state
  let uploading = $state(false);
  let uploadError = $state('');
  let fileInputEl: HTMLInputElement | undefined = $state();
  let dragOver = $state(false);

  const missingAlt = $derived(selected && selected.mimeType?.startsWith('image/') && !selected.altText);

  async function loadMedia() {
    loading = true;
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await api.get<{ data: any[]; meta: { total: number } }>(`/media?${params}`);
      mediaList = res.data;
      total = res.meta?.total ?? res.data.length;
    } catch { /* ignore */ }
    loading = false;
  }

  async function loadSelected() {
    if (!value) { selected = null; return; }
    try {
      const res = await api.get<{ data: any }>(`/media/${value}`);
      selected = res.data;
    } catch { selected = null; }
  }

  $effect(() => { if (!inline) loadSelected(); });

  // Auto-load in inline mode
  onMount(() => {
    if (inline) {
      typeFilter = initialTypeFilter;
      loadMedia();
    }
  });

  function openPicker() {
    open = true;
    searchQuery = '';
    typeFilter = initialTypeFilter;
    offset = 0;
    loadMedia();
  }

  function pick(item: any) {
    onSelect(item.id);
    onSelectItem?.(item);
    if (!inline) open = false;
  }

  function clear() {
    onSelect(null);
  }

  function onSearch(value: string) {
    searchQuery = value;
    offset = 0;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(loadMedia, 300);
  }

  function onTypeChange(type: typeof typeFilter) {
    typeFilter = type;
    offset = 0;
    loadMedia();
  }

  function prevPage() {
    offset = Math.max(0, offset - PAGE_SIZE);
    loadMedia();
  }

  function nextPage() {
    offset = offset + PAGE_SIZE;
    loadMedia();
  }

  function thumbnailUrl(item: any): string {
    return `/api/content/media/${item.id}/thumbnail`;
  }

  // Upload handlers
  async function handleUpload(file: File) {
    uploading = true;
    uploadError = '';
    try {
      const title = file.name.replace(/\.[^.]+$/, '');
      const res = await api.upload(file, title);
      await loadMedia();
      pick(res.data);
    } catch (err: any) {
      uploadError = err.message || 'Upload failed';
    }
    uploading = false;
  }

  function onFileDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  }

  function onFileSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleUpload(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  const hasNextPage = $derived(offset + PAGE_SIZE < total);
  const hasPrevPage = $derived(offset > 0);
  const currentPage = $derived(Math.floor(offset / PAGE_SIZE) + 1);
  const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
</script>

{#snippet browserContent()}
  <div class="picker-toolbar">
    <div class="picker-search">
      <Search size={14} />
      <input
        type="search"
        placeholder="Search media..."
        value={searchQuery}
        oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
      />
    </div>
    <div class="picker-filters">
      <button class="filter-btn" class:active={typeFilter === 'all'} onclick={() => onTypeChange('all')}>All</button>
      <button class="filter-btn" class:active={typeFilter === 'image'} onclick={() => onTypeChange('image')}>Images</button>
      <button class="filter-btn" class:active={typeFilter === 'video'} onclick={() => onTypeChange('video')}>Videos</button>
      <button class="filter-btn" class:active={typeFilter === 'document'} onclick={() => onTypeChange('document')}>Docs</button>
    </div>
  </div>

  {#if allowUpload}
    <div
      class="upload-zone"
      class:drag-over={dragOver}
      class:uploading
      ondrop={onFileDrop}
      ondragover={onDragOver}
      ondragleave={onDragLeave}
      onclick={() => fileInputEl?.click()}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputEl?.click(); }}
      role="button"
      tabindex="0"
    >
      <input
        bind:this={fileInputEl}
        type="file"
        onchange={onFileSelect}
        style="display: none;"
      />
      {#if uploading}
        <span class="upload-text">Uploading...</span>
      {:else}
        <Upload size={16} />
        <span class="upload-text">Drop file here or click to upload</span>
      {/if}
      {#if uploadError}
        <span class="upload-error">{uploadError}</span>
      {/if}
    </div>
  {/if}

  <div class="picker-grid-wrap">
    {#if loading}
      <p style="text-align: center; color: var(--c-text-light); padding: 2rem 0;">Loading...</p>
    {:else if mediaList.length === 0}
      <p style="text-align: center; color: var(--c-text-light); padding: 2rem 0;">
        {searchQuery ? `No media matching "${searchQuery}"` : 'No media uploaded yet.'}
      </p>
    {:else}
      <div class="media-grid">
        {#each mediaList as item}
          <button class="media-grid-item" class:selected={value === item.id} onclick={() => pick(item)}>
            {#if item.mimeType?.startsWith('image/')}
              <img src={thumbnailUrl(item)} alt={item.altText || item.title} />
              {#if !item.altText}
                <span class="media-grid-alt-dot" title="Missing alt text"></span>
              {/if}
            {:else if item.mimeType?.startsWith('video/')}
              <div class="media-file-icon">🎬 {item.originalName?.split('.').pop()?.toUpperCase()}</div>
            {:else}
              <div class="media-file-icon">📄 {item.originalName?.split('.').pop()?.toUpperCase() || 'FILE'}</div>
            {/if}
            <span class="media-grid-label">{item.title || item.originalName}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if total > PAGE_SIZE}
    <div class="picker-pagination">
      <button class="btn btn-sm btn-outline" disabled={!hasPrevPage} onclick={prevPage}>&larr; Prev</button>
      <span class="picker-page-info">{currentPage} / {totalPages} ({total} items)</span>
      <button class="btn btn-sm btn-outline" disabled={!hasNextPage} onclick={nextPage}>Next &rarr;</button>
    </div>
  {/if}
{/snippet}

{#if inline}
  <div class="media-picker-inline">
    {@render browserContent()}
  </div>
{:else}
  <div class="media-picker">
    {#if selected}
      <div class="media-preview">
        {#if selected.mimeType?.startsWith('image/')}
          <img src={thumbnailUrl(selected)} alt={selected.altText || selected.title} />
        {:else if selected.mimeType?.startsWith('video/')}
          <div class="media-file-thumb">🎬 {selected.originalName?.split('.').pop()?.toUpperCase()}</div>
        {:else}
          <div class="media-file-thumb">{selected.originalName?.split('.').pop()?.toUpperCase() || 'FILE'}</div>
        {/if}
        <div class="media-info">
          <span class="media-name">{selected.title || selected.originalName}</span>
          {#if missingAlt}
            <span class="alt-warning" title="Missing alt text — add in Media library for accessibility">
              <AlertTriangle size={12} /> No alt text
            </span>
          {/if}
          <div class="media-actions">
            <button type="button" class="btn btn-sm btn-outline" onclick={openPicker}>Change</button>
            <button type="button" class="btn btn-sm btn-danger" onclick={clear}>Remove</button>
          </div>
        </div>
      </div>
    {:else}
      <button type="button" class="media-select-btn" onclick={openPicker}>
        Select Media
      </button>
    {/if}
  </div>

  {#if open}
    <div class="modal-overlay" onclick={() => open = false} role="dialog" aria-modal="true" aria-labelledby="select-media-title">
      <div class="modal" style="max-width: 760px;" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => open = false}>
        <div class="modal-header">
          <h2 id="select-media-title">Select Media</h2>
          <button class="btn-icon" onclick={() => open = false} aria-label="Close">&#10005;</button>
        </div>
        {@render browserContent()}
      </div>
    </div>
  {/if}
{/if}

<style>
  .media-picker {
    width: 100%;
  }

  .media-picker-inline {
    width: 100%;
  }

  .media-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg-alt, #f8fafc);
  }

  .media-preview img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .media-info {
    flex: 1;
    min-width: 0;
  }

  .media-name {
    display: block;
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .media-actions {
    display: flex;
    gap: 0.35rem;
  }

  .media-select-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 1rem;
    border: 2px dashed var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg-alt, #f8fafc);
    color: var(--c-text-light, #64748b);
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .media-select-btn:hover {
    border-color: var(--c-primary, #2563eb);
    color: var(--c-primary, #2563eb);
  }

  .picker-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--c-border, #e2e8f0);
  }

  .picker-search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg, #fff);
    color: var(--c-text-light, #64748b);
  }

  .picker-search input {
    border: none;
    outline: none;
    background: transparent;
    flex: 1;
    font-size: 0.85rem;
    color: var(--c-text, #1e293b);
  }

  .picker-filters {
    display: flex;
    gap: 0.25rem;
  }

  .filter-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg, #fff);
    color: var(--c-text-light, #64748b);
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-btn:hover {
    border-color: var(--c-primary, #2563eb);
    color: var(--c-primary, #2563eb);
  }

  .filter-btn.active {
    background: var(--c-primary, #2563eb);
    color: #fff;
    border-color: var(--c-primary, #2563eb);
  }

  /* Upload zone */
  .upload-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    margin: 0.75rem 1.25rem 0;
    border: 2px dashed var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg-alt, #f8fafc);
    color: var(--c-text-light, #64748b);
    font-size: 0.8rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .upload-zone:hover {
    border-color: var(--c-primary, #2563eb);
    color: var(--c-primary, #2563eb);
  }

  .upload-zone.drag-over {
    border-color: var(--c-primary, #2563eb);
    background: color-mix(in srgb, var(--c-accent), transparent 90%);
    color: var(--c-primary, #2563eb);
  }

  .upload-zone.uploading {
    opacity: 0.6;
    cursor: wait;
  }

  .upload-text {
    font-size: 0.8rem;
  }

  .upload-error {
    color: var(--c-danger, #dc2626);
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  /* Grid container */
  .picker-grid-wrap {
    max-height: 45vh;
    overflow-y: auto;
    padding: 0 1.25rem;
  }

  .picker-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  .picker-page-info {
    font-size: 0.8rem;
    color: var(--c-text-light, #64748b);
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.6rem;
    padding: 0.75rem 0;
  }

  .media-grid-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem;
    border: 2px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-surface);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .media-grid-item:hover {
    border-color: var(--c-primary, #2563eb);
  }

  .media-grid-item.selected {
    border-color: var(--c-primary, #2563eb);
    box-shadow: 0 0 0 1px var(--c-primary, #2563eb);
  }

  .media-grid-item img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 4px;
    margin-bottom: 0.25rem;
  }

  .media-file-thumb {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-bg-alt, #f8fafc);
    border-radius: 4px;
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--c-text-light, #64748b);
  }

  .media-file-icon {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-bg-alt, #f8fafc);
    border-radius: 4px;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-text-light, #64748b);
  }

  .media-grid-label {
    font-size: 0.7rem;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    color: var(--c-text, #1e293b);
  }

  .alt-warning {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--c-warning);
    margin-bottom: 0.2rem;
  }

  .media-grid-alt-dot {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-warning);
    border: 1.5px solid var(--c-surface);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--c-warning), transparent 70%);
  }
</style>
