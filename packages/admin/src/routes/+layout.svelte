<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getAuth } from '$lib/auth.svelte.js';
  import { api } from '$lib/api.js';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
  import {
    LayoutDashboard, FileText, Blocks, Image, Menu, Tags,
    CornerDownRight, ClipboardList, Square, Users, Settings,
  } from 'lucide-svelte';
  import '../app.css';

  let { children } = $props();
  const auth = getAuth();
  const isLogin = $derived($page.url.pathname === '/login');
  let showShortcuts = $state(false);
  let navCounts = $state<Record<string, number>>({});

  onMount(async () => {
    await auth.load();
    if (!auth.user && !isLogin) {
      goto('/login');
    }
    if (auth.user) {
      loadNavCounts();
    }
  });

  $effect(() => {
    if (auth.loaded && !auth.user && !isLogin) {
      goto('/login');
    }
  });

  async function loadNavCounts() {
    try {
      const res = await api.get<{ data: any }>('/dashboard');
      const s = res.data.stats;
      navCounts = {
        '/pages': s.pages,
        '/blocks': s.blocks,
        '/media': s.media,
        '/menus': s.menus,
        '/users': s.users,
      };
    } catch { /* non-critical */ }
  }

  const navSections = [
    {
      items: [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Content',
      items: [
        { href: '/pages', label: 'Pages', icon: FileText },
        { href: '/blocks', label: 'Blocks', icon: Blocks },
        { href: '/media', label: 'Media', icon: Image },
      ],
    },
    {
      label: 'Structure',
      items: [
        { href: '/menus', label: 'Menus', icon: Menu },
        { href: '/taxonomies', label: 'Taxonomies', icon: Tags },
        { href: '/redirects', label: 'Redirects', icon: CornerDownRight },
      ],
    },
    {
      label: 'Schema',
      items: [
        { href: '/content-types', label: 'Content Types', icon: ClipboardList },
        { href: '/block-types', label: 'Block Types', icon: Square },
      ],
    },
    {
      label: 'System',
      items: [
        { href: '/users', label: 'Users', icon: Users },
        { href: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.key === '?' && !isEditing(e)) {
      e.preventDefault();
      showShortcuts = !showShortcuts;
    }
    if (e.key === 'Escape' && showShortcuts) {
      showShortcuts = false;
    }
  }

  function isEditing(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      || target.tagName === 'SELECT' || target.isContentEditable;
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if !auth.loaded}
  <div class="loading">Loading...</div>
{:else if isLogin || !auth.user}
  {@render children()}
{:else}
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <a href="/" class="logo">
          <span class="logo-icon">S</span>
          <span class="logo-text">SpacelyCMS</span>
        </a>
      </div>
      <nav class="sidebar-nav">
        {#each navSections as section}
          {#if section.label}
            <div class="nav-section-label">{section.label}</div>
          {/if}
          {#each section.items as item}
            <a
              href={item.href}
              class="nav-item"
              class:active={$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href + '/') && item.href !== '/')}
              title={item.label}
            >
              <span class="nav-icon"><item.icon size={18} /></span>
              <span class="nav-label">{item.label}</span>
              {#if navCounts[item.href] != null}
                <span class="nav-badge">{navCounts[item.href]}</span>
              {/if}
            </a>
          {/each}
        {/each}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-name">{auth.user.name}</span>
          <span class="user-role">{auth.user.role}</span>
        </div>
        <div class="sidebar-footer-actions">
          <button class="btn-shortcut-hint" onclick={() => showShortcuts = true} title="Keyboard shortcuts">
            <kbd>?</kbd>
          </button>
          <button class="btn-logout" onclick={() => auth.logout()}>Logout</button>
        </div>
      </div>
    </aside>
    <main class="main-content">
      {@render children()}
    </main>
  </div>
{/if}

<ToastContainer />
<KeyboardShortcuts visible={showShortcuts} onClose={() => showShortcuts = false} />
