<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';

  let config = $state<any>(null);
  let error = $state('');
  let saving = $state(false);
  let importing = $state(false);

  let alert = $state<{ message: string; severity: string; isActive: boolean }>({
    message: '',
    severity: 'warning',
    isActive: false,
  });
  let alertSaving = $state(false);

  onMount(async () => {
    try {
      const [configRes, alertRes] = await Promise.all([
        api.get<{ data: any }>('/config'),
        api.get<{ data: any }>('/alerts'),
      ]);
      config = configRes.data;
      if (alertRes.data) {
        alert = {
          message: alertRes.data.message ?? '',
          severity: alertRes.data.severity ?? 'warning',
          isActive: alertRes.data.isActive ?? false,
        };
      }
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

  async function saveAlert() {
    alertSaving = true;
    error = '';
    try {
      const res = await api.put<{ data: any }>('/alerts', alert);
      if (res.data) {
        alert = {
          message: res.data.message ?? '',
          severity: res.data.severity ?? 'warning',
          isActive: res.data.isActive ?? false,
        };
      }
      toast.success('Alert saved.');
    } catch (err: any) { error = err.message; }
    finally { alertSaving = false; }
  }

  const severityColors: Record<string, string> = {
    info: '#3b82f6',
    warning: '#f59e0b',
    emergency: '#ef4444',
  };
</script>

<div class="page-header">
  <h1>Settings</h1>
  <button class="btn btn-primary" onclick={save} disabled={saving}>
    {saving ? 'Saving...' : 'Save Settings'}
  </button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="card" style="max-width: 600px; border-left: 4px solid {severityColors[alert.severity] || '#f59e0b'};">
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
    <h2 style="font-size: 1.1rem; margin: 0;">Site Alert</h2>
    <label class="toggle-switch" style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-size: 0.85rem; font-weight: 600; color: {alert.isActive ? '#16a34a' : 'var(--c-text-light)'};">
        {alert.isActive ? 'Active' : 'Inactive'}
      </span>
      <span
        class="toggle-track"
        style="
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
          background: {alert.isActive ? '#16a34a' : '#ccc'};
          border-radius: 13px;
          transition: background 0.2s;
          cursor: pointer;
        "
        onclick={() => { alert.isActive = !alert.isActive; }}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alert.isActive = !alert.isActive; } }}
        role="switch"
        aria-checked={alert.isActive}
        tabindex="0"
      >
        <span style="
          position: absolute;
          top: 3px;
          left: {alert.isActive ? '24px' : '3px'};
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: left 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        "></span>
      </span>
    </label>
  </div>

  <div class="form-group">
    <label>
      Severity
      <span style="
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: {severityColors[alert.severity] || '#f59e0b'};
        margin-left: 0.35rem;
        vertical-align: middle;
      "></span>
    </label>
    <select class="form-control" bind:value={alert.severity}>
      <option value="info">Info (blue)</option>
      <option value="warning">Warning (amber)</option>
      <option value="emergency">Emergency (red)</option>
    </select>
  </div>

  <div class="form-group">
    <label>Message</label>
    <textarea class="form-control" rows="3" bind:value={alert.message} placeholder="Enter alert message..."></textarea>
  </div>

  <button class="btn btn-primary" onclick={saveAlert} disabled={alertSaving}>
    {alertSaving ? 'Saving...' : 'Save Alert'}
  </button>
</div>

{#if config}
  <div class="card" style="max-width: 600px; margin-top: 1.5rem;">
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
