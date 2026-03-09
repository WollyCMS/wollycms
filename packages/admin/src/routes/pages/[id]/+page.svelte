<script lang="ts">
  import { onMount } from 'svelte';
  import { page as routePage } from '$app/state';
  import { beforeNavigate } from '$app/navigation';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import { auditPageAccessibility, type A11yIssue } from '$lib/a11y.js';
  import { Circle, CheckCircle, Archive } from 'lucide-svelte';
  import Breadcrumb from '$lib/components/Breadcrumb.svelte';
  import MediaPicker from '$lib/components/MediaPicker.svelte';
  import PageEditorSidebar from '$lib/components/PageEditorSidebar.svelte';
  import BlockEditorRegion from '$lib/components/BlockEditorRegion.svelte';
  import PreviewPanel from '$lib/components/PreviewPanel.svelte';
  import PresenceIndicator from '$lib/components/PresenceIndicator.svelte';

  let pageData = $state<any>(null);
  let contentType = $state<any>(null);
  let blockTypes = $state<any[]>([]);
  let error = $state('');
  let success = $state('');
  let loading = $state(true);
  let activeRegion = $state('content');
  let saving = $state(false);
  let showPreview = $state(false);
  let dirty = $state(false);
  let slugManuallyEdited = $state(false);
  let editingSlug = $state(false);

  let allMenus = $state<any[]>([]);
  let menuDetails = $state<Record<number, any>>({});
  let revisions = $state<any[]>([]);
  let previewPanel = $state<PreviewPanel | null>(null);
  let blockEditor = $state<BlockEditorRegion | null>(null);

  let cleanSnapshot = $state('');
  let mediaCache = $state(new Map<number, { altText?: string }>());

  const id = $derived(routePage.params.id ?? '');

  const a11yRegions = $derived<{ name: string; label: string }[]>(contentType?.regions || []);
  const a11yIssues = $derived<A11yIssue[]>(
    pageData?.regions
      ? auditPageAccessibility(a11yRegions, pageData.regions, mediaCache)
      : []
  );

  const breadcrumbs = $derived([
    { label: 'Dashboard', href: '/' },
    { label: 'Pages', href: '/pages' },
    { label: pageData?.title || 'Loading...' },
  ]);

  const statusConfig = $derived.by(() => {
    switch (pageData?.status) {
      case 'published': return { label: 'Published', color: '#38a169', icon: CheckCircle };
      case 'archived': return { label: 'Archived', color: '#718096', icon: Archive };
      default: return { label: 'Draft', color: '#d69e2e', icon: Circle };
    }
  });

  function takeSnapshot() {
    if (!pageData) return;
    cleanSnapshot = JSON.stringify({
      title: pageData.title, slug: pageData.slug,
      status: pageData.status, fields: pageData.fields,
      metaTitle: pageData.metaTitle, metaDescription: pageData.metaDescription,
      ogImage: pageData.ogImage, canonicalUrl: pageData.canonicalUrl, robots: pageData.robots,
    });
  }

  function checkDirty() {
    if (!pageData || !cleanSnapshot) return;
    const current = JSON.stringify({
      title: pageData.title, slug: pageData.slug,
      status: pageData.status, fields: pageData.fields,
      metaTitle: pageData.metaTitle, metaDescription: pageData.metaDescription,
      ogImage: pageData.ogImage, canonicalUrl: pageData.canonicalUrl, robots: pageData.robots,
    });
    dirty = current !== cleanSnapshot;
  }

  $effect(() => {
    if (pageData) {
      void pageData.title;
      void pageData.slug;
      void pageData.status;
      void JSON.stringify(pageData.fields);
      checkDirty();
    }
  });

  beforeNavigate(({ cancel }) => {
    if (dirty && !confirm('You have unsaved changes. Leave anyway?')) {
      cancel();
    }
  });

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty) {
      e.preventDefault();
    }
  }

  function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function handleTitleInput() {
    if (!slugManuallyEdited) {
      pageData.slug = slugify(pageData.title);
    }
    checkDirty();
  }

  function handleSlugInput(e: Event) {
    pageData.slug = (e.target as HTMLInputElement).value;
    slugManuallyEdited = true;
    checkDirty();
  }

  async function load() {
    try {
      const [pageRes, btRes, menusRes] = await Promise.all([
        api.get<{ data: any }>(`/pages/${id}`),
        api.get<{ data: any[] }>('/block-types'),
        api.get<{ data: any[] }>('/menus'),
      ]);
      pageData = pageRes.data;
      blockTypes = btRes.data;
      allMenus = menusRes.data;
      slugManuallyEdited = true; // existing pages have intentional slugs
      if (pageData.typeId) {
        const ctRes = await api.get<{ data: any }>(`/content-types/${pageData.typeId}`);
        contentType = ctRes.data;
        if (contentType.regions?.length > 0) activeRegion = contentType.regions[0].name;
      }
      await loadMenuDetails();
      await loadMediaCache();
      takeSnapshot();
      dirty = false;
    } catch (err: any) { error = err.message; }
    finally { loading = false; }
  }

  async function loadMenuDetails() {
    const details: Record<number, any> = {};
    for (const menu of allMenus) {
      const res = await api.get<{ data: any }>(`/menus/${menu.id}`);
      details[menu.id] = res.data;
    }
    menuDetails = details;
  }

  async function loadRevisions() {
    try {
      const res = await api.get<{ data: any[] }>(`/pages/${id}/revisions`);
      revisions = res.data;
    } catch { revisions = []; }
  }

  /** Load media metadata for alt-text checks */
  async function loadMediaCache() {
    if (!pageData?.regions) return;
    const mediaIds = new Set<number>();
    for (const blocks of Object.values(pageData.regions) as any[][]) {
      for (const block of blocks) {
        for (const val of Object.values(block.fields || {})) {
          if (typeof val === 'number') mediaIds.add(val);
        }
      }
    }
    const cache = new Map<number, { altText?: string }>();
    for (const mid of mediaIds) {
      try {
        const res = await api.get<{ data: any }>(`/media/${mid}`);
        cache.set(mid, { altText: res.data.altText });
      } catch { /* skip */ }
    }
    mediaCache = cache;
  }

  function handleA11yNavigate(pbId: number) {
    blockEditor?.scrollToBlock(`pb_${pbId}`);
  }

  onMount(load);

  async function save() {
    saving = true;
    error = '';
    success = '';
    if (!pageData.title?.trim()) { error = 'Title cannot be empty.'; saving = false; return; }
    if (!pageData.slug?.trim()) { error = 'Slug cannot be empty.'; saving = false; return; }
    try {
      await api.put(`/pages/${id}`, {
        title: pageData.title, slug: pageData.slug, status: pageData.status,
        fields: pageData.fields || {}, scheduledAt: pageData.scheduledAt || null,
        metaTitle: pageData.metaTitle || null,
        metaDescription: pageData.metaDescription || null,
        ogImage: pageData.ogImage || null,
        canonicalUrl: pageData.canonicalUrl || null,
        robots: pageData.robots || null,
      });
      // Save any pending block field changes
      if (blockEditor?.hasUnsavedBlocks()) {
        await blockEditor.saveDirtyBlocks();
      }
      if (a11yIssues.length > 0) {
        toast.info(`Page saved with ${a11yIssues.length} accessibility warning${a11yIssues.length > 1 ? 's' : ''}.`);
      } else {
        toast.success('Page saved.');
      }
      takeSnapshot();
      dirty = false;
      if (showPreview) previewPanel?.refresh();
    } catch (err: any) {
      const msg = err.message?.includes('Slug already exists')
        ? 'A page with this slug already exists.' : err.message;
      toast.error(msg);
    } finally { saving = false; }
  }

  async function setStatus(status: string) {
    try {
      await api.put(`/pages/${id}`, { status });
      pageData.status = status;
      toast.success(status === 'published' ? 'Page published.' : 'Page unpublished.');
      takeSnapshot();
      dirty = false;
      if (showPreview) previewPanel?.refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (pageData && !saving) save();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      showPreview = !showPreview;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} onbeforeunload={handleBeforeUnload} />

{#if loading}
  <div class="loading">Loading page...</div>
{:else if error && !pageData}
  <div class="alert alert-error" style="margin: 2rem;">{error}</div>
{:else}
  <div class="editor-header">
    <div class="editor-header-left">
      <Breadcrumb crumbs={breadcrumbs} />
      <div class="title-row">
        <input
          class="page-title"
          type="text"
          bind:value={pageData.title}
          oninput={handleTitleInput}
          placeholder="Page title..."
        />
        <span class="status-pill" style="--pill-color: {statusConfig.color}">
          <statusConfig.icon size={12} />
          {statusConfig.label}
        </span>
      </div>
      <div class="slug-row">
        {#if editingSlug}
          <span class="slug-prefix">/</span>
          <input
            class="slug-input mono"
            value={pageData.slug}
            oninput={handleSlugInput}
            onblur={() => editingSlug = false}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editingSlug = false; } }}
          />
        {:else}
          <button class="slug-display mono" onclick={() => editingSlug = true} title="Click to edit slug">
            /{pageData.slug}
          </button>
        {/if}
      </div>
    </div>
    <div class="editor-header-actions">
      <button class="btn" class:btn-primary={!showPreview} class:btn-outline={showPreview}
        onclick={() => showPreview = !showPreview}>
        {showPreview ? 'Hide Preview' : 'Preview'}
      </button>
      {#if pageData.status === 'draft'}
        <button class="btn btn-primary" onclick={() => setStatus('published')}>Publish</button>
      {:else}
        <button class="btn btn-outline" onclick={() => setStatus('draft')}>Unpublish</button>
      {/if}
      <button class="btn btn-primary save-btn" class:dirty onclick={save} disabled={saving}>
        {#if dirty}<span class="dirty-dot"></span>{/if}
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>

  <PresenceIndicator pageId={id} />

  {#if error}<div class="alert alert-error">{error}</div>{/if}

  <div class="editor-layout" class:with-preview={showPreview}>
    <div class="editor-main">
      <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem;">
        <div>
          {#if contentType?.fieldsSchema?.length > 0}
            <div class="card" style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Fields</h3>
              {#each contentType.fieldsSchema as field}
                <div class="form-group">
                  <label>{field.label || field.name}</label>
                  {#if field.type === 'media'}
                    <MediaPicker value={pageData.fields?.[field.name] || null}
                      onSelect={(mediaId) => { if (!pageData.fields) pageData.fields = {}; pageData.fields[field.name] = mediaId; }} />
                  {:else if field.type === 'url'}
                    <input type="url" class="form-control" value={pageData.fields?.[field.name] || ''} placeholder="https://..."
                      oninput={(e) => { if (!pageData.fields) pageData.fields = {}; pageData.fields[field.name] = (e.target as HTMLInputElement).value; }} />
                  {:else}
                    <input class="form-control" value={pageData.fields?.[field.name] || ''}
                      oninput={(e) => { if (!pageData.fields) pageData.fields = {}; pageData.fields[field.name] = (e.target as HTMLInputElement).value; }} />
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          <BlockEditorRegion bind:this={blockEditor} {pageData} pageId={id} {contentType} {blockTypes}
            bind:activeRegion bind:error onReload={load}
            onBlockExpand={(pbId) => { if (showPreview) previewPanel?.highlightBlock(pbId); }}
            onBlockDirty={() => { dirty = true; }} />
        </div>

        <PageEditorSidebar
          {pageData} {id} {allMenus} {menuDetails} {revisions}
          {a11yIssues}
          bind:success bind:error
          onMenuDetailsReload={loadMenuDetails}
          onRevisionsReload={loadRevisions}
          onPageReload={load}
          onA11yNavigate={handleA11yNavigate}
        />
      </div>
    </div>

    <PreviewPanel bind:this={previewPanel} slug={pageData.slug} visible={showPreview}
      onBlockSelect={(pbId, region) => { blockEditor?.scrollToBlock(pbId); }} />
  </div>
{/if}

<style>
  .editor-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .editor-header-left {
    flex: 1;
    min-width: 0;
  }

  .editor-header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
    padding-top: 1.5rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.25rem;
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    outline: none;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--c-text);
    font-family: var(--font);
    padding: 0.2rem 0.4rem;
    margin: -0.2rem -0.4rem;
    flex: 1;
    min-width: 100px;
    border-radius: var(--radius);
    transition: background 0.15s, border-color 0.15s;
  }

  .page-title::placeholder {
    color: var(--c-text-light);
    opacity: 0.5;
  }

  .page-title:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  .page-title:focus {
    background: rgba(0, 0, 0, 0.03);
    border-bottom-color: var(--c-accent);
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 999px;
    background: color-mix(in srgb, var(--pill-color) 15%, transparent);
    color: var(--pill-color);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .slug-row {
    margin-top: 0.35rem;
    display: flex;
    align-items: center;
  }

  .slug-display {
    background: none;
    border: none;
    color: var(--c-text-light);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.15rem 0.35rem;
    margin: -0.15rem -0.35rem;
    text-align: left;
    border-radius: 4px;
    transition: background 0.15s, color 0.15s;
  }

  .slug-display:hover {
    color: var(--c-accent);
    background: rgba(49, 130, 206, 0.06);
  }

  .slug-prefix {
    color: var(--c-text-light);
    font-size: 0.8rem;
  }

  .slug-input {
    border: none;
    border-bottom: 1px solid var(--c-accent);
    outline: none;
    background: none;
    color: var(--c-text);
    font-size: 0.8rem;
    padding: 0.1rem 0;
    width: 300px;
  }

  .editor-layout {
    display: flex;
    gap: 0;
  }
  .editor-main {
    flex: 1;
    min-width: 0;
  }
  .editor-layout.with-preview {
    height: calc(100vh - 160px);
  }
  .editor-layout.with-preview .editor-main {
    flex: 1;
    overflow-y: auto;
  }
  .editor-layout.with-preview :global(.preview-panel) {
    flex: 1;
    min-width: 400px;
    max-width: 50%;
    height: 100%;
  }

  .save-btn {
    position: relative;
  }

  .dirty-dot {
    width: 7px;
    height: 7px;
    background: #fbbf24;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.15rem;
    animation: pulse-dot 2s infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
