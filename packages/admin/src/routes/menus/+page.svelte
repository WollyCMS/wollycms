<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let menus = $state<any[]>([]);
  let selectedMenu = $state<any>(null);
  let error = $state('');
  let showCreate = $state(false);
  let newMenu = $state({ name: '', slug: '' });
  let showAddItem = $state(false);
  let newItem = $state({ title: '', url: '', parentId: null as number | null });

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/menus');
      menus = res.data;
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
      await api.post(`/menus/${selectedMenu.id}/items`, newItem);
      showAddItem = false;
      newItem = { title: '', url: '', parentId: null };
      loadMenu(selectedMenu.id);
    } catch (err: any) { error = err.message; }
  }

  async function deleteItem(itemId: number) {
    if (!selectedMenu || !confirm('Delete this menu item?')) return;
    try {
      await api.del(`/menus/${selectedMenu.id}/items/${itemId}`);
      loadMenu(selectedMenu.id);
    } catch (err: any) { error = err.message; }
  }

  function renderItems(items: any[], depth: number = 0): any[] {
    const flat: any[] = [];
    for (const item of items) {
      flat.push({ ...item, depth });
      if (item.children?.length > 0) flat.push(...renderItems(item.children, depth + 1));
    }
    return flat;
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
      <button class="nav-item" style="width: 100%; text-align: left; background: {selectedMenu?.id === menu.id ? 'var(--c-bg)' : 'none'}; border: none; font-family: var(--font); cursor: pointer; padding: 0.5rem 0.75rem; border-radius: var(--radius);" onclick={() => loadMenu(menu.id)}>
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

      <div class="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>URL</th><th></th></tr></thead>
          <tbody>
            {#each renderItems(selectedMenu.items || []) as item}
              <tr>
                <td style="padding-left: {1 + item.depth * 1.5}rem;">{item.title}</td>
                <td style="color: var(--c-text-light);">{item.url || item.pageSlug || '-'}</td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-danger" onclick={() => deleteItem(item.id)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="empty-state"><p>Select a menu from the left</p></div>
    {/if}
  </div>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header"><h2>New Menu</h2><button class="btn-icon" onclick={() => showCreate = false}>✕</button></div>
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
  <div class="modal-overlay" onclick={() => showAddItem = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header"><h2>Add Menu Item</h2><button class="btn-icon" onclick={() => showAddItem = false}>✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); addItem(); }}>
        <div class="form-group"><label>Title</label><input class="form-control" bind:value={newItem.title} required /></div>
        <div class="form-group"><label>URL</label><input class="form-control" bind:value={newItem.url} placeholder="/path or https://..." /></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showAddItem = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </form>
    </div>
  </div>
{/if}
