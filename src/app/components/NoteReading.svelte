<script lang="ts">
  import { untrack } from 'svelte';
  import { handMade, readingOf, readyReading } from '../reading.ts';
  import Kana from './Kana.svelte';

  /**
   * The katakana reading of a note's English (src/app/reading.ts), with its strong beats marked. Nothing shows until
   * it is ready. `boxed`: the note editor's version, larger, under a label, saying when it was made on the phone; it
   * follows her typing a moment after her.
   */
  let { en, boxed = false }: { en: string; boxed?: boolean } = $props();
  let kana = $state(untrack(() => readyReading(en) ?? ''));

  $effect(() => {
    const text = en;
    const ready = readyReading(text);
    if (ready !== undefined) {
      kana = ready;
      return;
    }
    let live = true;
    const timer = setTimeout(
      async () => {
        const k = await readingOf(text);
        if (live) kana = k;
      },
      boxed ? 300 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  });
</script>

{#if kana && boxed}
  <div class="box">
    <span class="label">読み方</span>
    <span class="reading lg" lang="ja"><Kana text={kana} /></span>
    {#if !handMade(en)}<span class="auto">自動でつけた読み方です。目安にしてください。</span>{/if}
  </div>
{:else if kana}
  <span class="reading" lang="ja"><Kana text={kana} /></span>
{/if}

<style>
  /* The reading is what she can read, so it is not small; the line is tall enough for the stress dots above it. */
  .reading {
    display: block;
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-2);
    letter-spacing: 0.02em;
    line-height: 1.7;
    /* A long reading goes onto the next line between words, as the English does, not in the middle of one. */
    word-break: keep-all;
    overflow-wrap: anywhere;
  }
  .lg {
    font-size: 19px;
    color: var(--ink);
  }
  .box {
    display: grid;
    padding: 6px 12px 8px;
    border-radius: 12px;
    background: var(--paper-2);
  }
  .label {
    font-size: 14px;
    font-weight: 900;
    color: var(--ink-2);
  }
  .auto {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-2);
  }
</style>
