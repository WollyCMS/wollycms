<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let logs = $state<any[]>([]);
  let total = $state(0);
  let entityFilter = $state('');
  let actionFilter = $state('');
  let offset = $state(0);
  const limit = 50;

  async function load() {
    const params = new URLSearchParams();
    if (entityFilter) params.set('entity', entityFilter);
    if (actionFilter) params.set('action', actionFilter);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    try {
      const res = await api.get<{ data: any[]; meta: any }>(`/audit-logs?${params}`);
      logs = res.data;
      total = res.meta.total;
    } catch { logs = []; }
  }

  onMount(load);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }
</script>

<div class="page-header">
  <h1>Audit Log</h1>
</div>

<div class="card" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center;">
  <select class="form-control" bind:value={entityFilter} onchange={() => { offset = 0; load(); }} style="max-width: 160px;">
    <option value="">All entities</option>
    <option value="page">Pages</option>
    <option value="media">Media</option>
    <option value="webhook">Webhooks</option>
    <option value="api_key">API Keys</option>
    <option value="user">Users</option>
  </select>
  <select class="form-control" bind:value={actionFilter} onchange={() => { offset = 0; load(); }} style="max-width: 160px;">
    <option value="">All actions</option>
    <option value="create">Create</option>
    <option value="update">Update</option>
    <option value="delete">Delete</option>
    <option value="login">Login</option>
  </select>
  <span style="margin-left: auto; font-size: 0.85rem; color: var(--c-text-light);">{total} entries</span>
</div>

{#if logs.length === 0}
  <div class="card"><div class="empty-state"><p>No audit log entries yet.</p></div></div>
{:else}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
      <tbody>
        {#each logs as log}
          <tr>
            <td style="font-size: 0.8rem; white-space: nowrap;">{formatTime(log.createdAt)}</td>
            <td style="font-size: 0.85rem;">{log.userName || '—'}</td>
            <td><span class="badge" class:badge-published={log.action === 'create'} class:badge-draft={log.action === 'update'} class:badge-archived={log.action === 'delete'}>{log.action}</span></td>
            <td style="font-size: 0.85rem;">{log.entity}{log.entityId ? ` #${log.entityId}` : ''}</td>
            <td style="font-size: 0.8rem; color: var(--c-text-light); max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
              {#if log.details}
                {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if total > limit}
    <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 0.75rem;">
      <button class="btn btn-sm btn-outline" disabled={offset === 0} onclick={() => { offset = Math.max(0, offset - limit); load(); }}>Previous</button>
      <span style="padding: 0.25rem 0.5rem; font-size: 0.85rem; color: var(--c-text-light);">
        {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </span>
      <button class="btn btn-sm btn-outline" disabled={offset + limit >= total} onclick={() => { offset += limit; load(); }}>Next</button>
    </div>
  {/if}
{/if}
