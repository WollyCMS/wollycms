<script lang="ts">
  import { getToasts, dismissToast } from '$lib/toast.svelte.js';
  import { CheckCircle, XCircle, Info, X } from 'lucide-svelte';

  const toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
  <div class="toast-container" role="status" aria-live="polite">
    {#each toasts as t (t.id)}
      <div class="toast toast-{t.type}">
        <span class="toast-icon">
          {#if t.type === 'success'}<CheckCircle size={18} />
          {:else if t.type === 'error'}<XCircle size={18} />
          {:else}<Info size={18} />
          {/if}
        </span>
        <span class="toast-message">{t.message}</span>
        <button class="toast-dismiss" onclick={() => dismissToast(t.id)} aria-label="Dismiss notification">
          <X size={14} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.5rem;
    max-width: 380px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    animation: toast-in 0.25s ease-out;
  }

  .toast-success {
    background: var(--c-sidebar);
    color: var(--c-success);
    border: 1px solid color-mix(in srgb, var(--c-success), transparent 70%);
  }

  .toast-error {
    background: var(--c-sidebar);
    color: var(--c-danger);
    border: 1px solid color-mix(in srgb, var(--c-danger), transparent 70%);
  }

  .toast-info {
    background: var(--c-sidebar);
    color: var(--c-accent);
    border: 1px solid color-mix(in srgb, var(--c-accent), transparent 70%);
  }

  .toast-icon {
    flex-shrink: 0;
    display: flex;
  }

  .toast-message {
    flex: 1;
  }

  .toast-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
    padding: 0.125rem;
    display: flex;
  }

  .toast-dismiss:hover {
    opacity: 1;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
