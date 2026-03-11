<script lang="ts">
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import type { A11yIssue } from '$lib/a11y.js';
  import type { SeoCheck } from '$lib/seo.js';
  import RevisionDiff from './RevisionDiff.svelte';
  import AccessibilityPanel from './AccessibilityPanel.svelte';
  import TaxonomyPicker from './TaxonomyPicker.svelte';
  import SerpPreview from './SerpPreview.svelte';
  import SocialPreview from './SocialPreview.svelte';
  import SeoScorePanel from './SeoScorePanel.svelte';
  import { focusTrap } from '$lib/focusTrap.js';

  let ogGenerating = $state(false);

  async function generateOgImage() {
    ogGenerating = true;
    try {
      const res = await api.post<{ data: { ogImage: string } }>(`/pages/${id}/og-image`);
      pageData.ogImage = res.data.ogImage;
      toast.success('OG image generated.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate OG image');
    } finally {
      ogGenerating = false;
    }
  }

  let {
    pageData,
    id,
    allMenus,
    menuDetails,
    revisions,
    a11yIssues = [],
    seoChecks = [],
    siteUrl = '',
    success = $bindable(''),
    error = $bindable(''),
    onMenuDetailsReload,
    onRevisionsReload,
    onPageReload,
    onA11yNavigate,
  }: {
    pageData: any;
    id: string;
    allMenus: any[];
    menuDetails: Record<number, any>;
    revisions: any[];
    a11yIssues?: A11yIssue[];
    seoChecks?: SeoCheck[];
    siteUrl?: string;
    success: string;
    error: string;
    onMenuDetailsReload: () => Promise<void>;
    onRevisionsReload: () => Promise<void>;
    onPageReload: () => void;
    onA11yNavigate?: (pbId: number, code?: string) => void;
  } = $props();

  let showSerpPreview = $state(false);
  let showSocialPreview = $state(false);

  // Site alert (homepage only)
  const isHomePage = $derived(pageData.type === 'home_page');
  let alert = $state<{ message: string; severity: string; isActive: boolean }>({
    message: '', severity: 'warning', isActive: false,
  });
  let alertLoaded = $state(false);
  let alertSaving = $state(false);

  $effect(() => {
    if (isHomePage && !alertLoaded) {
      api.get<{ data: any }>('/alerts').then((res) => {
        if (res.data) {
          alert = {
            message: res.data.message ?? '',
            severity: res.data.severity ?? 'warning',
            isActive: res.data.isActive ?? false,
          };
        }
        alertLoaded = true;
      }).catch(() => { alertLoaded = true; });
    }
  });

  async function saveAlert() {
    alertSaving = true;
    try {
      const res = await api.put<{ data: any }>('/alerts', alert);
      if (res.data) {
        alert = { message: res.data.message ?? '', severity: res.data.severity ?? 'warning', isActive: res.data.isActive ?? false };
      }
      toast.success('Alert saved.');
    } catch (err: any) { toast.error(err.message); }
    finally { alertSaving = false; }
  }

  const severityColors: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', emergency: '#ef4444' };

  const titleLen = $derived((pageData.metaTitle || '').length);
  const descLen = $derived((pageData.metaDescription || '').length);

  let showMenuAdd = $state(false);
  let menuAddTarget = $state<number | null>(null);
  let menuAddParent = $state<number | null>(null);
  let showRevisions = $state(false);
  let revisionDetail = $state<any>(null);
  let diffRevision = $state<any>(null);

  function flattenMenuItems(items: any[], depth = 0): any[] {
    const flat: any[] = [];
    for (const item of items) {
      flat.push({ ...item, depth });
      if (item.children?.length) flat.push(...flattenMenuItems(item.children, depth + 1));
    }
    return flat;
  }

  function getPageMenuPlacements() {
    const placements: any[] = [];
    for (const menu of allMenus) {
      const detail = menuDetails[menu.id];
      if (!detail) continue;
      const flat = flattenMenuItems(detail.items || []);
      for (const item of flat) {
        if (item.pageId === parseInt(id, 10)) {
          const parent = flat.find((f: any) => f.id === item.parentId);
          placements.push({
            menuId: menu.id,
            menuName: detail.name,
            itemId: item.id,
            itemTitle: item.title,
            parentTitle: parent?.title || null,
          });
        }
      }
    }
    return placements;
  }

  function getMenuItemsForSelect(menuId: number) {
    const detail = menuDetails[menuId];
    if (!detail) return [];
    return flattenMenuItems(detail.items || []);
  }

  function showSuccess(msg: string) {
    success = msg;
    setTimeout(() => success = '', 3000);
  }

  async function addToMenu() {
    if (!menuAddTarget) return;
    try {
      await api.post(`/menus/${menuAddTarget}/items`, {
        title: pageData.title,
        pageId: parseInt(id, 10),
        parentId: menuAddParent,
      });
      showMenuAdd = false;
      menuAddTarget = null;
      menuAddParent = null;
      await onMenuDetailsReload();
      showSuccess('Added to menu.');
    } catch (err: any) { error = err.message; }
  }

  async function removeFromMenu(menuId: number, itemId: number) {
    try {
      await api.del(`/menus/${menuId}/items/${itemId}`);
      await onMenuDetailsReload();
      showSuccess('Removed from menu.');
    } catch (err: any) { error = err.message; }
  }

  async function viewRevision(revId: number) {
    try {
      const res = await api.get<{ data: any }>(`/pages/${id}/revisions/${revId}`);
      revisionDetail = res.data;
    } catch (err: any) { error = err.message; }
  }

  async function compareRevision(revId: number) {
    try {
      const res = await api.get<{ data: any }>(`/pages/${id}/revisions/${revId}`);
      diffRevision = res.data;
    } catch (err: any) { error = err.message; }
  }

  function getCurrentForDiff() {
    const allBlocks: any[] = [];
    for (const [region, blocks] of Object.entries(pageData.regions || {})) {
      for (const b of blocks as any[]) {
        allBlocks.push({ blockType: b.block_type, region, isShared: b.is_shared, title: b.title });
      }
    }
    return {
      title: pageData.title,
      slug: pageData.slug,
      status: pageData.status,
      fields: pageData.fields || {},
      blocks: allBlocks,
    };
  }

  async function restoreRevision(revId: number) {
    if (!confirm('Restore this revision? Current state will be saved as a new revision.')) return;
    try {
      await api.post(`/pages/${id}/revisions/${revId}/restore`);
      revisionDetail = null;
      showRevisions = false;
      showSuccess('Revision restored.');
      onPageReload();
      onRevisionsReload();
    } catch (err: any) { error = err.message; }
  }
