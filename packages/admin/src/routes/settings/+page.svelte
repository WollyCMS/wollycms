<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';

  let config = $state<any>(null);
  let error = $state('');
  let saving = $state(false);
  let importing = $state(false);

  onMount(async () => {
    try {
      const res = await api.get<{ data: any }>('/config');
      config = res.data;
    } catch (err: any) { error = err.message; }
  });

  async function save() {
    saving = true;
    error = '';
    try {
      const res = await api.put<{ data: any }>('/config', config);
      config = res.data;
      toast.success('Settings saved.');
    } catch (err: any) { error = err.message; }
    finally { saving = false; }
  }
</script>

<div class="page-header">
  <h1>Settings</h1>
  <button class="btn btn-primary" onclick={save} disabled={saving}>
    {saving ? 'Saving...' : 'Save Settings'}
  </button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

{#if config}
  <div class="card" style="max-width: 600px;">
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">General</h2>
    <div class="form-group">
      <label>Site Name</label>
      <input class="form-control" bind:value={config.siteName} />
    </div>
    <div class="form-group">
      <label>Tagline</label>
      <input class="form-control" bind:value={config.tagline} />
    </div>
    <div class="form-group">
      <label>Footer Text</label>
      <input class="form-control" bind:value={config.footer.text} />
    </div>

    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--c-border);" />
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Social Links</h2>
    <div class="form-group">
      <label>Facebook</label>
      <input class="form-control" bind:value={config.social.facebook} placeholder="https://facebook.com/..." />
    </div>
    <div class="form-group">
      <label>Twitter / X</label>
      <input class="form-control" bind:value={config.social.twitter} placeholder="https://x.com/..." />
    </div>
    <div class="form-group">
      <label>Instagram</label>
      <input class="form-control" bind:value={config.social.instagram} placeholder="https://instagram.com/..." />
    </div>
  </div>

  <div class="card" style="max-width: 600px; margin-top: 1.5rem;">
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Data Management</h2>
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <button class="btn btn-outline" onclick={() => window.open('/api/admin/export', '_blank')}>Export All Content (JSON)</button>
      <label class="btn btn-outline" style="cursor: pointer;">
        {importing ? 'Importing...' : 'Import Content (JSON)'}
        <input type="file" accept=".json" style="display: none;" onchange={async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          importing = true;
          error = '';
          try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await api.post<{ data: any }>('/import', data);
            const stats = res.data.stats;
            const summary = Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join(', ');
            toast.success(`Import complete. ${summary}`);
          } catch (err: any) {
            error = err.message || 'Import failed';
          } finally {
            importing = false;
            (e.target as HTMLInputElement).value = '';
          }
        }} />
      </label>
    </div>
    <p style="font-size: 0.8rem; color: var(--c-text-light); margin-top: 0.5rem;">
      Export downloads all pages, blocks, menus, taxonomies, and redirects. Import skips existing records (no duplicates).
    </p>
  </div>
{/if}
