<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api, setToken } from '$lib/api.js';
  import { getAuth } from '$lib/auth.svelte.js';

  const auth = getAuth();
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let googleEnabled = $state(false);

  // 2FA state
  let step = $state<'credentials' | '2fa'>('credentials');
  let challengeToken = $state('');
  let code = $state('');
  let useRecovery = $state(false);
  let rememberDevice = $state(true);

  onMount(async () => {
    // Handle OAuth callback token from URL fragment
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.slice(1));
      const oauthToken = params.get('oauth_token');
      const oauthError = params.get('oauth_error');

      // Clear the hash immediately
      history.replaceState(null, '', window.location.pathname);

      if (oauthToken) {
        setToken(oauthToken);
        await auth.load();
        goto(`${base}/`);
        return;
      }

      if (oauthError) {
        const errorMessages: Record<string, string> = {
          access_denied: 'Google sign-in was cancelled',
          missing_params: 'OAuth callback missing required parameters',
          missing_state: 'OAuth session expired — please try again',
          invalid_state: 'OAuth session invalid — please try again',
          state_mismatch: 'OAuth security check failed — please try again',
          token_exchange_failed: 'Could not complete Google sign-in — please try again',
          userinfo_failed: 'Could not retrieve Google account info — please try again',
          email_not_verified: 'Your Google email must be verified to sign in',
          no_account: 'No CMS account matches that Google email — ask an admin to create one',
          user_not_found: 'Account not found',
        };
        error = errorMessages[oauthError] || 'An unknown error occurred during sign-in';
      }
    }

    // Check if Google OAuth is configured
    try {
      const res = await fetch('/api/admin/auth/oauth/providers');
      const data = await res.json();
      googleEnabled = data.data?.google ?? false;
    } catch {
      // OAuth providers endpoint unavailable — hide the button
    }
  });

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
      const result = await api.verify2fa(challengeToken, code, rememberDevice);
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

      {#if googleEnabled}
        <div class="oauth-divider">
          <span>or</span>
        </div>

        <a href="/api/admin/auth/oauth/google" class="btn btn-google">
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </a>
      {/if}
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

      <label class="remember-device">
        <input type="checkbox" bind:checked={rememberDevice} />
        Remember this device for 30 days
      </label>

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

  .oauth-divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.25rem 0;
    color: var(--c-text-light);
    font-size: 0.85rem;
  }

  .oauth-divider::before,
  .oauth-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--c-border, #e2e8f0);
  }

  .btn-google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.6rem 1rem;
    background: white;
    color: #3c4043;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
  }

  .btn-google:hover {
    background: #f8f9fa;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .google-icon {
    flex-shrink: 0;
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

  .remember-device {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--c-text-light);
    cursor: pointer;
    margin-top: 0.75rem;
  }

  .remember-device input {
    cursor: pointer;
  }
</style>
