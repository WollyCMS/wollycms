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
      // Ensure nested objects exist for binding
      if (!config.ai) config.ai = { provider: '', apiKey: '', model: '', baseUrl: '' };
      if (!config.workflow) config.workflow = { stages: [] };
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
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Admin Branding</h2>
    <div class="form-group">
      <label>Admin Panel Name</label>
      <input class="form-control" bind:value={config.adminBrandName} placeholder="WollyCMS" />
      <p style="font-size: 0.8rem; color: var(--c-text-light); margin-top: 0.25rem;">
        Displayed in the top-left corner of the admin panel. Leave empty to use "WollyCMS".
      </p>
    </div>

    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--c-border);" />
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">AI Provider</h2>
    <p style="font-size: 0.85rem; color: var(--c-text-light); margin-bottom: 0.75rem;">
      Connect an AI model for content suggestions, alt text generation, and SEO descriptions.
    </p>
    <div class="form-group">
      <label>Provider</label>
      <select class="form-control" style="max-width: 200px;" bind:value={config.ai.provider}>
        <option value="">None (disabled)</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic (Claude)</option>
        <option value="gemini">Google Gemini</option>
        <option value="ollama">Ollama (local)</option>
        <option value="custom">Custom (OpenAI-compatible)</option>
      </select>
    </div>
    {#if config.ai?.provider}
      {#if config.ai.provider !== 'ollama'}
        <div class="form-group">
          <label>API Key</label>
          <input class="form-control" type="password" bind:value={config.ai.apiKey} placeholder="sk-..." autocomplete="off" />
        </div>
      {/if}
      <div class="form-group">
        <label>Model</label>
        <input class="form-control" bind:value={config.ai.model} placeholder={
          config.ai.provider === 'openai' ? 'gpt-4o' :
          config.ai.provider === 'anthropic' ? 'claude-sonnet-4-20250514' :
          config.ai.provider === 'gemini' ? 'gemini-2.0-flash' :
          config.ai.provider === 'ollama' ? 'llama3.2' : 'model-name'
        } />
      </div>
      {#if config.ai.provider === 'ollama' || config.ai.provider === 'custom'}
        <div class="form-group">
          <label>Base URL</label>
          <input class="form-control" bind:value={config.ai.baseUrl} placeholder={config.ai.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.example.com'} />
        </div>
      {/if}
    {/if}

    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--c-border);" />
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Localization</h2>
    <div class="form-group">
      <label>Default Locale</label>
      <select class="form-control" bind:value={config.defaultLocale} style="max-width: 200px;">
        {#each (config.supportedLocales || ['en']) as loc}
          <option value={loc}>{loc}</option>
        {/each}
      </select>
      <p style="font-size: 0.8rem; color: var(--c-text-light); margin-top: 0.25rem;">
        Used when no locale is specified in API requests.
      </p>
    </div>
    <div class="form-group">
      <label>Supported Locales</label>
      <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.5rem;">
        {#each (config.supportedLocales || ['en']) as loc, i}
          <span style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; background: var(--c-bg-subtle); border-radius: var(--radius); font-size: 0.85rem;">
            {loc}
            {#if config.supportedLocales.length > 1}
              <button
                type="button"
                style="background: none; border: none; cursor: pointer; color: var(--c-text-light); font-size: 0.75rem; padding: 0;"
                onclick={() => {
                  config.supportedLocales = config.supportedLocales.filter((_: string, j: number) => j !== i);
                  if (config.defaultLocale === loc) config.defaultLocale = config.supportedLocales[0];
                }}
                aria-label="Remove {loc}"
              >&times;</button>
            {/if}
          </span>
        {/each}
      </div>
      <div style="display: flex; gap: 0.35rem; align-items: center;">
        <input
          class="form-control"
          placeholder="e.g. es, fr, de"
          style="max-width: 120px; font-size: 0.85rem;"
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const input = e.target as HTMLInputElement;
              const val = input.value.trim().toLowerCase();
              if (val && val.length >= 2 && !config.supportedLocales.includes(val)) {
                config.supportedLocales = [...config.supportedLocales, val];
                input.value = '';
              }
            }
          }}
        />
        <span style="font-size: 0.75rem; color: var(--c-text-light);">Press Enter to add</span>
      </div>
    </div>

    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid var(--c-border);" />
    <h2 style="font-size: 1.1rem; margin-bottom: 1rem;">Workflow</h2>
    <p style="font-size: 0.85rem; color: var(--c-text-light); margin-bottom: 0.75rem;">
      Define the stages content goes through before publishing. Each stage has allowed transitions and optional role requirements.
    </p>
    {#each (config.workflow?.stages || []) as stage, i}
      <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; padding: 0.5rem; background: var(--c-bg-subtle); border-radius: var(--radius);">
        <input class="form-control" style="max-width: 100px; font-size: 0.85rem;" bind:value={stage.slug} placeholder="slug" />
        <input class="form-control" style="max-width: 120px; font-size: 0.85rem;" bind:value={stage.label} placeholder="Label" />
        <input type="color" style="width: 32px; height: 32px; border: none; cursor: pointer; border-radius: 4px;" bind:value={stage.color} />
        <select class="form-control" style="max-width: 100px; font-size: 0.85rem;" bind:value={stage.requiredRole}>
          <option value={null}>Any role</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
        {#if !['draft', 'published'].includes(stage.slug)}
          <button
            type="button"
            class="btn-icon"
            style="color: var(--c-danger);"
            onclick={() => { config.workflow.stages = config.workflow.stages.filter((_: any, j: number) => j !== i); }}
            aria-label="Remove stage"
          >&times;</button>
        {/if}
      </div>
    {/each}
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => {
        if (!config.workflow) config.workflow = { stages: [] };
        const newSlug = 'review_' + Date.now().toString(36);
        config.workflow.stages = [
          ...config.workflow.stages.slice(0, -1),
          { slug: newSlug, label: 'New Stage', color: '#805ad5', transitions: ['draft', 'published'], requiredRole: null },
          ...config.workflow.stages.slice(-1),
        ];
      }}
    >+ Add Stage</button>
    <p style="font-size: 0.75rem; color: var(--c-text-light); margin-top: 0.5rem;">
      "draft" and "published" are required stages. Add custom stages between them (e.g., In Review, Approved). Transition rules are configured via the API.
    </p>

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
