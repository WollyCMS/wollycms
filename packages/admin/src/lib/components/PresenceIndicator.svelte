<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api.js';

  let {
    pageId,
  }: {
    pageId: string;
  } = $props();

  let editors = $state<{ userId: number; name: string; email: string }[]>([]);
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const HEARTBEAT_INTERVAL = 10_000; // 10 seconds
  const POLL_INTERVAL = 10_000;

  async function sendHeartbeat() {
    try {
      await api.post('/presence/heartbeat', { pageId: parseInt(pageId, 10) });
    } catch { /* ignore */ }
  }

  async function pollPresence() {
    try {
      const res = await api.get<{ data: typeof editors }>(`/presence/${pageId}`);
      editors = res.data;
    } catch { editors = []; }
  }

  async function leave() {
    try {
      await api.del(`/presence/${pageId}`);
    } catch { /* ignore */ }
  }

  onMount(() => {
    sendHeartbeat();
    pollPresence();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    pollTimer = setInterval(pollPresence, POLL_INTERVAL);
  });

  onDestroy(() => {
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);
    leave();
  });

  function getInitials(name: string): string {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
  function getColor(userId: number): string {
    return colors[userId % colors.length];
  }
</script>

{#if editors.length > 0}
  <div class="presence" title={editors.map(e => `${e.name} is also editing`).join('\n')}>
    <span class="presence-dot"></span>
    <div class="presence-avatars">
      {#each editors as editor}
        <span class="presence-avatar" style="background: {getColor(editor.userId)}" title="{editor.name} ({editor.email})">
          {getInitials(editor.name)}
        </span>
      {/each}
    </div>
    <span class="presence-text">
      {editors.length === 1 ? `${editors[0].name} is also editing` : `${editors.length} others editing`}
    </span>
  </div>
{/if}

<style>
  .presence {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    background: color-mix(in srgb, var(--c-warning), transparent 85%);
    border: 1px solid color-mix(in srgb, var(--c-warning), transparent 60%);
    border-radius: var(--radius, 6px);
    font-size: 0.78rem;
  }

  .presence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--c-success);
    flex-shrink: 0;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .presence-avatars {
    display: flex;
    gap: 0;
  }

  .presence-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: white;
    font-size: 0.6rem;
    font-weight: 700;
    border: 2px solid var(--c-surface);
    margin-right: -6px;
  }

  .presence-avatar:last-child {
    margin-right: 0;
  }

  .presence-text {
    color: var(--c-warning);
    font-weight: 500;
    white-space: nowrap;
  }
</style>