</script>

{#if isHomePage && alertLoaded}
  <div class="card" style="margin-bottom: 1rem; border-left: 4px solid {severityColors[alert.severity] || '#f59e0b'};">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
      <h3 style="font-size: 0.95rem; margin: 0;">Alert Banner</h3>
      <span
        style="
          position: relative; display: inline-block; width: 40px; height: 22px;
          background: {alert.isActive ? '#16a34a' : '#ccc'}; border-radius: 11px;
          cursor: pointer; transition: background 0.2s;
        "
        onclick={() => { alert.isActive = !alert.isActive; }}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alert.isActive = !alert.isActive; } }}
        role="switch" aria-checked={alert.isActive} tabindex="0"
      >
        <span style="
          position: absolute; top: 2px; left: {alert.isActive ? '20px' : '2px'};
          width: 18px; height: 18px; background: white; border-radius: 50%;
          transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        "></span>
      </span>
    </div>
    <p style="font-size: 0.75rem; color: {alert.isActive ? '#16a34a' : 'var(--c-text-light)'}; margin-bottom: 0.5rem;">
      {alert.isActive ? 'Showing on all pages' : 'Hidden'}
    </p>
    <div class="form-group" style="margin-bottom: 0.5rem;">
      <label style="font-size: 0.8rem;">Severity</label>
      <select class="form-control" style="font-size: 0.85rem;" bind:value={alert.severity}>
        <option value="info">Info (blue)</option>
        <option value="warning">Warning (amber)</option>
        <option value="emergency">Emergency (red)</option>
      </select>
    </div>
    <div class="form-group" style="margin-bottom: 0.5rem;">
      <label style="font-size: 0.8rem;">Message</label>
      <textarea class="form-control" style="font-size: 0.85rem;" rows="2" bind:value={alert.message} placeholder="Alert message..."></textarea>
    </div>
    <button class="btn btn-sm btn-primary" onclick={saveAlert} disabled={alertSaving} style="width: 100%;">
      {alertSaving ? 'Saving...' : 'Save Alert'}
    </button>
  </div>
{/if}

<AccessibilityPanel issues={a11yIssues} onNavigate={onA11yNavigate} />

