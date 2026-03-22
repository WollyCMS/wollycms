<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import { focusTrap } from '$lib/focusTrap.js';

  const typeColors: Record<string, string> = {
    home_page: '#d69e2e',
    landing_page: '#3182ce',
    secondary_page: '#38a169',
  };

  function getTypeColor(slug: string): string {
    return typeColors[slug] || '#94a3b8';
  }

  let pages = $state<any[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let statusFilter = $state('');
  let typeFilter = $state('');
  let localeFilter = $state('');
  let supportedLocales = $state<string[]>(['en']);
  let defaultLocale = $state('en');
  let sortBy = $state('updated_at:desc');
  let showCreate = $state(false);
  let contentTypes = $state<any[]>([]);
  let newPage = $state({ title: '', slug: '', typeId: 0, status: 'draft' as string, locale: '' });
  let slugManuallyEdited = $state(false);
  let selected = $state<Set<number>>(new Set());
  let pageSize = 20;
  let offset = $state(0);

  let allSelected = $derived(pages.length > 0 && pages.every((p) => selected.has(p.id)));
  let currentPage = $derived(Math.floor(offset / pageSize) + 1);
  let totalPages = $derived(Math.ceil(total / pageSize));
  let updatedSortDirection = $derived(
    sortBy === 'updated_at:asc' ? 'ascending' : sortBy === 'updated_at:desc' ? 'descending' : 'none',
  );

  async function load() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (localeFilter) params.set('locale', localeFilter);
      if (sortBy) params.set('sort', sortBy);
      params.set('limit', String(pageSize));
      params.set('offset', String(offset));
      const res = await api.get<{ data: any[]; meta: any }>(`/pages?${params}`);
      pages = res.data;
      total = res.meta.total;
      selected = new Set();
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function loadTypes() {
    const res = await api.get<{ data: any[] }>('/content-types');
    contentTypes = res.data;
    if (contentTypes.length > 0) newPage.typeId = contentTypes[0].id;
  }

  async function loadLocaleConfig() {
    try {
      const res = await api.get<{ data: any }>('/config');
      supportedLocales = res.data.supportedLocales || ['en'];
      defaultLocale = res.data.defaultLocale || 'en';
    } catch { /* use defaults */ }
  }

  onMount(() => { load(); loadTypes(); loadLocaleConfig(); });

  let createError = $state('');

  function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function handleNewTitleInput() {
    if (!slugManuallyEdited) {
      newPage.slug = slugify(newPage.title);
    }
  }

  async function createPage() {
    createError = '';
    if (!newPage.title.trim()) { createError = 'Title is required.'; return; }
    if (!newPage.typeId) { createError = 'Please select a content type.'; return; }
    try {
      const payload: Record<string, unknown> = {
        title: newPage.title,
        typeId: newPage.typeId,
        status: newPage.status,
      };
      if (newPage.slug.trim()) payload.slug = newPage.slug.trim();
      if (newPage.locale) payload.locale = newPage.locale;
      const res = await api.post<{ data: { id: number } }>('/pages', payload);
      showCreate = false;
      newPage = { title: '', slug: '', typeId: contentTypes[0]?.id || 0, status: 'draft', locale: '' };
      slugManuallyEdited = false;
      goto(`${base}/pages/${res.data.id}`);
    } catch (err: any) {
      if (err.message?.includes('Slug already exists')) {
        createError = 'A page with this slug already exists. Try a different title or slug.';
      } else {
        createError = err.message;
      }
    }
  }

  async function duplicatePage(id: number) {
    try {
      await api.post(`/pages/${id}/duplicate`);
      toast.success('Page duplicated.');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function archivePage(id: number) {
    if (!confirm('Archive this page? It will be hidden from the live site.')) return;
    try {
      await api.put(`/pages/${id}`, { status: 'archived' });
      toast.success('Page archived.');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function deletePage(id: number) {
    if (!confirm('Permanently delete this page? This cannot be undone.')) return;
    try {
      await api.del(`/pages/${id}`);
      toast.success('Page deleted.');
      load();
    } catch (err: any) {
      error = err.message;
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    selected = next;
  }

  function toggleAll() {
    if (allSelected) {
      selected = new Set();
    } else {
      selected = new Set(pages.map((p) => p.id));
    }
  }

  async function bulkAction(action: string) {
    if (selected.size === 0) return;
    const label = action === 'delete' ? `Delete ${selected.size} page(s)?` : `${action} ${selected.size} page(s)?`;
    if (!confirm(label)) return;
    try {
      await api.post('/pages/bulk', { ids: [...selected], action });
      toast.success(`${selected.size} page(s) ${action === 'delete' ? 'deleted' : action + 'ed'}.`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }
</script>

<div class="page-header">
  <h1>Pages ({total})</h1>
  <button class="btn btn-primary" onclick={() => { createError = ''; slugManuallyEdited = false; newPage.slug = ''; showCreate = true; }}>+ New Page</button>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

<div class="card" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
  <input class="form-control" placeholder="Search pages..." bind:value={search} oninput={() => { offset = 0; load(); }} style="max-width: 300px;" />
  <select class="form-control" bind:value={typeFilter} onchange={() => { offset = 0; load(); }} style="max-width: 160px;">
    <option value="">All types</option>
    {#each contentTypes as ct}
      <option value={ct.slug}>{ct.name}</option>
    {/each}
  </select>
  <select class="form-control" bind:value={statusFilter} onchange={() => { offset = 0; load(); }} style="max-width: 160px;">
    <option value="">All statuses</option>
    <option value="published">Published</option>
    <option value="draft">Draft</option>
    <option value="archived">Archived</option>
  </select>
  {#if supportedLocales.length > 1}
    <select class="form-control" bind:value={localeFilter} onchange={() => { offset = 0; load(); }} style="max-width: 120px;">
      <option value="">All locales</option>
      {#each supportedLocales as loc}
        <option value={loc}>{loc.toUpperCase()}</option>
      {/each}
    </select>
  {/if}
  <select class="form-control" bind:value={sortBy} onchange={() => { offset = 0; load(); }} style="max-width: 180px;">
    <option value="updated_at:desc">Last updated</option>
    <option value="updated_at:asc">Oldest updated</option>
    <option value="created_at:desc">Newest created</option>
    <option value="created_at:asc">Oldest created</option>
    <option value="title:asc">Title A-Z</option>
    <option value="title:desc">Title Z-A</option>
  </select>
  {#if selected.size > 0}
    <span style="margin-left: auto; font-size: 0.85rem; color: var(--c-text-light);">{selected.size} selected</span>
    <button class="btn btn-sm btn-outline" onclick={() => bulkAction('publish')}>Publish</button>
    <button class="btn btn-sm btn-outline" onclick={() => bulkAction('unpublish')}>Unpublish</button>
    <button class="btn btn-sm btn-outline" onclick={() => bulkAction('archive')}>Archive</button>
    <button class="btn btn-sm btn-danger" onclick={() => bulkAction('delete')}>Delete</button>
  {/if}
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th style="width: 32px;"><input type="checkbox" checked={allSelected} onchange={toggleAll} aria-label="Select all pages" /></th>
        <th>Title</th><th>Slug</th><th>Locale</th><th>Type</th><th>Status</th>
        <th aria-sort={updatedSortDirection}>
          <button
            type="button"
            class="table-sort-btn"
            onclick={() => { sortBy = sortBy === 'updated_at:desc' ? 'updated_at:asc' : 'updated_at:desc'; load(); }}
            aria-label="Sort by updated date"
          >
            Updated {sortBy === 'updated_at:desc' ? '↓' : sortBy === 'updated_at:asc' ? '↑' : ''}
          </button>
        </th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#if loading}
        {#each Array(5) as _}
          <tr>
            <td><div class="skeleton" style="width: 16px; height: 16px; border-radius: 3px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width: 70%;"></div></td>
            <td><div class="skeleton skeleton-text" style="width: 50%;"></div></td>
            <td><div class="skeleton" style="width: 28px; height: 18px; border-radius: 4px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width: 80%;"></div></td>
            <td><div class="skeleton" style="width: 72px; height: 22px; border-radius: 999px;"></div></td>
            <td><div class="skeleton skeleton-text" style="width: 60%;"></div></td>
            <td></td>
          </tr>
        {/each}
      {:else if pages.length === 0}
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-state-title">No pages found</div>
              <p>{search || statusFilter || typeFilter ? 'Try adjusting your filters.' : 'Create your first page to get started.'}</p>
            </div>
          </td>
        </tr>
      {:else}
        {#each pages as page}
          <tr style="--type-color: {getTypeColor(page.type || '')};">
            <td><input type="checkbox" checked={selected.has(page.id)} onchange={() => toggleSelect(page.id)} aria-label={"Select page " + page.title} /></td>
            <td class="td-title"><span class="type-bar"></span><a href="{base}/pages/{page.id}"><strong>{page.title}</strong></a></td>
            <td class="mono" style="color: var(--c-text-light);">/{page.slug}</td>
            <td><span class="badge" style="font-size: 0.7rem; background: var(--c-bg-subtle); color: var(--c-text-light);">{page.locale?.toUpperCase() || 'EN'}</span></td>
            <td>{page.typeName}</td>
            <td><span class="badge badge-{page.status}">{page.status}</span></td>
            <td>{new Date(page.meta.updated_at).toLocaleDateString()}</td>
            <td style="text-align: right;">
              <a href="{base}/pages/{page.id}" class="btn btn-sm btn-outline">Edit</a>
              <button class="btn btn-sm btn-outline" onclick={() => duplicatePage(page.id)}>Duplicate</button>
              {#if page.status !== 'archived'}
                <button class="btn btn-sm btn-outline" onclick={() => archivePage(page.id)}>Archive</button>
              {/if}
              <button class="btn btn-sm btn-danger" onclick={() => deletePage(page.id)}>Delete</button>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

{#if totalPages > 1}
  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.85rem;">
    <span style="color: var(--c-text-light);">Showing {offset + 1}–{Math.min(offset + pageSize, total)} of {total}</span>
    <div style="display: flex; gap: 0.25rem;">
      <button class="btn btn-sm btn-outline" disabled={currentPage <= 1} onclick={() => { offset = 0; load(); }}>«</button>
      <button class="btn btn-sm btn-outline" disabled={currentPage <= 1} onclick={() => { offset = Math.max(0, offset - pageSize); load(); }}>‹</button>
      <span style="padding: 0.25rem 0.5rem; line-height: 1.6;">Page {currentPage} of {totalPages}</span>
      <button class="btn btn-sm btn-outline" disabled={currentPage >= totalPages} onclick={() => { offset += pageSize; load(); }}>›</button>
      <button class="btn btn-sm btn-outline" disabled={currentPage >= totalPages} onclick={() => { offset = (totalPages - 1) * pageSize; load(); }}>»</button>
    </div>
  </div>
{/if}

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog" aria-labelledby="new-page-title" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showCreate = false}>
      <div class="modal-header">
        <h2 id="new-page-title">New Page</h2>
        <button class="btn-icon" onclick={() => showCreate = false} aria-label="Close">&#10005;</button>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createPage(); }}>
        {#if createError}<div class="alert alert-error" style="margin-bottom: 0.75rem;">{createError}</div>{/if}
        <div class="form-group">
          <label for="np-title">Title</label>
          <input id="np-title" class="form-control" bind:value={newPage.title} oninput={handleNewTitleInput} required />
        </div>
        <div class="form-group">
          <label for="np-slug">Slug</label>
          <div style="display: flex; align-items: center; gap: 0;">
            <span style="padding: 0.4rem 0.5rem; background: var(--c-bg-alt, #f1f5f9); border: 1px solid var(--c-border); border-right: none; border-radius: var(--radius, 6px) 0 0 var(--radius, 6px); font-size: 0.85rem; color: var(--c-text-light);">/</span>
            <input id="np-slug" class="form-control mono" style="border-radius: 0 var(--radius, 6px) var(--radius, 6px) 0; font-size: 0.85rem;" bind:value={newPage.slug} oninput={() => slugManuallyEdited = true} placeholder="auto-generated from title" />
          </div>
        </div>
        <div class="form-group">
          <label for="np-type">Content Type</label>
          <select id="np-type" class="form-control" bind:value={newPage.typeId}>
            {#each contentTypes as ct}
              <option value={ct.id}>{ct.name}</option>
            {/each}
          </select>
        </div>
        {#if supportedLocales.length > 1}
          <div class="form-group">
            <label for="np-locale">Locale</label>
            <select id="np-locale" class="form-control" bind:value={newPage.locale}>
              <option value="">Default ({defaultLocale})</option>
              {#each supportedLocales as loc}
                <option value={loc}>{loc.toUpperCase()}</option>
              {/each}
            </select>
          </div>
        {/if}
        <div class="form-group">
          <label for="np-status">Status</label>
          <select id="np-status" class="form-control" bind:value={newPage.status}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create Page</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .td-title {
    position: relative;
    padding-left: 1.25rem !important;
  }

  .type-bar {
    position: absolute;
    left: 0;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 3px;
    border-radius: 2px;
    background: var(--type-color);
  }

  .table-sort-btn {
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: inherit;
    padding: 0;
  }
</style>
