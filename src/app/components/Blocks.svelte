<script lang="ts">
  import { audioPath } from '../../content/audio.ts';
  import { BLOCKS } from '../../content/blocks.ts';
  import { plainKana } from '../../content/kana.ts';
  import type { Line, Part } from '../../content/types.ts';
  import { play, type Channel } from '../audio.svelte.ts';
  import Kana from './Kana.svelte';

  /**
   * A line as a row of word blocks: each with its katakana reading above, highlighted ones in the host's colour
   * like a marker pen. While the line plays, `sweep` lights the blocks up one by one so she can follow the sound.
   * When `tappable`, tapping a block plays it on its own and shows what it means.
   */
  let {
    line,
    size = 'lg',
    sweep = null,
    tappable = false,
    channel = 'other',
  }: {
    line: Line;
    size?: 'lg' | 'md' | 'sm';
    sweep?: { startedAt: number; durationMs: number } | null;
    tappable?: boolean;
    channel?: Channel;
  } = $props();

  let lit = $state(-1);
  let info = $state<Part | null>(null);
  let infoTimer = 0;

  // Each block's share of the clip, by the length of its reading (a fair guess at how long it takes to say).
  const bounds = $derived.by(() => {
    const weights = line.parts.map((p) => Math.max(1, plainKana(p.kana).replace(/\s/g, '').length));
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    return weights.map((w) => (acc += w) / total);
  });

  $effect(() => {
    if (!sweep) {
      lit = -1;
      return;
    }
    const { startedAt, durationMs } = sweep;
    const lead = 60;
    const voiced = Math.max(200, durationMs - 180);
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - startedAt - lead) / voiced;
      lit = t < 0 || t >= 1 ? -1 : bounds.findIndex((b) => t < b);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => () => clearTimeout(infoTimer));

  const meaning = (p: Part) => BLOCKS.get(p.key)?.ja ?? '';
  const note = (p: Part) => BLOCKS.get(p.key)?.note ?? '';
  const bare = (p: Part) => p.text.replace(/[?!.,]+$/, '');

  function tap(part: Part) {
    void play(audioPath(part.text), channel);
    info = part;
    clearTimeout(infoTimer);
    infoTimer = window.setTimeout(() => (info = null), 4000);
  }
</script>

<div class="blocks {size}" lang="en">
  {#each line.parts as part, i (i)}
    {#if tappable}
      <button class="block" class:hi={part.hi} class:lit={lit === i} class:on={info === part} onclick={() => tap(part)} aria-label="{bare(part)}（{meaning(part)}）を聞く">
        <span class="kana" lang="ja"><Kana text={part.kana} /></span>
        <span class="word">{part.text}</span>
      </button>
    {:else}
      <span class="block" class:hi={part.hi} class:lit={lit === i}>
        <span class="kana" lang="ja"><Kana text={part.kana} /></span>
        <span class="word">{part.text}</span>
      </span>
    {/if}
  {/each}
</div>
{#if info}
  <div class="info" lang="ja" role="status">
    <span><b lang="en">{bare(info)}</b>＝{meaning(info)}</span>
    {#if note(info)}<span class="note">{note(info)}</span>{/if}
  </div>
{/if}

<style>
  .blocks {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 8px 6px;
  }
  .block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
  }
  /* The reading is the only part she can read, so it is not small (REVIEW 3.9); the room above it holds the stress
     dots. */
  .kana {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.25;
    color: var(--ink-2);
    letter-spacing: 0.02em;
    white-space: nowrap;
    padding: 6px 3px 0;
    margin-bottom: 3px;
    border-radius: 6px;
  }
  .word {
    font-family: var(--font-en);
    font-weight: 800;
    font-size: 23px;
    line-height: 1.15;
    padding: 4px 10px 5px;
    border: 2px solid var(--ink);
    border-radius: var(--r-word);
    border-image: var(--frame-word);
    background: var(--white);
    white-space: nowrap;
    transition:
      background-color 0.12s,
      transform 0.12s;
  }
  button.block:active .word {
    transform: scale(0.95);
  }
  .hi .word {
    background: var(--accent);
    border-width: 3px;
    border-image: var(--frame-word-hi);
    padding: 3px 9px 4px;
  }
  .hi .kana {
    color: var(--ink);
    background: linear-gradient(transparent 45%, var(--accent) 45%);
  }
  .lit .word,
  .on .word {
    background: var(--sun);
    transform: translateY(-2px);
  }
  .md .word {
    font-size: 19px;
    padding: 3px 8px 4px;
  }
  .md .hi .word {
    padding: 2px 7px 3px;
  }
  .sm .word {
    font-size: 16px;
    padding: 2px 7px 3px;
  }
  .md .kana {
    font-size: 15px;
  }
  .sm .kana {
    font-size: 13px;
    padding-top: 5px;
  }
  .info {
    display: grid;
    gap: 2px;
    margin-top: 8px;
    padding: 6px 10px;
    border-radius: 12px;
    background: var(--paper-2);
    font-size: 14px;
    font-weight: 700;
  }
  .info b {
    font-family: var(--font-en);
  }
  .info .note {
    font-size: 12px;
    color: var(--ink-2);
  }
</style>
