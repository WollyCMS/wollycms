<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let items = $state<any[]>([]);
  let folders = $state<string[]>([]);
  let activeFolder = $state<string | null>(null);
  let activeType = $state<string | null>(null);
  let searchQuery = $state('');
  let searchDebounce: ReturnType<typeof setTimeout>;
  let error = $state('');
  let loading = $state(true);
  let uploading = $state(false);
  let editItem = $state<any>(null);
  let newFolderName = $state('');
  let showNewFolder = $state(false);
  let editingFolder = $state<string | null>(null);
  let editingFolderName = $state('');
  let total = $state(0);
  let pageSize = $state(50);
  let currentPage = $state(1);
  let sortBy = $state('createdAt');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (activeFolder !== null) params.set('folder', activeFolder);
      if (activeType) params.set('type', activeType);
      params.set('limit', String(pageSize));
      params.set('offset', String((currentPage - 1) * pageSize));
      params.set('sort', sortBy);
      params.set('order', sortOrder);
      const qs = params.toString();
      const res = await api.get<{ data: any[]; meta: { total: number } }>(`/media${qs ? '?' + qs : ''}`);
      items = res.data;
      total = res.meta.total;
    } catch (err: any) { error = err.message; } finally { loading = false; }
  }

  function goToPage(page: number) {
    currentPage = Math.max(1, Math.min(page, totalPages));
    load();
  }

  function changeSort(field: string) {
    if (sortBy === field) {
      sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      sortBy = field;
      sortOrder = field === 'title' || field === 'originalName' ? 'asc' : 'desc';
    }
    currentPage = 1;
    load();
  }

  async function loadFolders() {
    try {
      const res = await api.get<{ data: string[] }>('/media/folders');
      folders = res.data;
    } catch { /* ignore */ }
  }

  onMount(() => { load(); loadFolders(); });

  function onSearch(value: string) {
    searchQuery = value;
    currentPage = 1;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(load, 300);
  }

  function selectFolder(folder: string | null) {
    activeFolder = folder;
    currentPage = 1;
    load();
  }

  function selectType(type: string | null) {
    activeType = type;
    currentPage = 1;
    load();
  }

  const mediaTypes = [
    { label: 'Images', value: 'image/' },
    { label: 'Videos', value: 'video/' },
    { label: 'Documents', value: 'application/' },
  ];

  async function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    uploading = true;
    try {
      for (const file of files) {
        await api.upload(file, file.name, undefined, activeFolder || undefined);
      }
      load();
      loadFolders();
    } catch (err: any) { error = err.message; }
    finally { uploading = false; input.value = ''; }
  }

  async function saveEdit() {
    if (!editItem) return;
    try {
      await api.put(`/media/${editItem.id}`, {
        altText: editItem.altText,
        title: editItem.title,
        folder: editItem.folder || null,
      });
      editItem = null;
      load();
      loadFolders();
    } catch (err: any) { error = err.message; }
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this media?')) return;
    try { await api.del(`/media/${id}`); load(); loadFolders(); }
    catch (err: any) { error = err.message; }
  }

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (!folders.includes(name)) {
      folders = [...folders, name].sort();
    }
    activeFolder = name;
    newFolderName = '';
    showNewFolder = false;
    load();
  }

  function startEditFolder(folder: string) {
    editingFolder = folder;
    editingFolderName = folder;
  }

  async function saveEditFolder() {
    if (!editingFolder || !editingFolderName.trim()) return;
    const newName = editingFolderName.trim();
    if (newName === editingFolder) { editingFolder = null; return; }
    try {
      await api.put(`/media/folders/${encodeURIComponent(editingFolder)}`, { name: newName });
      if (activeFolder === editingFolder) activeFolder = newName;
      editingFolder = null;
      loadFolders();
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteFolder(folder: string) {
    if (!confirm(`Move all media in "${folder}" to uncategorized?`)) return;
    try {
      await api.del(`/media/folders/${encodeURIComponent(folder)}`);
      if (activeFolder === folder) activeFolder = null;
      loadFolders();
      load();
    } catch (err: any) { error = err.message; }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
</script>

<div class="page-header">
  <h1>Media Library</h1>
  <label class="btn btn-primary" style="cursor: pointer;">
    {uploading ? 'Uploading...' : '+ Upload'}
    <input type="file" multiple accept="image/*,video/*,application/pdf" onchange={handleUpload} style="display: none;" />
  </label>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="media-layout">
  <aside class="media-sidebar">
    <div class="sidebar-section">
      <h3 class="sidebar-heading">Folders</h3>
      <ul class="folder-list">
        <li>
          <button
            class="folder-item"
            class:active={activeFolder === null}
            onclick={() => selectFolder(null)}
          >All Media</button>
        </li>
        <li>
          <button
            class="folder-item"
            class:active={activeFolder === ''}
            onclick={() => selectFolder('')}
          >Uncategorized</button>
        </li>
        {#each folders as folder}
          <li class="folder-row">
            {#if editingFolder === folder}
              <form class="folder-edit-form" onsubmit={(e) => { e.preventDefault(); saveEditFolder(); }}>
                <input class="form-control form-control-sm" bind:value={editingFolderName} autofocus />
                <button type="submit" class="btn btn-sm btn-primary" title="Save">&#10003;</button>
                <button type="button" class="btn btn-sm btn-outline" onclick={() => editingFolder = null} title="Cancel">&#10005;</button>
              </form>
            {:else}
              <button
                class="folder-item"
                class:active={activeFolder === folder}
                onclick={() => selectFolder(folder)}
              >{folder}</button>
              <div class="folder-actions">
                <button class="folder-action-btn" onclick={() => startEditFolder(folder)} title="Rename folder">&#9998;</button>
                <button class="folder-action-btn folder-action-delete" onclick={() => deleteFolder(folder)} title="Delete folder">&#128465;</button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
      {#if showNewFolder}
        <form class="new-folder-form" onsubmit={(e) => { e.preventDefault(); createFolder(); }}>
          <input
            class="form-control form-control-sm"
            placeholder="Folder name"
            bind:value={newFolderName}
            autofocus
          />
          <button type="submit" class="btn btn-sm btn-primary">Add</button>
          <button type="button" class="btn btn-sm btn-outline" onclick={() => { showNewFolder = false; newFolderName = ''; }}>Cancel</button>
        </form>
      {:else}
        <button class="btn btn-sm btn-outline" style="margin-top: 0.5rem; width: 100%;" onclick={() => showNewFolder = true}>+ New Folder</button>
      {/if}
    </div>
    <div class="sidebar-section" style="margin-top: 1.25rem;">
      <h3 class="sidebar-heading">Type</h3>
      <ul class="folder-list">
        <li>
          <button
            class="folder-item"
            class:active={activeType === null}
            onclick={() => selectType(null)}
          >All Types</button>
        </li>
        {#each mediaTypes as t}
          <li>
            <button
              class="folder-item"
              class:active={activeType === t.value}
              onclick={() => selectType(t.value)}
            >{t.label}</button>
          </li>
        {/each}
      </ul>
    </div>
  </aside>

  <div class="media-main">
    <div class="media-toolbar">
      <input
        type="search"
        class="form-control"
        placeholder="Search media by name..."
        value={searchQuery}
        oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
        style="max-width: 320px;"
        aria-label="Search media"
      />
      <div class="media-toolbar-right">
        <select class="form-control form-control-sm" value={`${sortBy}:${sortOrder}`}
          aria-label="Sort media"
          onchange={(e) => {
            const [field, ord] = (e.target as HTMLSelectElement).value.split(':');
            sortBy = field;
            sortOrder = ord as 'asc' | 'desc';
            currentPage = 1;
            load();
          }}>
          <option value="createdAt:desc">Newest first</option>
          <option value="createdAt:asc">Oldest first</option>
          <option value="title:asc">Title A-Z</option>
          <option value="title:desc">Title Z-A</option>
          <option value="size:desc">Largest first</option>
          <option value="size:asc">Smallest first</option>
        </select>
        <span class="media-count">{total} item{total !== 1 ? 's' : ''}</span>
      </div>
    </div>

    <div class="media-grid">
      {#if loading}
        {#each Array(8) as _}
          <div class="card media-card">
            <div class="media-thumb"><div class="skeleton" style="width: 100%; height: 100%;"></div></div>
            <div class="media-info">
              <div class="skeleton skeleton-text" style="width: 80%;"></div>
              <div class="skeleton skeleton-text" style="width: 50%;"></div>
            </div>
          </div>
        {/each}
      {:else if items.length === 0}
        <div class="media-empty">
          <p>No media found{searchQuery ? ` matching "${searchQuery}"` : ''}. Upload files to get started.</p>
        </div>
      {:else}
        {#each items as item}
          <div class="card media-card" onclick={() => editItem = { ...item }} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') editItem = { ...item }; }}>
            <div class="media-thumb">
              {#if item.mimeType?.startsWith('image/')}
                <img src="/api/content/media/{item.id}/thumbnail" alt={item.altText || ''} />
                {#if !item.altText}
                  <span class="alt-badge" title="Missing alt text">No alt text</span>
                {/if}
              {:else if item.mimeType?.startsWith('video/')}
                <div class="media-file-icon">
                  <span class="icon">&#127916;</span>
                  <span class="ext">{item.mimeType.split('/')[1].toUpperCase()}</span>
                </div>
              {:else}
                <div class="media-file-icon">
                  <span class="icon">&#128196;</span>
                  <span class="ext">{item.originalName?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                </div>
              {/if}
            </div>
            <div class="media-info">
              <p class="media-title">{item.title || item.originalName}</p>
              <p class="media-meta">{formatSize(item.size)}{item.folder ? ` \u00B7 ${item.folder}` : ''}</p>
              <div class="media-actions">
                <button class="btn btn-sm btn-outline" onclick={(e) => { e.stopPropagation(); editItem = { ...item }; }}>Edit</button>
                <button class="btn btn-sm btn-danger" onclick={(e) => { e.stopPropagation(); deleteItem(item.id); }}>Delete</button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    {#if totalPages > 1}
      <nav class="pagination" aria-label="Media pagination">
        <button class="pagination-btn" disabled={currentPage <= 1} onclick={() => goToPage(currentPage - 1)} aria-label="Previous page">&lsaquo;</button>
        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
          {#if totalPages <= 7 || p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)}
            <button class="pagination-btn" class:active={p === currentPage} onclick={() => goToPage(p)}>{p}</button>
          {:else if p === currentPage - 2 || p === currentPage + 2}
            <span class="pagination-ellipsis">&hellip;</span>
          {/if}
        {/each}
        <button class="pagination-btn" disabled={currentPage >= totalPages} onclick={() => goToPage(currentPage + 1)} aria-label="Next page">&rsaquo;</button>
      </nav>
    {/if}
  </div>
</div>

{#if editItem}
  <div class="modal-overlay" onclick={() => editItem = null} role="dialog" aria-labelledby="edit-media-title" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => editItem = null}>
      <div class="modal-header"><h2 id="edit-media-title">Edit Media</h2><button class="btn-icon" onclick={() => editItem = null} aria-label="Close">&#10005;</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
        {#if editItem.mimeType?.startsWith('image/')}
          <div class="edit-preview">
            <img src="/api/content/media/{editItem.id}/{editItem.variantUrls?.medium ? 'medium' : 'original'}" alt={editItem.altText || editItem.title || ''} />
          </div>
          <div class="edit-variants">
            <span class="edit-variants__label">Variants:</span>
            {#each ['thumbnail', 'medium', 'large'] as v}
              <span class="edit-variant-badge" class:exists={editItem.variants?.[v]} title={editItem.variants?.[v] ? v + ' generated' : v + ' missing'}>
                {#if editItem.variants?.[v]}<span class="variant-check">&#10003;</span>{:else}<span class="variant-dash">&#8211;</span>{/if}
                {v}
              </span>
            {/each}
          </div>
        {/if}
        <div class="form-group">
          <label for="edit-media-title-input">Title</label>
          <input id="edit-media-title-input" class="form-control" bind:value={editItem.title} />
        </div>
        <div class="form-group">
          <label for="edit-media-alt-input">Alt Text</label>
          <input id="edit-media-alt-input" class="form-control" bind:value={editItem.altText} />
        </div>
        <div class="form-group">
          <label for="edit-media-folder-input">Folder</label>
          <div style="display: flex; gap: 0.5rem;">
            <select id="edit-media-folder-input" class="form-control" bind:value={editItem.folder}>
              <option value="">None</option>
              {#each folders as f}
                <option value={f}>{f}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="edit-meta">
          <span>{editItem.originalName}</span>
          <span>{formatSize(editItem.size)}</span>
          {#if editItem.width && editItem.height}<span>{editItem.width} &times; {editItem.height}</span>{/if}
          <span>{editItem.mimeType}</span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => editItem = null}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .media-layout {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .media-sidebar {
    width: 200px;
    flex-shrink: 0;
  }

  .sidebar-heading {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--c-text-light);
    margin-bottom: 0.5rem;
  }

  .folder-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .folder-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.75rem;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--c-text);
    transition: background 0.15s;
  }
  .folder-item:hover { background: var(--c-bg); }
  .folder-item.active {
    background: var(--c-accent);
    color: white;
    font-weight: 500;
  }

  .folder-row {
    display: flex;
    align-items: center;
    position: relative;
  }
  .folder-row .folder-item {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .folder-actions {
    display: none;
    gap: 0.15rem;
    flex-shrink: 0;
  }
  .folder-row:hover .folder-actions {
    display: flex;
  }
  .folder-action-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.15rem 0.3rem;
    border-radius: 3px;
    color: var(--c-text-light);
    transition: all 0.15s;
    line-height: 1;
  }
  .folder-action-btn:hover {
    background: var(--c-bg);
    color: var(--c-text);
  }
  .folder-action-delete:hover {
    color: var(--c-danger, #dc2626);
  }
  .folder-edit-form {
    display: flex;
    gap: 0.25rem;
    width: 100%;
    padding: 0.2rem 0;
  }
  .folder-edit-form .form-control-sm {
    flex: 1;
    min-width: 0;
    padding: 0.25rem 0.4rem;
    font-size: 0.82rem;
  }

  .new-folder-form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }
  .new-folder-form .form-control-sm {
    width: 100%;
    padding: 0.3rem 0.5rem;
    font-size: 0.85rem;
  }

  .media-main {
    flex: 1;
    min-width: 0;
  }

  .media-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .media-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
  }

  .media-toolbar-right .form-control-sm {
    padding: 0.3rem 0.5rem;
    font-size: 0.82rem;
    width: auto;
  }

  .media-count {
    font-size: 0.85rem;
    color: var(--c-text-light);
    white-space: nowrap;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 0.4rem;
    font-size: 0.82rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-surface);
    color: var(--c-text, #2d3748);
    cursor: pointer;
    transition: all 0.12s;
  }

  .pagination-btn:hover:not(:disabled) {
    border-color: var(--c-accent, #3182ce);
    color: var(--c-accent, #3182ce);
  }

  .pagination-btn.active {
    background: var(--c-accent, #3182ce);
    border-color: var(--c-accent, #3182ce);
    color: white;
  }

  .pagination-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .pagination-ellipsis {
    font-size: 0.82rem;
    color: var(--c-text-light, #94a3b8);
    padding: 0 0.2rem;
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .media-card {
    padding: 0;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s, border-color 0.15s;
  }

  .media-card:hover {
    border-color: var(--c-accent, #3182ce);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .media-thumb {
    position: relative;
    height: 140px;
    background: var(--c-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .alt-badge {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    font-size: 0.6rem;
    font-weight: 600;
    padding: 0.15rem 0.4rem;
    background: var(--c-warning);
    color: var(--c-surface);
    border-radius: 3px;
    line-height: 1;
  }
  .media-thumb img {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
  }

  .media-file-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    color: var(--c-text-light);
  }
  .media-file-icon .icon { font-size: 2rem; }
  .media-file-icon .ext { font-size: 0.7rem; }

  .media-info { padding: 0.75rem; }

  .media-title {
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .media-meta {
    font-size: 0.75rem;
    color: var(--c-text-light);
    margin-top: 0.15rem;
  }

  .media-actions {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .media-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 3rem 1rem;
    color: var(--c-text-light);
  }

  .edit-preview {
    background: var(--c-bg, #f7f8fa);
    border-radius: var(--radius, 6px);
    padding: 0.75rem;
    margin-bottom: 1rem;
    text-align: center;
  }
  .edit-preview img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 4px;
  }

  .edit-variants {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .edit-variants__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-text-light);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .edit-variant-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    background: var(--c-bg, #f1f5f9);
    color: var(--c-text-light);
  }
  .edit-variant-badge.exists {
    background: #ecfdf5;
    color: #065f46;
  }
  .variant-check { font-weight: 700; }
  .variant-dash { opacity: 0.4; }

  .edit-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--c-text-light);
    margin-bottom: 1rem;
    padding: 0.5rem 0;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }
  .edit-meta span:not(:last-child)::after {
    content: '\00B7';
    margin-left: 0.5rem;
  }

  @media (max-width: 768px) {
    .media-layout { flex-direction: column; }
    .media-sidebar { width: 100%; }
  }
</style>
