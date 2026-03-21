<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api } from '$lib/api.js';
  import { getAuth } from '$lib/auth.svelte.js';

  const auth = getAuth();
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  // 2FA state
  let step = $state<'credentials' | '2fa'>('credentials');
  let challengeToken = $state('');
  let code = $state('');
  let useRecovery = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const result = await api.login(email, password);
      if (result.requiresTwoFactor && result.challengeToken) {
        challengeToken = result.challengeToken;
        step = '2fa';
      } else if (result.user) {
        auth.user = result.user;
        goto(`${base}/`);
      }
    } catch (err: any) {
      error = err.message || 'Login failed';
    } finally {
      loading = false;
    }
  }

  async function handleVerify2fa(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const result = await api.verify2fa(challengeToken, code);
      auth.user = result.user;
      goto(`${base}/`);
    } catch (err: any) {
      error = err.message || 'Verification failed';
    } finally {
      loading = false;
    }
  }

  function backToCredentials() {
    step = 'credentials';
    challengeToken = '';
    code = '';
    error = '';
    useRecovery = false;
  }
</script>

<div class="login-page">
  {#if step === 'credentials'}
    <form class="login-form card" onsubmit={handleLogin}>
      <h1>WollyCMS</h1>
      <p class="login-subtitle">Sign in to manage your content</p>

      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" type="email" class="form-control" bind:value={email} required autocomplete="email" />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" type="password" class="form-control" bind:value={password} required autocomplete="current-password" />
      </div>

      <button type="submit" class="btn btn-primary login-btn" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  {:else}
    <form class="login-form card" onsubmit={handleVerify2fa}>
      <h1>Two-Factor Authentication</h1>
      <p class="login-subtitle">
        {useRecovery ? 'Enter a recovery code' : 'Enter the code from your authenticator app'}
      </p>

      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <div class="form-group">
        <label for="code">{useRecovery ? 'Recovery Code' : 'Verification Code'}</label>
        <input
          id="code"
          type="text"
          class="form-control code-input"
          bind:value={code}
          required
          autocomplete="one-time-code"
          placeholder={useRecovery ? 'XXXX-XXXX' : '000000'}
          maxlength={useRecovery ? 9 : 6}
        />
      </div>

      <button type="submit" class="btn btn-primary login-btn" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify'}
      </button>

      <div class="login-links">
        <button type="button" class="btn-link" onclick={() => useRecovery = !useRecovery}>
          {useRecovery ? 'Use authenticator app' : 'Use a recovery code'}
        </button>
        <button type="button" class="btn-link" onclick={backToCredentials}>
          Back to sign in
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .login-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--c-bg);
  }

  .login-form {
    width: 100%;
    max-width: 400px;
    padding: 2.5rem;
  }

  .login-form h1 {
    font-size: 1.5rem;
    text-align: center;
    margin-bottom: 0.25rem;
  }

  .login-subtitle {
    text-align: center;
    color: var(--c-text-light);
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }

  .login-btn {
    width: 100%;
    justify-content: center;
    padding: 0.65rem;
    margin-top: 0.5rem;
  }

  .code-input {
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: 0.3em;
    font-family: monospace;
  }

  .login-links {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--c-primary, #4f46e5);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0;
  }

  .btn-link:hover {
    text-decoration: underline;
  }
</style>
