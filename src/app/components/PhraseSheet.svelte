<script lang="ts">
  import { replyWord } from '../../content/index.ts';
  import type { Exchange } from '../../content/types.ts';
  import { newNote, noteFor, putNote } from '../../learn/notes.ts';
  import { TOP_BOX } from '../../learn/schedule.ts';
  import { stepsForNew, type Step } from '../../learn/session.ts';
  import { app, save, startPractice } from '../state.svelte.ts';
  import SheetHead from './SheetHead.svelte';
  import SpeakerCard from './SpeakerCard.svelte';

  /** One phrase from the notebook: every way she may hear it, the replies, when to use it, and practice. */
  let { ex, onClose }: { ex: Exchange; onClose: () => void } = $props();

  const ep = $derived(app.progress.ex[ex.id]);
  const dots = (box: number | undefined) => Array.from({ length: TOP_BOX }, (_, i) => i < (box ?? 0));

  // Keeping the phrase among her own notes (REVIEW section 7), where she can add her own Japanese to it.
  const keep = $derived(ex.kind === 'say' ? ex.short[0] : ex.heard[0]);
  const noted = $derived(!!noteFor(app.progress, keep.en));
  let full = $state(false);
  function addToNotes() {
    full = !putNote(app.progress, newNote(keep.en, keep.ja, Date.now(), ex.id));
    if (!full) save();
  }

  function practise() {
    const steps: Step[] = [{ kind: 'catch', exId: ex.id, review: false, ask: 'meaning' }];
    if (ex.kind === 'reply') steps.push({ kind: 'catch', exId: ex.id, review: false, ask: 'reply' });
    if (ex.kind !== 'understand') steps.push({ kind: 'answer', exId: ex.id, review: false });
    startPractice(steps, `「${ex.title}」の練習`, 'notebook');
  }
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-label={ex.title}>
  <SheetHead title={ex.title} {onClose} />
  <div class="scroll">
    <p class="when"><span class="label">使うとき</span>{ex.when}</p>
    {#if ex.cue}<div class="card soft cue"><span class="chip">こんなとき</span><p>{ex.cue}</p></div>{/if}

    {#if ex.heard.length}
      <h3>相手が言うフレーズ</h3>
      {#each ex.heard as line (line.en)}<SpeakerCard kind="other" {line} compact />{/each}
    {/if}

    {#if ex.short.length}
      <h3>{ex.kind === 'say' ? '言い方' : '答え方'}</h3>
      {#each ex.short as line (line.en)}<SpeakerCard kind="model" {line} badge={replyWord(ex)} compact />{/each}
    {/if}

    <div class="card soft strength">
      <div><span>聞く</span><span class="dots">{#each dots(ep?.hear?.box) as on, i (i)}<i class:on></i>{/each}</span></div>
      {#if ex.kind !== 'understand'}
        <div><span>話す</span><span class="dots">{#each dots(ep?.say?.box) as on, i (i)}<i class:on></i>{/each}</span></div>
      {/if}
    </div>
    <button class="btn soft" disabled={noted} onclick={addToNotes}>{noted ? 'メモにあります' : 'メモに追加'}</button>
    {#if full}<p class="locked">メモがいっぱいです。使わないメモを削除してから、もう一度ためしてください。</p>{/if}
  </div>
  <div class="actions">
    <button class="btn soft" onclick={() => startPractice(stepsForNew([ex]), `「${ex.title}」をもう一度`, 'notebook')}>最初から習う</button>
    <button class="btn primary" onclick={practise}>練習する</button>
  </div>
</div>

<style>
  .sheet {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    padding: 12px 16px calc(12px + var(--safe-bottom));
    background: var(--paper);
    border-radius: 26px 26px 0 0;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: grid;
    gap: 10px;
    align-content: start;
    /* 4px of room at each side, so the drawn lines' outer edge (they reach 2px outside each card) is not cut off. */
    margin: 0 -4px;
    padding: 6px 4px 12px;
  }
  h3 {
    margin: 8px 0 -2px;
    font-size: 15px;
    font-weight: 900;
  }
  .when {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.6;
  }
  .label {
    display: inline-block;
    margin-right: 6px;
    padding: 0 6px;
    border-radius: 6px;
    background: var(--paper-2);
    font-size: 12px;
  }
  .cue {
    background: var(--paper-2);
  }
  /* Chips have no outline, and their usual cream is this card's own colour: white here. */
  .cue .chip {
    background: var(--white);
  }
  .cue p {
    margin: 6px 0 0;
    font-weight: 800;
  }
  .locked {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .strength {
    display: grid;
    gap: 6px;
    font-weight: 800;
  }
  .strength div {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .dots {
    display: inline-flex;
    gap: 5px;
  }
  .dots i {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--ink);
    background: var(--white);
  }
  .dots i.on {
    background: var(--mint-2);
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding-top: 8px;
  }
</style>
