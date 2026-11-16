<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { UI } from '../../content/index.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act } from '../scene.ts';
  import { sfx } from '../sfx.ts';
  import { app } from '../state.svelte.ts';

  /**
   * The end of a lesson is a small conversation, and her buttons are her lines (PLAN.md section 2): Hachiware hands
   * over the stamp ("Here you go."), she says "Thank you!"; he says "See you!", she says "Bye!" (late in the evening
   * "Good night!", which is only ever used for parting).
   */
  let {
    daily,
    stamped,
    counts,
    onClose,
    onMore,
  }: {
    daily: boolean;
    /** False when she skipped every step: no answer, no stamp. */
    stamped: boolean;
    counts: { fresh: number; reviews: number; practice: number };
    onClose: () => void;
    onMore: () => void;
  } = $props();

  // Decided once when the screen opens.
  let phase = $state<'stamp' | 'bye'>(untrack(() => (daily && !stamped ? 'bye' : 'stamp')));
  const hour = new Date().getHours();
  const late = hour >= 20 || hour < 4;
  const day = $derived(app.progress.started === null ? 1 : app.today - app.progress.started + 1);

  // The friends' stage grows into a scene for the celebration (App.svelte), and shrinks back when she leaves.
  app.celebrating = true;
  onDestroy(() => (app.celebrating = false));

  sfx.fanfare();
  act([
    { who: 'hachiware', gesture: 'cheer', face: 'happy' },
    { who: 'chiikawa', gesture: 'hop', face: 'happy', mark: 'heart' },
  ]);

  function thanks() {
    if (!daily) {
      onClose();
      return;
    }
    phase = 'bye';
    act([{ who: 'hachiware', gesture: 'wave', face: 'smile' }]);
  }
</script>

<StepLayout>
  {#snippet top()}
    {#if phase === 'stamp'}
      <Bubble who="hachiware" text={daily ? '今日のスタンプだよ。おつかれさま！' : '練習おつかれさま！'}>
        {#snippet before()}
          <span class="lead"><UiWord t={daily ? UI.hereYouGo : UI.allDone} size="bubble" /></span>
        {/snippet}
      </Bubble>
    {:else}
      <Bubble who="hachiware" text={stamped || !daily ? 'また明日ね！' : '今日は答えた問題がなかったから、スタンプはおあずけ。また来てね！'}>
        {#snippet before()}
          <span class="lead"><UiWord t={UI.seeYou} size="bubble" /></span>
        {/snippet}
      </Bubble>
    {/if}
  {/snippet}
  {#snippet body()}
    <div class="card stamp-card">
      {#if daily && stamped}
        <div class="stamp" aria-hidden="true">
          <span class="stamp-day">{day}</span>
          <span class="stamp-label">日目</span>
        </div>
      {/if}
      <dl class="stats">
        {#if counts.fresh}<div><dt>新しいフレーズ</dt><dd>{counts.fresh}</dd></div>{/if}
        {#if counts.reviews}<div><dt>復習</dt><dd>{counts.reviews}</dd></div>{/if}
        {#if counts.practice}<div><dt>練習</dt><dd>{counts.practice}</dd></div>{/if}
        {#if daily}<div><dt>がんばった日</dt><dd>{app.progress.days.length}</dd></div>{/if}
      </dl>
    </div>
  {/snippet}
  {#snippet primary()}
    {#if phase === 'stamp'}
      <div class="pair">
        <button class="btn soft" onclick={onMore}>もっと練習する</button>
        <button class="btn primary" onclick={thanks}><UiWord t={UI.thanks} /></button>
      </div>
    {:else}
      <button class="btn primary" onclick={onClose}><UiWord t={late ? UI.night : UI.bye} /></button>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .lead {
    display: block;
    font-size: 21px;
    margin-bottom: 2px;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 10px;
    align-items: stretch;
  }
  .pair .soft {
    min-height: 60px;
  }
  .stamp-card {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .stamp {
    flex: none;
    width: 104px;
    height: 104px;
    border-radius: 50%;
    /* An unevenly inked rubber-stamp ring (tools/sketch/sketch.mjs), drawn just inside the circle. */
    background: var(--stamp) center / 100% 100% no-repeat, #fff7f8;
    color: #e0607a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transform: rotate(-12deg);
    animation: stamp 0.45s cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  @keyframes stamp {
    from {
      transform: rotate(-12deg) scale(1.8);
      opacity: 0;
    }
  }
  .stamp-day {
    font-size: 40px;
    font-weight: 900;
    line-height: 1;
  }
  .stamp-label {
    font-size: 14px;
    font-weight: 900;
  }
  .stats {
    margin: 0;
    display: grid;
    gap: 6px;
    flex: 1;
  }
  .stats div {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
  }
  .stats dt {
    color: var(--ink-2);
  }
  .stats dd {
    margin: 0;
    font-size: 18px;
  }
</style>
