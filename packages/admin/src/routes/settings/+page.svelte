<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let config = $state<any>(null);
  let error = $state('');
  let success = $state('');
  let saving = $state(false);

  onMount(async () => {
    try {
      const res = await api.get<{ data: any }>('/config');
      config = res.data;
    } catch (err: any) { error = err.message; }
  });

  async function save() {
    saving = true;
    error = '';
    success = '';
    try {
      const res = await api.put<{ data: any }>('/config', config);
      config = res.data;
      success = 'Settings saved.';
      setTimeout(() => success = '', 3000);
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
{#if success}<div class="alert alert-success">{success}</div>{/if}

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
{/if}
