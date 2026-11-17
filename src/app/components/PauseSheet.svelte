<script lang="ts">
  import { untrack } from 'svelte';
  import { audioState } from '../audio.svelte.ts';

  /**
   * The pause sheet: everything she might want mid-lesson in one place (REVIEW 1.2–1.5). It also opens by itself
   * when she leaves the app, so the lesson never runs on without her.
   */
  let {
    canBack,
    daily,
    onResume,
    onRestart,
    onBack,
    onSkip,
    onQuit,
    memo = null,
  }: {
    canBack: boolean;
    daily: boolean;
    onResume: () => void;
    onRestart: () => void;
    onBack: () => void;
    onSkip: () => void;
    onQuit: () => void;
    /** Keeping this step's phrase among her memos (2026-11-17), when the step is about a phrase. */
    memo?: { noted: boolean; full: boolean; onAdd: () => void } | null;
  } = $props();

  // The note stays until the sheet closes: the tap on 「続ける」 clears audioState.stuck as the finger lands, and a
  // vanishing note would move the buttons out from under it.
  let trouble = $state(untrack(() => audioState.stuck));
  $effect(() => {
    if (audioState.stuck) trouble = true;
  });
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pause-title">
  <div class="card">
    <h2 id="pause-title">一時停止中</h2>
    {#if trouble}
      <p class="note trouble">音が止まっていました。「続ける」をタップすると、音が出るように直して、続きから再開します。</p>
    {/if}
    <div class="list">
      <button class="btn primary" onclick={onResume}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
        続ける
      </button>
      <button class="btn soft" onclick={onRestart}>このステップを最初から</button>
      <button class="btn soft" onclick={onBack} disabled={!canBack}>前のステップに戻る</button>
      <button class="btn soft" onclick={onSkip}>このステップをとばす</button>
      {#if memo}
        <button class="btn soft" disabled={memo.noted || memo.full} onclick={memo.onAdd}>
          {memo.noted ? 'メモにあります' : memo.full ? 'メモがいっぱいです' : 'このフレーズをメモに追加'}
        </button>
      {/if}
      <button class="btn soft quit" onclick={onQuit}>{daily ? '今日はここまでにする' : '練習をやめる'}</button>
    </div>
    {#if daily}<p class="note">途中でやめても大丈夫です。続きは「今日」から再開できます。</p>{/if}
  </div>
</div>

<style>
  .sheet {
    position: absolute;
    inset: 0;
    z-index: 6;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(255, 249, 239, 0.9);
    border-radius: 26px 26px 0 0;
  }
  .card {
    width: 100%;
    max-width: 420px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 900;
    text-align: center;
  }
  .list {
    display: grid;
    gap: 10px;
  }
  .primary svg {
    width: 20px;
    height: 20px;
    fill: var(--ink);
  }
  .quit {
    background: var(--alert);
  }
  .trouble {
    margin: -4px 0 12px !important;
    color: var(--ink) !important;
  }
  .note {
    margin: 12px 0 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
    line-height: 1.5;
  }
</style>
