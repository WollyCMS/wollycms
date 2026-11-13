<script lang="ts">
  import RichTextEditor from '../../../src/lib/components/RichTextEditor.svelte';
  import RepeaterEditor from '../../../src/lib/components/RepeaterEditor.svelte';
  import { renderRichText } from '../../../../astro/src/helpers/richtext.js';

  const mode = new URLSearchParams(location.search).get('fixture') || 'accordion';
  const image = (width: string | null, float: string) => ({
    type: 'image', attrs: {
      src: '/image.svg', alt: 'Center exterior', title: 'Center', width, height: null, float,
      caption: 'Campus photograph', href: '/visit', linkTarget: '_blank',
    },
  });
  const paragraph = {
    type: 'paragraph', attrs: { textAlign: 'center' },
    content: [{ type: 'text', text: 'Normal operating hours', marks: [{ type: 'textStyle', attrs: { color: '#123456' } }] }],
  };
  const matrix = [null, '25%', '50%', '75%', '100%'].flatMap(width =>
    ['none', 'left', 'center', 'right'].map(float => image(width, float)));
  const document = { type: 'doc', content: [
    ...(mode === 'matrix' ? matrix : [image('50%', 'right')]),
    paragraph,
    { type: 'paragraph', content: [{ type: 'text', text: 'Monday through Thursday' }] },
    { type: 'heading', attrs: { level: 2, id: 'hours', textAlign: 'right' }, content: [{ type: 'text', text: 'Hours' }] },
    ...(mode === 'matrix' ? [{ type: 'table', content: [{ type: 'tableRow', content: [{
      type: 'tableCell', content: [image('50%', 'right')],
    }] }] }] : []),
  ] };
  const initial = mode === 'accordion' ? [{ title: 'Community Center', body: document }] : document;
  let saved = $state(JSON.parse(localStorage.getItem(mode) || 'null') || initial);
  const field = { label: 'Sections', fields: [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'body', label: 'Body', type: 'richtext' },
  ] };
  const body = $derived(mode === 'accordion' ? saved[0].body : saved);
</script>

<h1>Editor regression fixture</h1>
{#if mode === 'accordion'}
  <RepeaterEditor {field} value={saved} onUpdate={(value) => saved = value} />
{:else}
  <RichTextEditor content={saved} onUpdate={(value) => saved = value} />
{/if}
<button type="button" onclick={() => localStorage.setItem(mode, JSON.stringify(saved))}>Save fixture</button>
<pre data-testid="saved">{JSON.stringify(saved)}</pre>
<div data-testid="rendered">{@html renderRichText(body)}</div>
