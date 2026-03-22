<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { getAuth } from '$lib/auth.svelte.js';

  const auth = getAuth();

  // 2FA state
  let twoFactorEnabled = $derived(auth.user?.twoFactorEnabled ?? false);
  let hasPassword = $derived(auth.user?.hasPassword ?? true);
  let setupStep = $state<'idle' | 'qr' | 'verify' | 'codes'>('idle');
  let totpSecret = $state('');
  let totpUri = $state('');
  let verifyCode = $state('');
  let recoveryCodes = $state<string[]>([]);
  let password = $state('');
  let error = $state('');
  let success = $state('');
  let loading = $state(false);

  // OAuth state
  interface OAuthConnection {
    id: number;
    provider: string;
    email: string | null;
    name: string | null;
    createdAt: string;
  }
  let oauthConnections = $state<OAuthConnection[]>([]);
  let googleEnabled = $state(false);
  let oauthLoading = $state(false);

  onMount(async () => {
    await Promise.all([loadOAuthConnections(), checkOAuthProviders()]);
  });

  async function checkOAuthProviders() {
    try {
      const res = await fetch('/api/admin/auth/oauth/providers');
      const data = await res.json();
      googleEnabled = data.data?.google ?? false;
    } catch {
      // Ignore
    }
  }

  async function loadOAuthConnections() {
    try {
      const res = await api.get<{ data: OAuthConnection[] }>('/auth/oauth/connections');
      oauthConnections = res.data;
    } catch {
      // Ignore — old server version without OAuth
    }
  }

  async function disconnectOAuth(connectionId: number) {
    oauthLoading = true;
    error = '';
    try {
      await api.del(`/auth/oauth/connections/${connectionId}`);
      oauthConnections = oauthConnections.filter((c) => c.id !== connectionId);
      success = 'Account disconnected.';
      // Refresh user to update oauthProviders
      await auth.load();
    } catch (err: any) {
      error = err.message;
    } finally {
      oauthLoading = false;
    }
  }

  async function startSetup() {
    error = '';
    loading = true;
    try {
      const res = await api.post<{ data: { secret: string; uri: string } }>('/auth/2fa/setup');
      totpSecret = res.data.secret;
      totpUri = res.data.uri;
      setupStep = 'qr';
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function verifySetup(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await api.post<{ data: { recoveryCodes: string[] } }>('/auth/2fa/verify-setup', {
        code: verifyCode,
      });
      recoveryCodes = res.data.recoveryCodes;
      setupStep = 'codes';
      if (auth.user) auth.user = { ...auth.user, twoFactorEnabled: true };
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function disable2fa(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      await api.del('/auth/2fa', { password });
      if (auth.user) auth.user = { ...auth.user, twoFactorEnabled: false };
      password = '';
      success = 'Two-factor authentication disabled.';
      setupStep = 'idle';
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function regenerateCodes(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const res = await api.post<{ data: { recoveryCodes: string[] } }>('/auth/2fa/recovery-codes', {
        password,
      });
      recoveryCodes = res.data.recoveryCodes;
      password = '';
      setupStep = 'codes';
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function finishSetup() {
    setupStep = 'idle';
    recoveryCodes = [];
    verifyCode = '';
    totpSecret = '';
    totpUri = '';
    success = 'Two-factor authentication enabled.';
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    success = 'Recovery codes copied to clipboard.';
  }
</script>

<div class="page-header">
  <h1>Account Security</h1>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}
{#if success}
  <div class="alert alert-success">{success}</div>
{/if}

<!-- Connected Accounts -->
<div class="card">
  <h2>Connected Accounts</h2>

  {#if oauthConnections.length > 0}
    <div class="oauth-list">
      {#each oauthConnections as conn}
        <div class="oauth-item">
          <div class="oauth-item-info">
            <span class="oauth-provider">{conn.provider === 'google' ? 'Google' : conn.provider}</span>
            <span class="oauth-email">{conn.email || 'No email'}</span>
          </div>
          <button
            class="btn btn-outline btn-sm"
            onclick={() => disconnectOAuth(conn.id)}
            disabled={oauthLoading}
          >
            Disconnect
          </button>
        </div>
      {/each}
    </div>
  {:else}
    <p class="muted">No connected accounts.</p>
  {/if}

  {#if googleEnabled && !oauthConnections.some((c) => c.provider === 'google')}
    <a href="/api/admin/auth/oauth/google" class="btn btn-outline oauth-connect-btn">
      Connect Google Account
    </a>
  {/if}
</div>

<!-- Two-Factor Authentication -->
<div class="card">
  <h2>Two-Factor Authentication</h2>

  {#if setupStep === 'idle'}
    {#if twoFactorEnabled}
      <p>Two-factor authentication is <strong>enabled</strong>.</p>

      {#if hasPassword}
        <div class="two-factor-actions">
          <form onsubmit={disable2fa} class="inline-form">
            <div class="form-group">
              <label for="disable-password">Current password to disable</label>
              <input id="disable-password" type="password" class="form-control" bind:value={password} required />
            </div>
            <button type="submit" class="btn btn-danger" disabled={loading}>Disable 2FA</button>
          </form>

          <form onsubmit={regenerateCodes} class="inline-form">
            <div class="form-group">
              <label for="regen-password">Current password to regenerate codes</label>
              <input id="regen-password" type="password" class="form-control" bind:value={password} required />
            </div>
            <button type="submit" class="btn btn-outline" disabled={loading}>Regenerate Recovery Codes</button>
          </form>
        </div>
      {:else}
        <p class="muted">Set a password to manage 2FA settings.</p>
      {/if}
    {:else}
      <p>Add an extra layer of security to your account by enabling two-factor authentication with an authenticator app.</p>
      <button class="btn btn-primary" onclick={startSetup} disabled={loading}>
        {loading ? 'Setting up...' : 'Enable 2FA'}
      </button>
    {/if}

  {:else if setupStep === 'qr'}
    <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.):</p>

    <div class="qr-section">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(totpUri)}" alt="QR Code" class="qr-code" />

      <details class="manual-entry">
        <summary>Can't scan? Enter manually</summary>
        <code class="secret-display">{totpSecret}</code>
      </details>
    </div>

    <form onsubmit={verifySetup}>
      <div class="form-group">
        <label for="verify-code">Enter the 6-digit code from your app</label>
        <input
          id="verify-code"
          type="text"
          class="form-control code-input"
          bind:value={verifyCode}
          required
          autocomplete="one-time-code"
          placeholder="000000"
          maxlength={6}
        />
      </div>
      <div class="btn-group">
        <button type="submit" class="btn btn-primary" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </button>
        <button type="button" class="btn btn-outline" onclick={() => setupStep = 'idle'}>Cancel</button>
      </div>
    </form>

  {:else if setupStep === 'codes'}
    <p><strong>Save these recovery codes.</strong> Each code can only be used once. Store them somewhere safe — you won't be able to see them again.</p>

    <div class="recovery-codes">
      {#each recoveryCodes as code}
        <code class="recovery-code">{code}</code>
      {/each}
    </div>

    <div class="btn-group">
      <button class="btn btn-outline" onclick={copyRecoveryCodes}>Copy All</button>
      <button class="btn btn-primary" onclick={finishSetup}>Done</button>
    </div>
  {/if}
</div>

<style>
  .oauth-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .oauth-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--c-bg);
    border-radius: 6px;
    border: 1px solid var(--c-border, #e2e8f0);
  }

  .oauth-item-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .oauth-provider {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .oauth-email {
    color: var(--c-text-light);
    font-size: 0.8rem;
  }

  .oauth-connect-btn {
    margin-top: 0.75rem;
    display: inline-block;
    text-decoration: none;
  }

  .btn-sm {
    padding: 0.3rem 0.6rem;
    font-size: 0.8rem;
  }

  .muted {
    color: var(--c-text-light);
    font-size: 0.9rem;
  }

  .two-factor-actions {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .inline-form {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
  }

  .inline-form .form-group {
    flex: 1;
    margin-bottom: 0;
  }

  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .qr-code {
    border: 1px solid var(--c-border);
    border-radius: 8px;
    padding: 8px;
    background: white;
  }

  .manual-entry {
    font-size: 0.85rem;
    color: var(--c-text-light);
  }

  .secret-display {
    display: block;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--c-bg);
    border-radius: 4px;
    word-break: break-all;
    font-size: 0.9rem;
    letter-spacing: 0.1em;
  }

  .code-input {
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: 0.3em;
    font-family: monospace;
    max-width: 250px;
  }

  .recovery-codes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .recovery-code {
    padding: 0.5rem;
    background: var(--c-bg);
    border-radius: 4px;
    text-align: center;
    font-size: 0.95rem;
    font-family: monospace;
    letter-spacing: 0.1em;
  }

  .btn-group {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }
</style>
