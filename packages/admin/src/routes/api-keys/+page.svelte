<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';

  let keys = $state<any[]>([]);
  let showCreate = $state(false);
  let newKeyResult = $state<string | null>(null);
  let form = $state({ name: '', permissions: 'content:read', expiresAt: '' });

  const permissionOptions = [
    { value: 'content:read', label: 'Content Read (build pipelines)' },
    { value: 'content:read,admin:read', label: 'Content + Admin Read' },
    { value: '*', label: 'Full Access' },
  ];

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/api-keys');
      keys = res.data;
    } catch (err: any) { toast.error(err.message); }
  }

  onMount(load);

  async function create() {
    try {
      const res = await api.post<{ data: any }>('/api-keys', {
        ...form,
        expiresAt: form.expiresAt || null,
      });
      newKeyResult = res.data.key;
      toast.success('API key created. Copy it now — it won\'t be shown again.');
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function revokeKey(id: number) {
    if (!confirm('Revoke this API key? Any services using it will lose access.')) return;
    try { await api.del(`/api-keys/${id}`); toast.success('API key revoked.'); load(); }
    catch (err: any) { toast.error(err.message); }
  }

  function copyKey() {
    if (newKeyResult) {
      navigator.clipboard.writeText(newKeyResult);
      toast.success('API key copied to clipboard.');
    }
  }
</script>

<div class="page-header">
  <h1>API Keys</h1>
  <button class="btn btn-primary" onclick={() => { form = { name: '', permissions: 'content:read', expiresAt: '' }; newKeyResult = null; showCreate = true; }}>+ New Key</button>
</div>

{#if keys.length === 0}
  <div class="card"><div class="empty-state"><p>No API keys. Create keys for build pipelines and external services.</p></div></div>
{:else}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Name</th><th>Key</th><th>Permissions</th><th>Expires</th><th>Last Used</th><th></th></tr></thead>
      <tbody>
        {#each keys as key}
          <tr>
            <td><strong>{key.name}</strong></td>
            <td class="mono" style="color: var(--c-text-light);">{key.keyPrefix}...</td>
            <td style="font-size: 0.85rem;">{key.permissions}</td>
            <td style="font-size: 0.85rem;">{key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}</td>
            <td style="font-size: 0.85rem; color: var(--c-text-light);">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</td>
            <td style="text-align: right;">
              <button class="btn btn-sm btn-danger" onclick={() => revokeKey(key.id)}>Revoke</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>New API Key</h2>
        <button class="btn-icon" onclick={() => showCreate = false}>&#10005;</button>
      </div>
      {#if newKeyResult}
        <div class="modal-body">
          <div class="alert alert-success" style="margin-bottom: 0.75rem;">
            Copy this key now. It won't be shown again.
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input class="form-control mono" value={newKeyResult} readonly style="flex: 1; font-size: 0.8rem;" />
            <button class="btn btn-primary" onclick={copyKey}>Copy</button>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick={() => showCreate = false}>Done</button>
          </div>
        </div>
      {:else}
        <form class="modal-body" onsubmit={(e) => { e.preventDefault(); create(); }}>
          <div class="form-group">
            <label>Name</label>
            <input class="form-control" bind:value={form.name} placeholder="e.g. Astro Build Pipeline" required />
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <select class="form-control" bind:value={form.permissions}>
              {#each permissionOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
          <div class="form-group">
            <label>Expires (optional)</label>
            <input class="form-control" type="date" bind:value={form.expiresAt} />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
            <button type="submit" class="btn btn-primary">Create Key</button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}
