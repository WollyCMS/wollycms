<script lang="ts">
  import RichTextEditor from './RichTextEditor.svelte';
  import MediaPicker from './MediaPicker.svelte';

  let {
    field,
    value,
    onUpdate,
  }: {
    field: any;
    value: any[];
    onUpdate: (items: any[]) => void;
  } = $props();

  let nextKey = Date.now();

  // Initialize items from prop once. After that, this component owns the state.
  // Updates flow OUT via onUpdate() only — never synced back from parent.
  // This breaks the reactive cycle that caused effect_update_depth_exceeded.
  let items = $state<any[]>(
    Array.isArray(value) ? value.map((item) => ({ ...item, _key: nextKey++ })) : []
  );

  const subFields: any[] = $derived(field.fields || []);
  const minItems: number = $derived(field.min ?? 0);
  const maxItems: number = $derived(field.max ?? 100);

  function emitUpdate() {
    const clean = items.map(({ _key, ...rest }) => rest);
    onUpdate(clean);
  }

  function addItem() {
    if (items.length >= maxItems) return;
    const empty: Record<string, any> = {};
    for (const sf of subFields) {
      if (sf.type === 'boolean') empty[sf.name] = sf.default ?? false;
      else if (sf.type === 'number') empty[sf.name] = sf.default ?? 0;
      else if (sf.type === 'repeater') empty[sf.name] = [];
      else empty[sf.name] = sf.default ?? '';
    }
    empty._key = nextKey++;
    items = [...items, empty];
    emitUpdate();
  }

  function removeItem(index: number) {
    if (items.length <= minItems) return;
    items = items.filter((_, i) => i !== index);
    emitUpdate();
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    items = updated;
    emitUpdate();
  }

  function updateSubField(index: number, fieldName: string, fieldValue: unknown) {
    items[index] = { ...items[index], [fieldName]: fieldValue };
    items = [...items];
    emitUpdate();
  }
</script>

<div class="repeater">
  {#if items.length === 0}
    <div class="repeater-empty">
      No items yet.
    </div>
  {/if}

  {#each items as item, i (item._key ?? i)}
    <div class="repeater-item">
      <div class="repeater-item-header">
        <span class="repeater-item-num">{i + 1}</span>
        <span class="repeater-item-label">
          {#if item[subFields[0]?.name]}
            {String(item[subFields[0]?.name]).slice(0, 60)}
          {:else}
            Item {i + 1}
          {/if}
        </span>
        <div class="repeater-item-actions">
          <button class="repeater-btn" disabled={i === 0} onclick={() => moveItem(i, i - 1)} title="Move up">&#9650;</button>
          <button class="repeater-btn" disabled={i === items.length - 1} onclick={() => moveItem(i, i + 1)} title="Move down">&#9660;</button>
          <button class="repeater-btn repeater-btn-remove" disabled={items.length <= minItems} onclick={() => removeItem(i)} title="Remove item">&#10005;</button>
        </div>
      </div>
      <div class="repeater-item-fields">
        {#each subFields as sf}
          <div class="form-group">
            <label style="font-size: 0.78rem;">{sf.label || sf.name}{#if sf.required} <span style="color: #ef4444;">*</span>{/if}</label>
            {#if sf.type === 'richtext'}
              <RichTextEditor content={item[sf.name] || ''} onUpdate={(json) => updateSubField(i, sf.name, json)} />
            {:else if sf.type === 'media'}
              <MediaPicker value={item[sf.name] || null} onSelect={(mediaId) => updateSubField(i, sf.name, mediaId)} />
            {:else if sf.type === 'textarea'}
              <textarea class="form-control" value={item[sf.name] || ''}
                oninput={(e) => updateSubField(i, sf.name, (e.target as HTMLTextAreaElement).value)}
                style="min-height: 80px;"></textarea>
            {:else if sf.type === 'select'}
              <select class="form-control" value={item[sf.name] || sf.default || ''}
                onchange={(e) => updateSubField(i, sf.name, (e.target as HTMLSelectElement).value)}>
                {#each (sf.settings?.options || sf.options || []) as opt}
                  <option value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
                {/each}
              </select>
            {:else if sf.type === 'boolean'}
              <input type="checkbox" checked={!!item[sf.name]}
                onchange={(e) => updateSubField(i, sf.name, (e.target as HTMLInputElement).checked)} />
            {:else if sf.type === 'number'}
              <input type="number" class="form-control" value={item[sf.name] || ''}
                oninput={(e) => updateSubField(i, sf.name, Number((e.target as HTMLInputElement).value))} />
            {:else if sf.type === 'url'}
              <input type="url" class="form-control" value={item[sf.name] || ''} placeholder="https://..."
                oninput={(e) => updateSubField(i, sf.name, (e.target as HTMLInputElement).value)} />
            {:else if sf.type === 'email'}
              <input type="email" class="form-control" value={item[sf.name] || ''} placeholder="email@example.com"
                oninput={(e) => updateSubField(i, sf.name, (e.target as HTMLInputElement).value)} />
            {:else}
              <input class="form-control" value={item[sf.name] || ''}
                oninput={(e) => updateSubField(i, sf.name, (e.target as HTMLInputElement).value)} />
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}

  <button class="repeater-add-btn" onclick={addItem} disabled={items.length >= maxItems}>
    + Add {field.label ? field.label.replace(/s$/, '') : 'Item'}
  </button>
</div>

<style>
  .repeater {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .repeater-empty {
    padding: 1rem;
    text-align: center;
    color: var(--c-text-light, #94a3b8);
    font-size: 0.85rem;
    border: 1px dashed var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
  }

  .repeater-item {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-surface);
    overflow: hidden;
  }

  .repeater-item-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    background: var(--c-bg-alt, #f8fafc);
    border-bottom: 1px solid var(--c-border, #e2e8f0);
  }

  .repeater-item-num {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--c-text-light, #94a3b8);
    background: var(--c-border, #e2e8f0);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .repeater-item-label {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--c-text, #1e293b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .repeater-item-actions {
    display: flex;
    gap: 0.2rem;
    flex-shrink: 0;
  }

  .repeater-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    background: var(--c-surface);
    color: var(--c-text-light, #94a3b8);
    font-size: 0.6rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .repeater-btn:hover:not(:disabled) {
    border-color: var(--c-border);
    color: var(--c-text, #1e293b);
  }

  .repeater-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .repeater-btn-remove:hover:not(:disabled) {
    border-color: var(--c-danger);
    color: var(--c-danger);
    background: color-mix(in srgb, var(--c-danger), transparent 90%);
  }

  .repeater-item-fields {
    padding: 0.6rem 0.75rem;
  }

  .repeater-add-btn {
    padding: 0.5rem 1rem;
    border: 1px dashed var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: transparent;
    color: var(--c-text-light, #94a3b8);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }

  .repeater-add-btn:hover:not(:disabled) {
    border-color: var(--c-primary, #2563eb);
    color: var(--c-primary, #2563eb);
    background: color-mix(in srgb, var(--c-primary, #2563eb) 5%, transparent);
  }

  .repeater-add-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
