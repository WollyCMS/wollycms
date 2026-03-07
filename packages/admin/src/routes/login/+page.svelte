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

  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      const result = await api.login(email, password);
      auth.user = result.user;
      goto(`${base}/`);
    } catch (err: any) {
      error = err.message || 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-page">
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
</style>
