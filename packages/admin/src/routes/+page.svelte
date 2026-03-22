<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { api } from '$lib/api.js';
  import { FilePlus, Upload, ExternalLink } from 'lucide-svelte';

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

<div class="quick-actions">
  <a href="{base}/pages" class="quick-action-card" style="--qa-color: var(--c-accent, #3182ce);">
    <span class="qa-icon"><FilePlus size={22} /></span>
    <span class="qa-label">New Page</span>
  </a>
  <a href="{base}/media" class="quick-action-card" style="--qa-color: var(--c-success, #38a169);">
    <span class="qa-icon"><Upload size={22} /></span>
    <span class="qa-label">Upload Media</span>
  </a>
  <a href="http://localhost:4322" target="_blank" rel="noopener" class="quick-action-card" style="--qa-color: var(--c-warning, #d69e2e);">
    <span class="qa-icon"><ExternalLink size={22} /></span>
    <span class="qa-label">View Site</span>
  </a>
</div>

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
{:else if !error}
  <div class="stats-grid">
    {#each Array(7) as _}
      <div class="stat-card">
        <div class="skeleton skeleton-title" style="width: 50%;"></div>
        <div class="skeleton skeleton-text" style="width: 70%;"></div>
      </div>
    {/each}
  </div>
{/if}

<div class="card">
  <h2 style="margin-bottom: 1rem; font-size: 1.1rem;">Recently Updated Pages</h2>
  {#if stats && recentPages.length > 0}
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
              <td><a href="{base}/pages/{page.id}"><strong>{page.title}</strong></a></td>
              <td>{page.typeName}</td>
              <td><span class="badge badge-{page.status}">{page.status}</span></td>
              <td>{new Date(page.updatedAt).toLocaleDateString()}</td>
              <td><a href="{base}/pages/{page.id}" class="btn btn-sm btn-outline">Edit</a></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if stats && recentPages.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon"><FilePlus size={40} /></div>
      <div class="empty-state-title">No pages yet</div>
      <p>Create your first page to get started.</p>
      <a href="{base}/pages" class="btn btn-primary" style="margin-top: 0.5rem;">Go to Pages</a>
    </div>
  {:else if !error}
    <div>
      {#each Array(5) as _}
        <div class="skeleton skeleton-row" style="margin-bottom: 1px;"></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .quick-action-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: var(--c-surface, #fff);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    box-shadow: var(--shadow);
    text-decoration: none;
    color: var(--c-text, #2d3748);
    transition: all 0.15s;
    cursor: pointer;
  }

  .quick-action-card:hover {
    border-color: var(--qa-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  .qa-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--qa-color) 10%, transparent);
    color: var(--qa-color);
    flex-shrink: 0;
  }

  .qa-label {
    font-size: 0.95rem;
    font-weight: 600;
  }
</style>
