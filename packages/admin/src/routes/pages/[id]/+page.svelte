<script lang="ts">
  import { onMount } from 'svelte';
  import { page as routePage } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api.js';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import SortableList from '$lib/components/SortableList.svelte';
  import MediaPicker from '$lib/components/MediaPicker.svelte';

  let pageData = $state<any>(null);
  let contentType = $state<any>(null);
  let blockTypes = $state<any[]>([]);
  let error = $state('');
  let success = $state('');
  let activeRegion = $state('content');
  let showAddBlock = $state(false);
  let saving = $state(false);

  // Menu placement
  let allMenus = $state<any[]>([]);
  let menuDetails = $state<Record<number, any>>({});
  let showMenuAdd = $state(false);
  let menuAddTarget = $state<number | null>(null);
  let menuAddParent = $state<number | null>(null);

  const id = $derived($routePage.params.id);

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
      if (pageData.typeId) {
        const ctRes = await api.get<{ data: any }>(`/content-types/${pageData.typeId}`);
        contentType = ctRes.data;
        if (contentType.regions?.length > 0) {
          activeRegion = contentType.regions[0].name;
        }
      }
      await loadMenuDetails();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function loadMenuDetails() {
    const details: Record<number, any> = {};
    for (const menu of allMenus) {
      const res = await api.get<{ data: any }>(`/menus/${menu.id}`);
      details[menu.id] = res.data;
    }
    menuDetails = details;
  }

  function getPageMenuPlacements(): { menuId: number; menuName: string; itemId: number; itemTitle: string; parentTitle: string | null }[] {
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

  function flattenMenuItems(items: any[], depth = 0): any[] {
    const flat: any[] = [];
    for (const item of items) {
      flat.push({ ...item, depth });
      if (item.children?.length) flat.push(...flattenMenuItems(item.children, depth + 1));
    }
    return flat;
  }

  function getMenuItemsForSelect(menuId: number): any[] {
    const detail = menuDetails[menuId];
    if (!detail) return [];
    return flattenMenuItems(detail.items || []);
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
      await loadMenuDetails();
      success = 'Added to menu.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) { error = err.message; }
  }

  async function removeFromMenu(menuId: number, itemId: number) {
    try {
      await api.del(`/menus/${menuId}/items/${itemId}`);
      await loadMenuDetails();
      success = 'Removed from menu.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) { error = err.message; }
  }

  onMount(load);

  async function save() {
    saving = true;
    error = '';
    success = '';
    try {
      await api.put(`/pages/${id}`, {
        title: pageData.title,
        slug: pageData.slug,
        status: pageData.status,
        fields: pageData.fields || {},
      });
      success = 'Page saved.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  async function publish() {
    try {
      await api.put(`/pages/${id}`, { status: 'published' });
      pageData.status = 'published';
      success = 'Page published.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) {
      error = err.message;
    }
  }

  async function unpublish() {
    try {
      await api.put(`/pages/${id}`, { status: 'draft' });
      pageData.status = 'draft';
      success = 'Page unpublished.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) {
      error = err.message;
    }
  }

  async function addBlock(blockTypeId: number) {
    try {
      await api.post(`/pages/${id}/blocks`, {
        blockTypeId,
        region: activeRegion,
        fields: {},
      });
      showAddBlock = false;
      load();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function removeBlock(pbId: number) {
    if (!confirm('Remove this block?')) return;
    try {
      await api.del(`/pages/${id}/blocks/${pbId}`);
      load();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function updateBlockField(pbId: number, blockId: number, fieldName: string, value: unknown) {
    const regionBlocks = pageData.regions[activeRegion] || [];
    const block = regionBlocks.find((b: any) => b.pb_id === pbId);
    if (!block) return;
    block.fields[fieldName] = value;

    if (block.is_shared) {
      await api.put(`/pages/${id}/blocks/${pbId}`, { overrides: { [fieldName]: value } });
    } else {
      await api.put(`/blocks/${blockId}`, { fields: block.fields });
    }
  }

  function getRegionBlocks(region: string): any[] {
    return pageData?.regions?.[region] || [];
  }

  function getFieldSchema(blockTypeSlug: string) {
    const bt = blockTypes.find((t: any) => t.slug === blockTypeSlug);
    return bt?.fieldsSchema || [];
  }

  function isFieldVisible(field: any, allFields: any[], blockFields: Record<string, any>): boolean {
    // Video block conditional: media only when source=upload, url only when source=youtube/vimeo
    if (field.name === 'media' && allFields.some((f: any) => f.name === 'source')) {
      return blockFields['source'] === 'upload' || !blockFields['source'];
    }
    if (field.name === 'url' && allFields.some((f: any) => f.name === 'source')) {
      return blockFields['source'] === 'youtube' || blockFields['source'] === 'vimeo';
    }
    return true;
  }

  function sortableBlocks(region: string): any[] {
    return getRegionBlocks(region).map((b: any) => ({ ...b, id: b.pb_id }));
  }

  async function reorderBlocks(reordered: any[]) {
    const order = reordered.map((b: any) => b.pb_id);
    pageData.regions[activeRegion] = reordered;
    try {
      await api.put(`/pages/${id}/blocks-order`, { region: activeRegion, order });
    } catch (err: any) {
      error = err.message;
      load();
    }
  }
</script>

{#if !pageData}
  <div class="loading">Loading page...</div>
{:else}
  <div class="page-header">
    <div>
      <a href="/pages" style="color: var(--c-text-light); text-decoration: none; font-size: 0.85rem;">← Back to Pages</a>
      <h1 style="margin-top: 0.25rem;">Edit: {pageData.title}</h1>
    </div>
    <div style="display: flex; gap: 0.5rem;">
      {#if pageData.status === 'draft'}
        <button class="btn btn-primary" onclick={publish}>Publish</button>
      {:else}
        <button class="btn btn-outline" onclick={unpublish}>Unpublish</button>
      {/if}
      <button class="btn btn-primary" onclick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>

  {#if error}<div class="alert alert-error">{error}</div>{/if}
  {#if success}<div class="alert alert-success">{success}</div>{/if}

  <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem;">
    <div>
      <!-- Page fields -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="form-group">
          <label for="pe-title">Title</label>
          <input id="pe-title" class="form-control" bind:value={pageData.title} />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="pe-slug">Slug</label>
            <input id="pe-slug" class="form-control" bind:value={pageData.slug} />
          </div>
          <div class="form-group">
            <label for="pe-status">Status</label>
            <select id="pe-status" class="form-control" bind:value={pageData.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {#if contentType?.fieldsSchema?.length > 0}
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--c-border);" />
          <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Fields</h3>
          {#each contentType.fieldsSchema as field}
            <div class="form-group">
              <label>{field.label || field.name}</label>
              {#if field.type === 'media'}
                <MediaPicker
                  value={pageData.fields?.[field.name] || null}
                  onSelect={(mediaId) => {
                    if (!pageData.fields) pageData.fields = {};
                    pageData.fields[field.name] = mediaId;
                  }}
                />
              {:else if field.type === 'url'}
                <input type="url" class="form-control" value={pageData.fields?.[field.name] || ''} placeholder="https://..." oninput={(e) => {
                  if (!pageData.fields) pageData.fields = {};
                  pageData.fields[field.name] = (e.target as HTMLInputElement).value;
                }} />
              {:else}
                <input class="form-control" value={pageData.fields?.[field.name] || ''} oninput={(e) => {
                  if (!pageData.fields) pageData.fields = {};
                  pageData.fields[field.name] = (e.target as HTMLInputElement).value;
                }} />
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Blocks by region -->
      {#if contentType?.regions?.length > 0}
        <div class="tabs">
          {#each contentType.regions as region}
            <button class="tab" class:active={activeRegion === region.name} onclick={() => activeRegion = region.name}>
              {region.label} ({getRegionBlocks(region.name).length})
            </button>
          {/each}
        </div>

        <div class="card">
          <SortableList items={sortableBlocks(activeRegion)} onReorder={reorderBlocks}>
            {#snippet children(block, i)}
              <div class="block-editor" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                  <strong style="font-size: 0.9rem;">
                    {block.block_type}
                    {#if block.is_shared}<span class="badge badge-published" style="margin-left: 0.5rem;">shared</span>{/if}
                  </strong>
                  <button class="btn btn-sm btn-danger" onclick={() => removeBlock(block.pb_id)}>Remove</button>
                </div>
                {#each getFieldSchema(block.block_type) as field}
                  {#if isFieldVisible(field, getFieldSchema(block.block_type), block.fields)}
                  <div class="form-group">
                    <label style="font-size: 0.8rem;">{field.label || field.name}</label>
                    {#if field.type === 'richtext'}
                      <RichTextEditor
                        content={block.fields[field.name] || ''}
                        onUpdate={(json) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, json)}
                      />
                    {:else if field.type === 'media'}
                      <MediaPicker
                        value={block.fields[field.name] || null}
                        onSelect={(mediaId) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, mediaId)}
                      />
                    {:else if field.type === 'select'}
                      <select class="form-control" value={block.fields[field.name] || field.default || ''}
                        onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLSelectElement).value)}>
                        {#each (field.settings?.options || field.options || []) as opt}
                          <option value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
                        {/each}
                      </select>
                    {:else if field.type === 'boolean'}
                      <input type="checkbox" checked={!!block.fields[field.name]}
                        onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).checked)} />
                    {:else if field.type === 'number'}
                      <input type="number" class="form-control" value={block.fields[field.name] || ''}
                        oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, Number((e.target as HTMLInputElement).value))} />
                    {:else if field.type === 'repeater'}
                      <textarea class="form-control" value={JSON.stringify(block.fields[field.name] || [], null, 2)}
                        onblur={(e) => {
                          try {
                            const val = JSON.parse((e.target as HTMLTextAreaElement).value);
                            updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, val);
                          } catch { /* ignore parse errors */ }
                        }}
                        style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"
                      ></textarea>
                    {:else if field.type === 'url'}
                      <input type="url" class="form-control" value={block.fields[field.name] || ''} placeholder="https://..."
                        oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                    {:else}
                      <input class="form-control" value={block.fields[field.name] || ''}
                        oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                    {/if}
                  </div>
                  {/if}
                {/each}
              </div>
            {/snippet}
          </SortableList>

          <button class="btn btn-outline" style="width: 100%; margin-top: 0.75rem;" onclick={() => showAddBlock = true}>
            + Add Block to {activeRegion}
          </button>
        </div>
      {/if}
    </div>

    <!-- Sidebar info -->
    <div>
      <div class="card" style="margin-bottom: 1rem;">
        <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Info</h3>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Type: {pageData.type}</p>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Status: <span class="badge badge-{pageData.status}">{pageData.status}</span></p>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Created: {new Date(pageData.meta.created_at).toLocaleString()}</p>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Updated: {new Date(pageData.meta.updated_at).toLocaleString()}</p>
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
            <button class="btn btn-sm btn-danger" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick={() => removeFromMenu(placement.menuId, placement.itemId)}>×</button>
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
    </div>
  </div>

  {#if showAddBlock}
    <div class="modal-overlay" onclick={() => showAddBlock = false} role="dialog">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Add Block to "{activeRegion}"</h2>
          <button class="btn-icon" onclick={() => showAddBlock = false}>✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            {#each blockTypes as bt}
              <button class="card" style="cursor: pointer; text-align: left;" onclick={() => addBlock(bt.id)}>
                <strong style="font-size: 0.9rem;">{bt.name}</strong>
                {#if bt.description}<p style="font-size: 0.8rem; color: var(--c-text-light); margin-top: 0.25rem;">{bt.description}</p>{/if}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
