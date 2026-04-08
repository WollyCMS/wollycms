<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';
  import SortableList from '$lib/components/SortableList.svelte';
  import PageSearch from '$lib/components/PageSearch.svelte';

  let menus = $state<any[]>([]);
  let selectedMenu = $state<any>(null);
  let error = $state('');
  let showCreate = $state(false);
  let newMenu = $state({ name: '', slug: '' });
  let showAddItem = $state(false);
  let newItem = $state({ title: '', url: '', pageId: null as number | null, parentId: null as number | null });
  let newItemPageTitle = $state('');
  let editingItemId = $state<number | null>(null);
  let editItem = $state<any>(null);
  let editItemPageTitle = $state('');

  async function load() {
    try {
      const menuRes = await api.get<{ data: any[] }>('/menus');
      menus = menuRes.data;
      if (menus.length > 0 && !selectedMenu) loadMenu(menus[0].id);
    } catch (err: any) { error = err.message; }
  }

  async function loadMenu(id: number) {
    try {
      const res = await api.get<{ data: any }>(`/menus/${id}`);
      selectedMenu = res.data;
    } catch (err: any) { error = err.message; }
  }

  onMount(load);

  async function createMenu() {
    try {
      await api.post('/menus', newMenu);
      showCreate = false;
      newMenu = { name: '', slug: '' };
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteMenu(id: number) {
    if (!confirm('Delete this menu and all its items?')) return;
    try {
      await api.del(`/menus/${id}`);
      selectedMenu = null;
      load();
    } catch (err: any) { error = err.message; }
  }

  async function addItem() {
    if (!selectedMenu) return;
    try {
      const payload: any = { title: newItem.title, parentId: newItem.parentId };
      if (newItem.pageId) {
        payload.pageId = newItem.pageId;
        payload.url = null;
      } else {
        payload.url = newItem.url || null;
      }
      await api.post(`/menus/${selectedMenu.id}/items`, payload);
      showAddItem = false;
      newItem = { title: '', url: '', pageId: null, parentId: null };
      newItemPageTitle = '';
      loadMenu(selectedMenu.id);
    } catch (err: any) { error = err.message; }
  }

  function startEdit(item: any) {
    editingItemId = item.id;
    editItem = { title: item.title, url: item.url || '', pageId: item.pageId || null, parentId: item.parentId || null };
    editItemPageTitle = item.pageSlug ? item.title : '';
  }

  async function saveEdit() {
    if (!selectedMenu || !editingItemId || !editItem) return;
    try {
      const payload: any = { title: editItem.title, parentId: editItem.parentId };
      if (editItem.pageId) {
        payload.pageId = editItem.pageId;
        payload.url = null;
      } else {
        payload.pageId = null;
        payload.url = editItem.url || null;
      }
      await api.put(`/menus/${selectedMenu.id}/items/${editingItemId}`, payload);
      editingItemId = null;
      editItem = null;
      loadMenu(selectedMenu.id);
    } catch (err: any) { error = err.message; }
  }

  function cancelEdit() {
    editingItemId = null;
    editItem = null;
  }

  async function deleteItem(itemId: number) {
    if (!selectedMenu || !confirm('Delete this menu item?')) return;
    try {
      await api.del(`/menus/${selectedMenu.id}/items/${itemId}`);
      loadMenu(selectedMenu.id);
    } catch (err: any) { error = err.message; }
  }

  const MAX_DEPTH = 4;

  function renderItems(items: any[], depth: number = 0): any[] {
    const flat: any[] = [];
    for (const item of items) {
      flat.push({ ...item, depth, hasChildren: !!(item.children?.length) });
      if (item.children?.length > 0) flat.push(...renderItems(item.children, depth + 1));
    }
    return flat;
  }

  function flatMenuItems(): any[] {
    return renderItems(selectedMenu?.items || []);
  }

  async function reorderMenuItems(reordered: any[]) {
    if (!selectedMenu) return;
    const items = reordered.map((item: any, i: number) => ({
      id: item.id,
      parentId: item.parentId ?? null,
      position: i,
      depth: item.depth ?? 0,
    }));
    try {
      await api.put(`/menus/${selectedMenu.id}/items-order`, { items });
      loadMenu(selectedMenu.id);
    } catch (err: any) {
      error = err.message;
      loadMenu(selectedMenu.id);
    }
  }

  /** Get the max depth of an item and all its descendants in the flat list */
  function subtreeMaxDepth(flat: any[], index: number): number {
    const baseDepth = flat[index].depth;
    let max = baseDepth;
    for (let j = index + 1; j < flat.length; j++) {
      if (flat[j].depth <= baseDepth) break;
      if (flat[j].depth > max) max = flat[j].depth;
    }
    return max;
  }

  function canIndent(flat: any[], index: number): boolean {
    const item = flat[index];
    // Find previous sibling (same parentId and same depth)
    let hasPrevSibling = false;
    for (let j = index - 1; j >= 0; j--) {
      if (flat[j].depth < item.depth) break; // went above our level
      if (flat[j].depth === item.depth && flat[j].parentId === item.parentId) {
        hasPrevSibling = true;
        break;
      }
    }
    if (!hasPrevSibling) return false;
    // Check depth limit for entire subtree
    const maxD = subtreeMaxDepth(flat, index);
    return (maxD + 1) <= MAX_DEPTH;
  }

  function canOutdent(flat: any[], index: number): boolean {
    return flat[index].depth > 0;
  }

  function indentItem(flat: any[], index: number) {
    const item = flat[index];
    const origDepth = item.depth;
    // Find previous sibling
    let prevSiblingIdx = -1;
    for (let j = index - 1; j >= 0; j--) {
      if (flat[j].depth < origDepth) break;
      if (flat[j].depth === origDepth && flat[j].parentId === item.parentId) {
        prevSiblingIdx = j;
        break;
      }
    }
    if (prevSiblingIdx < 0) return;

    const mutated = flat.map(i => ({ ...i }));
    mutated[index].parentId = mutated[prevSiblingIdx].id;
    mutated[index].depth = origDepth + 1;
    // Adjust descendants
    for (let j = index + 1; j < mutated.length; j++) {
      if (mutated[j].depth <= origDepth) break;
      mutated[j].depth += 1;
    }
    reorderMenuItems(mutated);
  }

  function outdentItem(flat: any[], index: number) {
    const item = flat[index];
    const origDepth = item.depth;
    if (origDepth === 0) return;
    // Find current parent
    const parent = flat.find(i => i.id === item.parentId);
    if (!parent) return;

    const mutated = flat.map(i => ({ ...i }));
    mutated[index].parentId = parent.parentId ?? null;
    mutated[index].depth = origDepth - 1;
    // Adjust descendants
    for (let j = index + 1; j < mutated.length; j++) {
      if (mutated[j].depth <= origDepth) break;
      mutated[j].depth -= 1;
    }
    reorderMenuItems(mutated);
  }

  function editableParentOptions(): any[] {
    const flat = flatMenuItems();
    if (!editingItemId) return flat;
    const excluded = new Set<number>();
    excluded.add(editingItemId);
    const editIdx = flat.findIndex(i => i.id === editingItemId);
    if (editIdx >= 0) {
      const editDepth = flat[editIdx].depth;
      for (let j = editIdx + 1; j < flat.length; j++) {
        if (flat[j].depth <= editDepth) break;
        excluded.add(flat[j].id);
      }
    }
    return flat.filter(i => !excluded.has(i.id));
  }
</script>

<div class="page-header">
  <h1>Menus</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Menu</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div style="display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem;">
  <div class="card" style="padding: 0.5rem;">
    {#each menus as menu}
      <button class="nav-item" style="width: 100%; text-align: left; background: {selectedMenu?.id === menu.id ? 'var(--c-bg)' : 'transparent'}; border: none; font-family: var(--font); cursor: pointer; padding: 0.5rem 0.75rem; border-radius: var(--radius); color: var(--c-text); font-weight: {selectedMenu?.id === menu.id ? '600' : '400'}; border-left: 3px solid {selectedMenu?.id === menu.id ? 'var(--c-primary)' : 'transparent'};" onclick={() => loadMenu(menu.id)}>
        {menu.name}
      </button>
    {/each}
  </div>

  <div>
    {#if selectedMenu}
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1.1rem;">{selectedMenu.name}</h2>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline" onclick={() => showAddItem = true}>+ Add Item</button>
            <button class="btn btn-sm btn-danger" onclick={() => deleteMenu(selectedMenu.id)}>Delete Menu</button>
          </div>
        </div>
      </div>

      <SortableList items={flatMenuItems()} onReorder={reorderMenuItems}>
        {#snippet children(item, i)}
          {#if editingItemId === item.id}
            <div style="padding: 0.75rem;">
              <div class="form-grid" style="margin-bottom: 0.5rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.75rem;">Title</label>
                  <input class="form-control" bind:value={editItem.title} />
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label style="font-size: 0.75rem;">Link to Page</label>
                  <PageSearch
                    bind:value={editItem.pageId}
                    bind:selectedTitle={editItemPageTitle}
                    placeholder="Search pages..."
                    onselect={(pg) => {
                      if (pg) editItem.url = '';
                    }}
                  />
                </div>
              </div>
              {#if !editItem.pageId}
                <div class="form-group" style="margin-bottom: 0.5rem;">
                  <label style="font-size: 0.75rem;">Custom URL</label>
                  <input class="form-control" bind:value={editItem.url} placeholder="/path or https://..." />
                </div>
              {/if}
              <div class="form-group" style="margin-bottom: 0.5rem;">
                <label style="font-size: 0.75rem;">Parent Item</label>
                <select class="form-control" value={editItem.parentId ?? ''} onchange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  editItem.parentId = val ? parseInt(val, 10) : null;
                }}>
                  <option value="">— Top Level —</option>
                  {#each editableParentOptions() as opt}
                    <option value={opt.id}>{'—'.repeat(opt.depth)} {opt.title}</option>
                  {/each}
                </select>
              </div>
              <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button class="btn btn-sm btn-outline" onclick={cancelEdit}>Cancel</button>
                <button class="btn btn-sm btn-primary" onclick={saveEdit}>Save</button>
              </div>
            </div>
          {:else}
            {@const flat = flatMenuItems()}
            <div class="menu-item-row" style="background: {item.depth > 0 ? `color-mix(in srgb, var(--c-accent, #2563eb), transparent ${97 - item.depth * 2}%)` : 'transparent'};">
              <div class="menu-item-nesting">
                <button
                  class="btn-icon menu-nest-btn"
                  disabled={!canOutdent(flat, i)}
                  onclick={() => outdentItem(flat, i)}
                  aria-label="Outdent {item.title}"
                  title="Move left (outdent)"
                >&larr;</button>
                <button
                  class="btn-icon menu-nest-btn"
                  disabled={!canIndent(flat, i)}
                  onclick={() => indentItem(flat, i)}
                  aria-label="Indent {item.title}"
                  title="Move right (indent)"
                >&rarr;</button>
              </div>
              <span class="menu-item-label" style="padding-left: {item.depth * 2}rem;">
                {#if item.hasChildren}
                  <span class="menu-tree-icon">&#9656;</span>
                {:else if item.depth > 0}
                  <span class="menu-tree-icon" style="color: var(--c-border);">&middot;</span>
                {/if}
                {item.title}
                {#if item.depth > 0}
                  <span class="menu-depth-badge">L{item.depth}</span>
                {/if}
              </span>
              <span class="menu-item-url">
                {#if item.pageSlug}
                  /{item.pageSlug}
                {:else}
                  {item.url || '-'}
                {/if}
              </span>
              <button class="btn btn-sm btn-outline" onclick={() => startEdit(item)}>Edit</button>
              <button class="btn btn-sm btn-danger" onclick={() => deleteItem(item.id)}>Delete</button>
            </div>
          {/if}
        {/snippet}
      </SortableList>
    {:else}
      <div class="empty-state"><p>Select a menu from the left</p></div>
    {/if}
  </div>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog" aria-modal="true" aria-labelledby="new-menu-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showCreate = false}>
      <div class="modal-header"><h2 id="new-menu-title">New Menu</h2><button class="btn-icon" onclick={() => showCreate = false} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createMenu(); }}>
        <div class="form-group"><label>Name</label><input class="form-control" bind:value={newMenu.name} required /></div>
        <div class="form-group"><label>Slug</label><input class="form-control" bind:value={newMenu.slug} required /></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showAddItem}
  <div class="modal-overlay" onclick={() => showAddItem = false} role="dialog" aria-modal="true" aria-labelledby="add-menu-item-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showAddItem = false}>
      <div class="modal-header"><h2 id="add-menu-item-title">Add Menu Item</h2><button class="btn-icon" onclick={() => showAddItem = false} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); addItem(); }}>
        <div class="form-group"><label>Title</label><input class="form-control" bind:value={newItem.title} required /></div>
        <div class="form-group">
          <label>Link to Page</label>
          <PageSearch
            bind:value={newItem.pageId}
            bind:selectedTitle={newItemPageTitle}
            placeholder="Search pages..."
            onselect={(pg) => {
              if (pg) {
                if (!newItem.title) newItem.title = pg.title;
                newItem.url = '';
              }
            }}
          />
        </div>
        {#if !newItem.pageId}
          <div class="form-group"><label>Custom URL</label><input class="form-control" bind:value={newItem.url} placeholder="/path or https://..." /></div>
        {/if}
        <div class="form-group">
          <label>Parent Item</label>
          <select class="form-control" value={newItem.parentId ?? ''} onchange={(e) => {
            const val = (e.target as HTMLSelectElement).value;
            newItem.parentId = val ? parseInt(val, 10) : null;
          }}>
            <option value="">— Top Level —</option>
            {#each flatMenuItems() as item}
              <option value={item.id}>{'—'.repeat(item.depth)} {item.title}</option>
            {/each}
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showAddItem = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .menu-item-row {
    display: flex;
    align-items: center;
    padding: 0.6rem 0.75rem;
    gap: 0.5rem;
  }

  .menu-item-nesting {
    display: flex;
    gap: 0.15rem;
    flex-shrink: 0;
  }

  .menu-nest-btn {
    width: 1.6rem;
    height: 1.6rem;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--c-border);
    border-radius: var(--radius, 4px);
    background: var(--c-surface);
    color: var(--c-text);
    cursor: pointer;
    transition: all 0.15s;
  }

  .menu-nest-btn:hover:not(:disabled) {
    background: var(--c-bg-alt);
    border-color: var(--c-text-light);
  }

  .menu-nest-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }

  .menu-item-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    font-size: 0.9rem;
    min-width: 0;
  }

  .menu-tree-icon {
    font-size: 0.75rem;
    width: 1rem;
    text-align: center;
    flex-shrink: 0;
    color: var(--c-text-light);
  }

  .menu-depth-badge {
    font-size: 0.6rem;
    padding: 0.05rem 0.35rem;
    background: var(--c-bg-subtle, var(--c-bg-alt));
    color: var(--c-text-light);
    border-radius: 999px;
    flex-shrink: 0;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .menu-item-url {
    color: var(--c-text-light);
    font-size: 0.85rem;
    min-width: 120px;
  }
</style>
