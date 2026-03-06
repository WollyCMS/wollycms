<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let stats = $state<any>(null);
  let recentPages = $state<any[]>([]);
  let error = $state('');

  onMount(async () => {
    try {
      const res = await api.get<{ data: any }>('/dashboard');
      stats = res.data.stats;
      recentPages = res.data.recentPages;
    } catch (err: any) {
      error = err.message;
    }
  });
</script>

<div class="page-header">
  <h1>Dashboard</h1>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

{#if stats}
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{stats.pages}</div>
      <div class="stat-label">Total Pages</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.published}</div>
      <div class="stat-label">Published</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.drafts}</div>
      <div class="stat-label">Drafts</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.blocks}</div>
      <div class="stat-label">Shared Blocks</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.media}</div>
      <div class="stat-label">Media Files</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.menus}</div>
      <div class="stat-label">Menus</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{stats.users}</div>
      <div class="stat-label">Users</div>
    </div>
  </div>
{/if}

<div class="card">
  <h2 style="margin-bottom: 1rem; font-size: 1.1rem;">Recently Updated Pages</h2>
  {#if recentPages.length > 0}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each recentPages as page}
            <tr>
              <td><strong>{page.title}</strong></td>
              <td>{page.typeName}</td>
              <td><span class="badge badge-{page.status}">{page.status}</span></td>
              <td>{new Date(page.updatedAt).toLocaleDateString()}</td>
              <td><a href="/pages/{page.id}" class="btn btn-sm btn-outline">Edit</a></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state"><p>No pages yet</p></div>
  {/if}
</div>
