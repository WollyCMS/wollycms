<script lang="ts">
  import { api } from '$lib/api.js';

  let {
    pageData,
    id,
    allMenus,
    menuDetails,
    revisions,
    success = $bindable(''),
    error = $bindable(''),
    onMenuDetailsReload,
    onRevisionsReload,
    onPageReload,
  }: {
    pageData: any;
    id: string;
    allMenus: any[];
    menuDetails: Record<number, any>;
    revisions: any[];
    success: string;
    error: string;
    onMenuDetailsReload: () => Promise<void>;
    onRevisionsReload: () => Promise<void>;
    onPageReload: () => void;
  } = $props();

  let showMenuAdd = $state(false);
  let menuAddTarget = $state<number | null>(null);
  let menuAddParent = $state<number | null>(null);
  let showRevisions = $state(false);
  let revisionDetail = $state<any>(null);

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
                <div style="font-size: 0.75rem; color: var(--c-text-light);">
                  {new Date(rev.createdAt).toLocaleString()}
                  {#if rev.blockCount > 0} &middot; {rev.blockCount} blocks{/if}
                </div>
              </div>
              <div style="display: flex; gap: 0.25rem;">
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
  <div class="modal-overlay" onclick={() => revisionDetail = null} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 600px;">
      <div class="modal-header">
        <h2>Revision: {revisionDetail.title}</h2>
        <button class="btn-icon" onclick={() => revisionDetail = null}>&#10005;</button>
      </div>
      <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
        <div class="form-group">
          <label style="font-size: 0.8rem; font-weight: 600;">Title</label>
          <p style="font-size: 0.9rem;">{revisionDetail.title}</p>
        </div>
        <div class="form-group">
          <label style="font-size: 0.8rem; font-weight: 600;">Slug</label>
          <p style="font-size: 0.9rem;">/{revisionDetail.slug}</p>
        </div>
        <div class="form-group">
          <label style="font-size: 0.8rem; font-weight: 600;">Status</label>
          <span class="badge badge-{revisionDetail.status}">{revisionDetail.status}</span>
        </div>
        {#if revisionDetail.fields && Object.keys(revisionDetail.fields).length > 0}
          <div class="form-group">
            <label style="font-size: 0.8rem; font-weight: 600;">Fields</label>
            <pre style="font-size: 0.75rem; background: var(--c-bg-subtle); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">{JSON.stringify(revisionDetail.fields, null, 2)}</pre>
          </div>
        {/if}
        {#if Array.isArray(revisionDetail.blocks) && revisionDetail.blocks.length > 0}
          <div class="form-group">
            <label style="font-size: 0.8rem; font-weight: 600;">Blocks ({revisionDetail.blocks.length})</label>
            {#each revisionDetail.blocks as block}
              <div style="padding: 0.4rem; margin-bottom: 0.25rem; background: var(--c-bg-subtle); border-radius: 4px; font-size: 0.8rem;">
                <strong>{block.blockType}</strong> in {block.region}
                {#if block.title} — {block.title}{/if}
                {#if block.isShared}<span class="badge badge-published" style="font-size: 0.65rem; margin-left: 0.25rem;">shared</span>{/if}
              </div>
            {/each}
          </div>
        {/if}
        <div class="modal-footer">
          <button class="btn btn-outline" onclick={() => revisionDetail = null}>Close</button>
          <button class="btn btn-primary" onclick={() => restoreRevision(revisionDetail.id)}>Restore This Revision</button>
        </div>
      </div>
    </div>
  </div>
{/if}
