<script lang="ts">
  import type { Snippet } from 'svelte';
  import { audioPath } from '../../content/audio.ts';
  import type { Line } from '../../content/types.ts';
  import { audioState, play, type Channel } from '../audio.svelte.ts';
  import Blocks from './Blocks.svelte';

  /**
   * Where English sound comes from. 'other' is 相手, the people she will meet; 'model' is お手本, the model answer she
   * says. Never a friend: the generated voice is not a friend's voice.
   *
   * Once shown, a card can always be played again with its ▶ button, and each block can be tapped (REVIEW 1.8).
   * While the card's sound plays, the ▶ itself turns into moving bars: no separate indicator that could pass for a
   * menu. `hideEnglish` keeps the meaning but hides the English, for saying it from memory.
   */
  let {
    kind,
    line,
    reveal = true,
    hideEnglish = false,
    badge = '',
    note = '',
    hiddenNote = '',
    compact = false,
    aside,
    children,
  }: {
    kind: Channel;
    line: Line | null;
    reveal?: boolean;
    hideEnglish?: boolean;
    badge?: string;
    note?: string;
    /** Said under the ♪ marks while the English is hidden, so a card with no text never looks broken. */
    hiddenNote?: string;
    compact?: boolean;
    /** Something small in the top row, beside ▶ (もう知ってる): it takes no room of its own. */
    aside?: Snippet;
    children?: Snippet;
  } = $props();

  const path = $derived(line ? audioPath(line.en) : '');
  const mine = $derived(audioState.playing && audioState.playing.path === path ? audioState.playing : null);
  const playable = $derived(!!line && (reveal || hideEnglish));
</script>

{#snippet glyph()}
  {#if mine}
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
  {/if}
{/snippet}

{#if compact && line && reveal && !hideEnglish}
  <!-- One row: for other ways of saying something, and lists. -->
  <div class="card soft {kind} row-card" class:busy={!!mine}>
    <div class="row-text">
      <Blocks {line} size="sm" tappable channel={kind} sweep={mine ? { startedAt: mine.startedAt, durationMs: mine.durationMs } : null} />
      <span class="row-ja">{line.ja}</span>
    </div>
    <button class="play" class:on={!!mine} onclick={() => play(path, kind)} aria-label="もう一回聞く">
      {@render glyph()}
    </button>
  </div>
{:else}
<div class="card {kind}" class:compact class:busy={!!mine}>
  <div class="head">
    <span class="chip">
      {#if kind === 'other'}
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" /><path d="M4.5 21c.6-4.4 3.6-7 7.5-7s6.9 2.6 7.5 7" /></svg>
        相手
      {:else}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></svg>
        お手本
      {/if}
    </span>
    {#if badge}<span class="badge">{badge}</span>{/if}
    {#if aside}<span class="aside">{@render aside()}</span>{/if}
    {#if playable}
      <button class="play" class:on={!!mine} onclick={() => play(path, kind)} aria-label="もう一回聞く">
        {@render glyph()}
      </button>
    {/if}
  </div>

  {#if line && reveal && !hideEnglish}
    <div class="body">
      <Blocks {line} size={compact ? 'md' : 'lg'} tappable channel={kind} sweep={mine ? { startedAt: mine.startedAt, durationMs: mine.durationMs } : null} />
      <div class="ja-meaning">{line.ja}</div>
      {#if note}<p class="note"><span class="note-label">使うとき</span>{note}</p>{/if}
    </div>
  {:else if line && hideEnglish}
    <div class="body">
      <div class="memory" aria-label="英語は隠しています">？？？</div>
      <div class="ja-meaning">{line.ja}</div>
    </div>
  {:else}
    <div class="hidden" aria-label="聞いてね">
      <span class="note-mark">♪</span><span class="note-mark">♪</span><span class="note-mark">♪</span>
    </div>
    {#if hiddenNote}<p class="hidden-note">{hiddenNote}</p>{/if}
  {/if}
  {@render children?.()}
</div>
{/if}

<style>
  .row-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px 8px 12px;
  }
  .row-text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .row-ja {
    font-size: 14px;
    font-weight: 700;
  }
  .card.model {
    background: #fff4f6;
  }
  .card.compact {
    padding: 8px 12px 10px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .chip svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .other .chip {
    background: var(--sky);
  }
  .model .chip {
    background: var(--blush);
  }
  .badge {
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .play {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: var(--line) solid var(--ink);
    border-image: var(--frame-ring);
    background: var(--white);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .head .play,
  .aside {
    margin-left: auto;
  }
  .aside + .play {
    margin-left: 0;
  }
  .play.on {
    background: var(--sun);
  }
  .play:active {
    transform: scale(0.92);
  }
  .play svg {
    width: 18px;
    height: 18px;
    fill: var(--ink);
    margin-left: 2px;
  }
  /* Playing: three bars bob inside the button. */
  .eq {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 18px;
  }
  .eq i {
    display: block;
    width: 4px;
    height: 6px;
    border-radius: 3px;
    background: var(--ink);
    animation: eq 0.7s ease-in-out infinite;
  }
  .eq i:nth-child(2) {
    animation-delay: 0.15s;
  }
  .eq i:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes eq {
    0%,
    100% {
      height: 6px;
    }
    50% {
      height: 17px;
    }
  }
  .body {
    display: grid;
    gap: 8px;
  }
  .note {
    margin: 2px 0 0;
    font-size: 14px;
    line-height: 1.55;
    font-weight: 700;
    color: var(--ink-2);
  }
  .note-label {
    display: inline-block;
    margin-right: 6px;
    padding: 0 6px;
    border-radius: 6px;
    background: var(--paper-2);
    color: var(--ink);
    font-size: 12px;
  }
  .memory {
    font-family: var(--font-en);
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: var(--ink-3);
  }
  .hidden {
    display: flex;
    justify-content: center;
    gap: 18px;
    padding: 8px 0 4px;
    font-size: 26px;
    color: var(--ink-3);
  }
  .hidden-note {
    margin: 2px 0 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
  }
  .busy .hidden .note-mark {
    color: var(--ink);
    animation: bob 0.9s ease-in-out infinite;
  }
  .busy .hidden .note-mark:nth-child(2) {
    animation-delay: 0.15s;
  }
  .busy .hidden .note-mark:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }
</style>
