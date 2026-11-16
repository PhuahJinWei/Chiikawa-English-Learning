<script lang="ts">
  import type { UiText } from '../../content/ui.ts';
  import { shiftStage } from '../../learn/shift.ts';
  import { app } from '../state.svelte.ts';
  import Kana from './Kana.svelte';

  /** One of the app's own words, shown at its Japanese → English stage (see src/learn/shift.ts). */
  let { t, size = 'btn' }: { t: UiText; size?: 'btn' | 'bubble' | 'small' } = $props();

  const stageNow = $derived(shiftStage(t, app.progress));
  const kana = $derived(t.line.parts.map((p) => p.kana).join(' '));
</script>

{#if stageNow === 1}
  <span class="ja s-{size}">{t.ja}</span>
{:else}
  <span class="stack s-{size}" lang="en">
    {#if stageNow <= 3}<span class="kana" lang="ja"><Kana text={kana} /></span>{/if}
    <span class="en">{t.line.en}</span>
    {#if stageNow === 2}<span class="ja-small" lang="ja">{t.ja}</span>{/if}
  </span>
{/if}

<style>
  .stack {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
  }
  .kana {
    font-size: 0.65em;
    font-weight: 700;
    color: var(--ink-2);
    margin-bottom: 1px;
    padding-top: 0.25em;
  }
  .en {
    font-family: var(--font-en);
    font-weight: 800;
  }
  .ja-small {
    font-size: 0.6em;
    font-weight: 700;
    color: var(--ink-2);
    margin-top: 2px;
  }
  .s-bubble.stack {
    align-items: flex-start;
  }
  .s-small {
    font-size: 14px;
  }
</style>
