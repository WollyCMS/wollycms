<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { getAuth } from '$lib/auth.svelte.js';
  import { api } from '$lib/api.js';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
  import GlobalSearch from '$lib/components/GlobalSearch.svelte';
  import {
    LayoutDashboard, FileText, Blocks, Image, Menu, Tags,
    CornerDownRight, ClipboardList, Square, Users, Settings,
    Webhook, KeyRound, ScrollText,
  } from 'lucide-svelte';
  import '../app.css';

  let { children } = $props();
  const auth = getAuth();
  const isPublicPage = $derived(
    $page.url.pathname === `${base}/login` || $page.url.pathname === `${base}/setup`,
  );
  let needsSetup = $state(false);
  let showShortcuts = $state(false);
  let navCounts = $state<Record<string, number>>({});

  onMount(async () => {
    try {
      const res = await fetch('/api/admin/setup/status');
      const json = await res.json();
      needsSetup = json.data?.needsSetup ?? false;
    } catch { /* assume setup done if check fails */ }

    if (needsSetup) {
      if ($page.url.pathname !== `${base}/setup`) goto(`${base}/setup`);
      return;
    }

    await auth.load();
    if (!auth.user && !isPublicPage) {
      goto(`${base}/login`);
    }
    if (auth.user) {
      loadNavCounts();
    }
  });

  $effect(() => {
    if (needsSetup && $page.url.pathname !== `${base}/setup`) {
      goto(`${base}/setup`);
      return;
    }
    if (auth.loaded && !auth.user && !isPublicPage && !needsSetup) {
      goto(`${base}/login`);
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
        { href: '/webhooks', label: 'Webhooks', icon: Webhook },
        { href: '/api-keys', label: 'API Keys', icon: KeyRound },
        { href: '/audit-logs', label: 'Audit Log', icon: ScrollText },
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

{#if !auth.loaded && !needsSetup}
  <div class="loading">Loading...</div>
{:else if isPublicPage || needsSetup || !auth.user}
  {@render children()}
{:else}
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div class="admin-layout">
    <aside class="sidebar" aria-label="Admin navigation">
      <div class="sidebar-header">
        <a href="{base}/" class="logo" aria-label="WollyCMS Dashboard">
          <span class="logo-icon" aria-hidden="true">S</span>
          <span class="logo-text">WollyCMS</span>
        </a>
      </div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        {#each navSections as section}
          {#if section.label}
            <div class="nav-section-label" aria-hidden="true">{section.label}</div>
          {/if}
          {#each section.items as item}
            <a
              href="{base}{item.href}"
              class="nav-item"
              class:active={$page.url.pathname === `${base}${item.href}` || ($page.url.pathname.startsWith(`${base}${item.href}/`) && item.href !== '/')}
              title={item.label}
              aria-current={$page.url.pathname === `${base}${item.href}` ? 'page' : undefined}
            >
              <span class="nav-icon" aria-hidden="true"><item.icon size={18} /></span>
              <span class="nav-label">{item.label}</span>
              {#if navCounts[item.href] != null}
                <span class="nav-badge" aria-label="{navCounts[item.href]} items">{navCounts[item.href]}</span>
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
    <main class="main-content" id="main-content">
      <div class="main-header">
        <GlobalSearch />
      </div>
      {@render children()}
    </main>
  </div>
{/if}

<ToastContainer />
<KeyboardShortcuts visible={showShortcuts} onClose={() => showShortcuts = false} />