<div class="card" style="margin-bottom: 1rem;">
  <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Info</h3>
  <p style="font-size: 0.85rem; color: var(--c-text-light);">Type: {pageData.type}</p>
  <p style="font-size: 0.85rem; color: var(--c-text-light);">Status: <span class="badge badge-{pageData.status}">{pageData.status}</span></p>
  <p style="font-size: 0.85rem; color: var(--c-text-light);">Created: {new Date(pageData.meta.created_at).toLocaleString()}</p>
  <p style="font-size: 0.85rem; color: var(--c-text-light);">Updated: {new Date(pageData.meta.updated_at).toLocaleString()}</p>
  <hr style="margin: 0.75rem 0; border: none; border-top: 1px solid var(--c-border);" />
  <div class="form-group" style="margin-bottom: 0;">
    <label style="font-size: 0.8rem; font-weight: 600;">Schedule Publish</label>
    <input type="datetime-local" class="form-control" style="font-size: 0.85rem;"
      value={pageData.scheduledAt ? pageData.scheduledAt.slice(0, 16) : ''}
      onchange={(e) => {
        const val = (e.target as HTMLInputElement).value;
        pageData.scheduledAt = val ? new Date(val).toISOString() : null;
      }}
    />
    {#if pageData.scheduledAt}
      <button class="btn btn-sm btn-outline" style="margin-top: 0.25rem; font-size: 0.75rem;" onclick={() => { pageData.scheduledAt = null; }}>Clear schedule</button>
    {/if}
    <p style="font-size: 0.75rem; color: var(--c-text-light); margin-top: 0.25rem;">
      {pageData.scheduledAt ? 'Page will appear publicly after this date.' : 'No schedule — publishes immediately when status is Published.'}
    </p>
  </div>
</div>

<div class="card" style="margin-bottom: 1rem;">
  <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">SEO & Meta</h3>
  <div class="form-group" style="margin-bottom: 0.5rem;">
    <label style="font-size: 0.8rem; font-weight: 600;">Meta Title</label>
    <input class="form-control" style="font-size: 0.85rem;" placeholder={pageData.title}
      value={pageData.metaTitle || ''}
      oninput={(e) => { pageData.metaTitle = (e.target as HTMLInputElement).value || null; }} />
    <p class="char-count" class:char-good={titleLen >= 30 && titleLen <= 60} class:char-warn={titleLen > 0 && (titleLen < 30 || (titleLen > 60 && titleLen <= 70))} class:char-bad={titleLen > 70}>
      {titleLen}/60 characters
    </p>
  </div>
  <div class="form-group" style="margin-bottom: 0.5rem;">
    <label style="font-size: 0.8rem; font-weight: 600;">Meta Description</label>
    <textarea class="form-control" style="font-size: 0.85rem; min-height: 60px;" placeholder="Page description for search engines..."
      value={pageData.metaDescription || ''}
      oninput={(e) => { pageData.metaDescription = (e.target as HTMLTextAreaElement).value || null; }}></textarea>
    <p class="char-count" class:char-good={descLen >= 120 && descLen <= 160} class:char-warn={descLen > 0 && (descLen < 120 || (descLen > 160 && descLen <= 200))} class:char-bad={descLen > 200}>
      {descLen}/160 characters
    </p>
  </div>
  <div class="form-group" style="margin-bottom: 0.5rem;">
    <label style="font-size: 0.8rem; font-weight: 600;">OG Image</label>
    {#if pageData.ogImage}
      <div class="og-preview">
        <img src={pageData.ogImage} alt="OG preview" class="og-thumb" />
        <div class="og-actions">
          <button class="btn btn-sm btn-outline" onclick={generateOgImage} disabled={ogGenerating}>
            {ogGenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <button class="btn btn-sm btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;"
            onclick={() => { pageData.ogImage = null; }}>Remove</button>
        </div>
      </div>
    {:else}
      <button class="btn btn-sm btn-outline" style="width: 100%; margin-bottom: 0.35rem;"
        onclick={generateOgImage} disabled={ogGenerating}>
        {ogGenerating ? 'Generating...' : 'Auto-generate OG Image'}
      </button>
    {/if}
    <input class="form-control mono" style="font-size: 0.75rem;" placeholder="Or paste URL manually..."
      value={pageData.ogImage || ''}
      oninput={(e) => { pageData.ogImage = (e.target as HTMLInputElement).value || null; }} />
  </div>
  <div class="form-group" style="margin-bottom: 0.5rem;">
    <label style="font-size: 0.8rem; font-weight: 600;">Canonical URL</label>
    <input class="form-control mono" style="font-size: 0.8rem;" placeholder="Leave empty for default"
      value={pageData.canonicalUrl || ''}
      oninput={(e) => { pageData.canonicalUrl = (e.target as HTMLInputElement).value || null; }} />
  </div>
  <div class="form-group" style="margin-bottom: 0.5rem;">
    <label style="font-size: 0.8rem; font-weight: 600;">Robots</label>
    <select class="form-control" style="font-size: 0.85rem;"
      value={pageData.robots || ''}
      onchange={(e) => { pageData.robots = (e.target as HTMLSelectElement).value || null; }}>
      <option value="">Default (index, follow)</option>
      <option value="noindex">noindex</option>
      <option value="nofollow">nofollow</option>
      <option value="noindex, nofollow">noindex, nofollow</option>
    </select>
  </div>

  <div class="seo-previews">
    <button class="seo-preview-toggle" onclick={() => showSerpPreview = !showSerpPreview}>
      {showSerpPreview ? 'Hide' : 'Show'} Google Preview
    </button>
    <button class="seo-preview-toggle" onclick={() => showSocialPreview = !showSocialPreview}>
      {showSocialPreview ? 'Hide' : 'Show'} Social Preview
    </button>
  </div>

  {#if showSerpPreview}
    <div style="margin-top: 0.5rem;">
      <SerpPreview
        title={pageData.metaTitle || pageData.title || ''}
        slug={pageData.slug || ''}
        metaDescription={pageData.metaDescription || ''}
        {siteUrl}
      />
    </div>
  {/if}

  {#if showSocialPreview}
    <div style="margin-top: 0.5rem;">
      <SocialPreview
        title={pageData.metaTitle || pageData.title || ''}
        metaDescription={pageData.metaDescription || ''}
        ogImage={pageData.ogImage || ''}
        {siteUrl}
      />
    </div>
  {/if}

  <SeoScorePanel checks={seoChecks} />
</div>

<div class="card" style="margin-bottom: 1rem;">
  <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Menu Placement</h3>
  {#each getPageMenuPlacements() as placement}
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--c-border);">
      <div style="font-size: 0.85rem;">
        <strong>{placement.menuName}</strong>
        {#if placement.parentTitle}
          <span style="color: var(--c-text-light);"> under {placement.parentTitle}</span>
        {/if}
      </div>
      <button class="btn btn-sm btn-danger" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick={() => removeFromMenu(placement.menuId, placement.itemId)}>x</button>
    </div>
  {/each}
  {#if getPageMenuPlacements().length === 0}
    <p style="font-size: 0.85rem; color: var(--c-text-light); margin-bottom: 0.5rem;">Not in any menu</p>
  {/if}

  {#if !showMenuAdd}
    <button class="btn btn-sm btn-outline" style="width: 100%; margin-top: 0.5rem;" onclick={() => { showMenuAdd = true; menuAddTarget = allMenus[0]?.id ?? null; }}>
      + Add to Menu
    </button>
  {:else}
    <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--c-border);">
      <div class="form-group" style="margin-bottom: 0.5rem;">
        <label style="font-size: 0.75rem;">Menu</label>
        <select class="form-control" value={menuAddTarget ?? ''} onchange={(e) => {
          menuAddTarget = parseInt((e.target as HTMLSelectElement).value, 10) || null;
          menuAddParent = null;
        }}>
          {#each allMenus as menu}
            <option value={menu.id}>{menu.name}</option>
          {/each}
        </select>
      </div>
      {#if menuAddTarget}
        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label style="font-size: 0.75rem;">Parent Item</label>
          <select class="form-control" value={menuAddParent ?? ''} onchange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            menuAddParent = val ? parseInt(val, 10) : null;
          }}>
            <option value="">— Top Level —</option>
            {#each getMenuItemsForSelect(menuAddTarget) as item}
              <option value={item.id}>{'—'.repeat(item.depth)} {item.title}</option>
            {/each}
          </select>
        </div>
      {/if}
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-sm btn-outline" style="flex: 1;" onclick={() => { showMenuAdd = false; menuAddTarget = null; menuAddParent = null; }}>Cancel</button>
        <button class="btn btn-sm btn-primary" style="flex: 1;" onclick={addToMenu}>Add</button>
      </div>
    </div>
  {/if}
</div>

<TaxonomyPicker pageId={id} />

<div class="card" style="margin-bottom: 1rem;">
  <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Revision History</h3>
  {#if !showRevisions}
    <button class="btn btn-sm btn-outline" style="width: 100%;" onclick={() => { showRevisions = true; onRevisionsReload(); }}>
      Show Revisions
    </button>
  {:else}
    {#if revisions.length === 0}
      <p style="font-size: 0.85rem; color: var(--c-text-light);">No revisions yet. Revisions are created automatically when you save.</p>
    {:else}
      <div style="max-height: 300px; overflow-y: auto;">
        {#each revisions as rev}
          <div style="padding: 0.4rem 0; border-bottom: 1px solid var(--c-border); font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>{rev.title}</strong>
                {#if rev.note}
                  <div style="font-size: 0.78rem; color: var(--c-text); font-style: italic; margin-top: 0.1rem;">
                    {rev.note}
                  </div>
                {/if}
                <div style="font-size: 0.75rem; color: var(--c-text-light);">
                  {new Date(rev.createdAt).toLocaleString()}
                  {#if rev.blockCount > 0} &middot; {rev.blockCount} blocks{/if}
                </div>
              </div>
              <div style="display: flex; gap: 0.25rem;">
                <button class="btn btn-sm btn-outline" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick={() => compareRevision(rev.id)}>Diff</button>
                <button class="btn btn-sm btn-outline" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick={() => viewRevision(rev.id)}>View</button>
                <button class="btn btn-sm btn-primary" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick={() => restoreRevision(rev.id)}>Restore</button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    <button class="btn btn-sm btn-outline" style="width: 100%; margin-top: 0.5rem;" onclick={() => { showRevisions = false; revisionDetail = null; }}>
      Hide Revisions
    </button>
  {/if}
</div>

{#if revisionDetail}
  <div class="modal-overlay" onclick={() => revisionDetail = null} role="dialog" aria-modal="true" aria-labelledby="revision-detail-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 600px;" use:focusTrap onescape={() => revisionDetail = null}>
      <div class="modal-header">
        <h2 id="revision-detail-title">Revision: {revisionDetail.title}</h2>
        <button class="btn-icon" onclick={() => revisionDetail = null} aria-label="Close">&#10005;</button>
      </div>
      <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
        <p style="font-size: 0.85rem;"><strong>Slug:</strong> /{revisionDetail.slug} &middot; <strong>Status:</strong> <span class="badge badge-{revisionDetail.status}">{revisionDetail.status}</span></p>
        {#if revisionDetail.note}
          <p style="font-size: 0.85rem; font-style: italic; color: var(--c-text); margin: 0.35rem 0;"><strong>Note:</strong> {revisionDetail.note}</p>
        {/if}
        {#if revisionDetail.fields && Object.keys(revisionDetail.fields).length > 0}
          <pre style="font-size: 0.75rem; background: var(--c-bg-subtle); padding: 0.5rem; border-radius: 4px; overflow-x: auto; margin: 0.5rem 0;">{JSON.stringify(revisionDetail.fields, null, 2)}</pre>
        {/if}
        {#if Array.isArray(revisionDetail.blocks) && revisionDetail.blocks.length > 0}
          <p style="font-size: 0.8rem; font-weight: 600; margin: 0.5rem 0 0.25rem;">Blocks ({revisionDetail.blocks.length})</p>
          {#each revisionDetail.blocks as block}
            <div style="padding: 0.3rem 0.5rem; margin-bottom: 0.2rem; background: var(--c-bg-subtle); border-radius: 4px; font-size: 0.8rem;">
              <strong>{block.blockType}</strong> in {block.region}{#if block.title} — {block.title}{/if}{#if block.isShared} <span class="badge badge-published" style="font-size: 0.65rem;">shared</span>{/if}
            </div>
          {/each}
        {/if}
        <div class="modal-footer">
          <button class="btn btn-outline" onclick={() => revisionDetail = null}>Close</button>
          <button class="btn btn-primary" onclick={() => restoreRevision(revisionDetail.id)}>Restore</button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if diffRevision}
  <RevisionDiff current={getCurrentForDiff()} revision={diffRevision}
    onClose={() => diffRevision = null} onRestore={restoreRevision} />
{/if}

<style>
  .char-count {
    font-size: 0.7rem;
    margin-top: 0.15rem;
    color: var(--c-text-light, #94a3b8);
  }

  .char-good {
    color: #16a34a;
  }

  .char-warn {
    color: #d97706;
  }

  .char-bad {
    color: #dc2626;
  }

  .seo-previews {
    display: flex;
    gap: 0.35rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  .seo-preview-toggle {
    flex: 1;
    padding: 0.3rem 0.4rem;
    font-size: 0.72rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--c-accent, #3182ce);
    background: none;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }

  .seo-preview-toggle:hover {
    background: rgba(49, 130, 206, 0.04);
    border-color: var(--c-accent, #3182ce);
  }

  .og-preview {
    margin-bottom: 0.35rem;
  }

  .og-thumb {
    width: 100%;
    border-radius: 4px;
    border: 1px solid var(--c-border, #e2e8f0);
    margin-bottom: 0.35rem;
  }

  .og-actions {
    display: flex;
    gap: 0.35rem;
  }
</style>
