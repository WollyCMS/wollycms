<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let redirects = $state<any[]>([]);
  let filteredRedirects = $derived(
    search ? redirects.filter((r) =>
      r.fromPath.toLowerCase().includes(search.toLowerCase()) ||
      r.toPath.toLowerCase().includes(search.toLowerCase())
    ) : redirects
  );
  let error = $state('');
  let search = $state('');
  let showCreate = $state(false);
  let newRedirect = $state({ fromPath: '', toPath: '', statusCode: 301 });

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/redirects');
      redirects = res.data;
    } catch (err: any) { error = err.message; }
  }

  onMount(load);

  async function createRedirect() {
    try {
      await api.post('/redirects', newRedirect);
      showCreate = false;
      newRedirect = { fromPath: '', toPath: '', statusCode: 301 };
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteRedirect(id: number) {
    if (!confirm('Delete this redirect?')) return;
    try { await api.del(`/redirects/${id}`); load(); }
    catch (err: any) { error = err.message; }
  }

  async function toggleActive(r: any) {
    try {
      await api.put(`/redirects/${r.id}`, { isActive: !r.isActive });
      load();
    } catch (err: any) { error = err.message; }
  }
</script>

<div class="page-header">
  <h1>Redirects ({filteredRedirects.length}{search ? ` of ${redirects.length}` : ''})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Redirect</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="card" style="margin-bottom: 1rem;">
  <input class="form-control" placeholder="Search redirects..." bind:value={search} style="max-width: 300px;" />
</div>

<div class="table-wrap">
  <table>
    <thead><tr><th>From</th><th>To</th><th>Status</th><th>Active</th><th></th></tr></thead>
    <tbody>
      {#each filteredRedirects as r}
        <tr>
          <td><code>{r.fromPath}</code></td>
          <td><code>{r.toPath}</code></td>
          <td>{r.statusCode}</td>
          <td>
            <button class="btn btn-sm" class:btn-outline={!r.isActive} class:btn-primary={r.isActive} onclick={() => toggleActive(r)}>
              {r.isActive ? 'Active' : 'Inactive'}
            </button>
          </td>
          <td style="text-align: right;"><button class="btn btn-sm btn-danger" onclick={() => deleteRedirect(r.id)}>Delete</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog" aria-modal="true" aria-labelledby="new-redirect-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showCreate = false}>
      <div class="modal-header"><h2 id="new-redirect-title">New Redirect</h2><button class="btn-icon" onclick={() => showCreate = false} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createRedirect(); }}>
        <div class="form-group"><label>From Path</label><input class="form-control" bind:value={newRedirect.fromPath} placeholder="/old-path" required /></div>
        <div class="form-group"><label>To Path</label><input class="form-control" bind:value={newRedirect.toPath} placeholder="/new-path" required /></div>
        <div class="form-group">
          <label>Status Code</label>
          <select class="form-control" bind:value={newRedirect.statusCode}>
            <option value={301}>301 (Permanent)</option>
            <option value={302}>302 (Temporary)</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  </div>
{/if}
