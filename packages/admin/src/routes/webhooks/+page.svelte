<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let webhooks = $state<any[]>([]);
  let showCreate = $state(false);
  let editId = $state<number | null>(null);
  let form = $state({ name: '', url: '', secret: '', events: ['page.published', 'page.unpublished'], isActive: true });

  const allEvents = [
    'page.published', 'page.unpublished', 'page.created', 'page.updated', 'page.deleted',
    'media.uploaded', 'media.deleted', '*',
  ];

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/webhooks');
      webhooks = res.data;
    } catch (err: any) { toast.error(err.message); }
  }

  onMount(load);

  function resetForm() {
    form = { name: '', url: '', secret: '', events: ['page.published', 'page.unpublished'], isActive: true };
    editId = null;
  }

  async function save() {
    try {
      if (editId) {
        await api.put(`/webhooks/${editId}`, form);
        toast.success('Webhook updated.');
      } else {
        await api.post('/webhooks', form);
        toast.success('Webhook created.');
      }
      showCreate = false;
      resetForm();
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  function startEdit(hook: any) {
    form = { name: hook.name, url: hook.url, secret: '', events: hook.events, isActive: hook.isActive };
    editId = hook.id;
    showCreate = true;
  }

  async function deleteHook(id: number) {
    if (!confirm('Delete this webhook?')) return;
    try { await api.del(`/webhooks/${id}`); toast.success('Webhook deleted.'); load(); }
    catch (err: any) { toast.error(err.message); }
  }

  async function testHook(id: number) {
    try {
      const res = await api.post<{ data: any }>(`/webhooks/${id}/test`);
      toast.success(`Test sent. Status: ${res.data.status}`);
    } catch (err: any) { toast.error(err.message); }
  }

  function toggleEvent(event: string) {
    if (form.events.includes(event)) {
      form.events = form.events.filter(e => e !== event);
    } else {
      form.events = [...form.events, event];
    }
  }
</script>

<div class="page-header">
  <h1>Webhooks</h1>
  <button class="btn btn-primary" onclick={() => { resetForm(); showCreate = true; }}>+ New Webhook</button>
</div>

{#if webhooks.length === 0}
  <div class="card"><div class="empty-state"><p>No webhooks configured. Webhooks notify external services when content changes.</p></div></div>
{:else}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th>Last Triggered</th><th></th></tr></thead>
      <tbody>
        {#each webhooks as hook}
          <tr>
            <td><strong>{hook.name}</strong></td>
            <td class="mono" style="font-size: 0.8rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">{hook.url}</td>
            <td style="font-size: 0.8rem;">{hook.events.join(', ')}</td>
            <td>
              <span class="badge" class:badge-published={hook.isActive} class:badge-archived={!hook.isActive}>
                {hook.isActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td style="font-size: 0.85rem;">
              {#if hook.lastTriggeredAt}
                {new Date(hook.lastTriggeredAt).toLocaleString()}
                {#if hook.lastStatus}<span class="badge" class:badge-published={hook.lastStatus < 300} class:badge-draft={hook.lastStatus >= 300}>{hook.lastStatus}</span>{/if}
              {:else}
                <span style="color: var(--c-text-light);">Never</span>
              {/if}
            </td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-sm btn-outline" onclick={() => testHook(hook.id)}>Test</button>
              <button class="btn btn-sm btn-outline" onclick={() => startEdit(hook)}>Edit</button>
              <button class="btn btn-sm btn-danger" onclick={() => deleteHook(hook.id)}>Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if showCreate}
  <div class="modal-overlay" onclick={() => { showCreate = false; resetForm(); }} role="dialog" aria-labelledby="webhook-modal-title" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => { showCreate = false; resetForm(); }}>
      <div class="modal-header">
        <h2 id="webhook-modal-title">{editId ? 'Edit' : 'New'} Webhook</h2>
        <button class="btn-icon" onclick={() => { showCreate = false; resetForm(); }} aria-label="Close">&#10005;</button>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); save(); }}>
        <div class="form-group">
          <label>Name</label>
          <input class="form-control" bind:value={form.name} placeholder="e.g. Astro Rebuild" required />
        </div>
        <div class="form-group">
          <label>URL</label>
          <input class="form-control" type="url" bind:value={form.url} placeholder="https://..." required />
        </div>
        <div class="form-group">
          <label>Secret (optional, for HMAC signature)</label>
          <input class="form-control" bind:value={form.secret} placeholder="Leave blank to keep existing" />
        </div>
        <div class="form-group">
          <label>Events</label>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            {#each allEvents as event}
              <button type="button" class="btn btn-sm" class:btn-primary={form.events.includes(event)} class:btn-outline={!form.events.includes(event)} onclick={() => toggleEvent(event)}>
                {event}
              </button>
            {/each}
          </div>
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" bind:checked={form.isActive} /> Active
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => { showCreate = false; resetForm(); }}>Cancel</button>
          <button type="submit" class="btn btn-primary">{editId ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
