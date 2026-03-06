<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getAuth } from '$lib/auth.svelte.js';
  import '../app.css';

  let { children } = $props();
  const auth = getAuth();
  const isLogin = $derived($page.url.pathname === '/login');

  onMount(async () => {
    await auth.load();
    if (!auth.user && !isLogin) {
      goto('/login');
    }
  });

  // Redirect on auth state changes
  $effect(() => {
    if (auth.loaded && !auth.user && !isLogin) {
      goto('/login');
    }
  });

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/pages', label: 'Pages', icon: '📄' },
    { href: '/blocks', label: 'Blocks', icon: '🧱' },
    { href: '/media', label: 'Media', icon: '🖼️' },
    { href: '/menus', label: 'Menus', icon: '☰' },
    { href: '/taxonomies', label: 'Taxonomies', icon: '🏷️' },
    { href: '/redirects', label: 'Redirects', icon: '↪️' },
    { href: '/content-types', label: 'Content Types', icon: '📋' },
    { href: '/block-types', label: 'Block Types', icon: '⬛' },
    { href: '/users', label: 'Users', icon: '👤' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];
</script>

{#if !auth.loaded}
  <div class="loading">Loading...</div>
{:else if isLogin || !auth.user}
  {@render children()}
{:else}
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <a href="/" class="logo">SpacelyCMS</a>
      </div>
      <nav class="sidebar-nav">
        {#each navItems as item}
          <a
            href={item.href}
            class="nav-item"
            class:active={$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href + '/') && item.href !== '/')}
          >
            <span class="nav-icon">{item.icon}</span>
            {item.label}
          </a>
        {/each}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-name">{auth.user.name}</span>
          <span class="user-role">{auth.user.role}</span>
        </div>
        <button class="btn-logout" onclick={() => auth.logout()}>Logout</button>
      </div>
    </aside>
    <main class="main-content">
      {@render children()}
    </main>
  </div>
{/if}
