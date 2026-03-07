<script lang="ts">
  import { X } from 'lucide-svelte';
  import { focusTrap } from '$lib/focusTrap.js';

  let { visible = false, onClose }: { visible: boolean; onClose: () => void } = $props();
</script>

{#if visible}
  <div class="modal-overlay" onclick={onClose} role="dialog" aria-labelledby="shortcuts-title" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={onClose}>
      <div class="modal-header">
        <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
        <button class="btn-icon" onclick={onClose} aria-label="Close shortcuts"><X size={18} /></button>
      </div>
      <div class="modal-body">
        <div class="shortcut-group">
          <h3>Global</h3>
          <div class="shortcut-row">
            <span class="shortcut-desc">Search</span>
            <div class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>K</kbd></div>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Show shortcuts</span>
            <kbd>?</kbd>
          </div>
        </div>
        <div class="shortcut-group">
          <h3>Page Editor</h3>
          <div class="shortcut-row">
            <span class="shortcut-desc">Save page</span>
            <div class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>S</kbd></div>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Toggle preview</span>
            <div class="shortcut-keys"><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd></div>
          </div>
          <div class="shortcut-row">
            <span class="shortcut-desc">Close modal / collapse block</span>
            <kbd>Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .shortcut-group {
    margin-bottom: 1.25rem;
  }

  .shortcut-group:last-child {
    margin-bottom: 0;
  }

  .shortcut-group h3 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--c-text-light);
    margin-bottom: 0.5rem;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0;
  }

  .shortcut-desc {
    font-size: 0.9rem;
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--c-text-light);
  }

  kbd {
    display: inline-block;
    padding: 0.15rem 0.45rem;
    font-size: 0.75rem;
    font-family: var(--font);
    background: var(--c-bg);
    border: 1px solid var(--c-border);
    border-radius: 4px;
    box-shadow: 0 1px 0 var(--c-border);
    color: var(--c-text);
  }
</style>
