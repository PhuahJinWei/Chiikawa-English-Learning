<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { UI } from '../../content/index.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import type { PartnerId } from '../../learn/partners.ts';
  import { FRIENDS } from '../friends.ts';
  import { act } from '../scene.ts';
  import { sfx } from '../sfx.ts';
  import { app } from '../state.svelte.ts';

  /**
   * The end of a lesson is a small conversation, and her buttons are her lines (PLAN.md section 2): Hachiware hands
   * over the stamp ("Here you go."), she says "Thank you!"; he says "See you!", she says "Bye!" (late in the evening
   * "Good night!", which is only ever used for parting). After a round of もっと覚える the stamp was already given, so
   * he says "All done!" instead, and her other button takes the next new phrases.
   */
  let {
    daily,
    extra = false,
    stamped,
    levelUp = null,
    joined = null,
    counts,
    phrasesLeft = false,
    onClose,
    onMore,
  }: {
    daily: boolean;
    /** More new phrases after today's lesson (もっと覚える): today's stamp was given at the end of that lesson. */
    extra?: boolean;
    /** False when she skipped every step: no answer, no stamp. */
    stamped: boolean;
    /** New phrases are left for another round of もっと覚える. */
    phrasesLeft?: boolean;
    /** Her new English level, when it went up in this lesson. */
    levelUp?: number | null;
    /** The friend who joined at that level (src/learn/partners.ts): on stage now, her partner from tomorrow. */
    joined?: PartnerId | null;
    counts: { fresh: number; reviews: number; practice: number };
    onClose: () => void;
    onMore: () => void;
  } = $props();
  const newFriend = untrack(() => (joined ? FRIENDS[joined].name : ''));

  // Decided once when the screen opens.
  let phase = $state<'stamp' | 'bye'>(untrack(() => (daily && !stamped ? 'bye' : 'stamp')));
  const hour = new Date().getHours();
  const late = hour >= 20 || hour < 4;
  // The stamp's number: her study days so far, today's included (not the days since she started, which would count
  // the days she skipped too).
  const studied = $derived(app.progress.days.filter((d) => d <= app.today).length);

  // The friends' stage grows into a scene for the celebration (App.svelte), and shrinks back when she leaves.
  app.celebrating = true;
  onDestroy(() => (app.celebrating = false));

  sfx.fanfare();
  act([
    { who: 'hachiware', gesture: 'cheer', face: 'happy' },
    { who: 'chiikawa', gesture: 'hop', face: 'happy', mark: 'heart' },
  ]);
  // A friend who has just joined arrives a moment later, to cheer with them.
  const welcome = untrack(() => joined);
  if (welcome) {
    const t = setTimeout(() => act([{ who: welcome, gesture: 'cheer', face: 'happy', mark: 'heart' }]), 1200);
    onDestroy(() => clearTimeout(t));
  }

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
      <Bubble
        who="hachiware"
        named={false}
        text={extra ? '新しいフレーズ、おつかれさま！' : daily ? '今日のスタンプだよ。おつかれさま！' : '練習おつかれさま！'}
      >
        {#snippet before()}
          <span class="lead"><UiWord t={daily && !extra ? UI.hereYouGo : UI.allDone} size="bubble" /></span>
        {/snippet}
      </Bubble>
    {:else}
      <Bubble
        who="hachiware"
        named={false}
        text={!stamped && daily
          ? '今日は答えた問題がなかったから、スタンプはおあずけ。また来てね！'
          : newFriend
            ? `明日から${newFriend}も一緒だよ。また明日ね！`
            : 'また明日ね！'}
      >
        {#snippet before()}
          <span class="lead"><UiWord t={UI.seeYou} size="bubble" /></span>
        {/snippet}
      </Bubble>
    {/if}
  {/snippet}
  {#snippet body()}
    <div class="card stamp-card">
      {#if daily && stamped && !extra}
        <div class="stamp" role="img" aria-label="{studied}日目のスタンプ">
          <span class="stamp-day">{studied}</span>
          <span class="stamp-label">日目</span>
        </div>
      {/if}
      <!-- がんばった日 only without a stamp: with one, the stamp already shows the same number. -->
      <dl class="stats">
        {#if counts.fresh}<div><dt>新しいフレーズ</dt><dd>{counts.fresh}</dd></div>{/if}
        {#if counts.reviews}<div><dt>復習</dt><dd>{counts.reviews}</dd></div>{/if}
        {#if counts.practice}<div><dt>練習</dt><dd>{counts.practice}</dd></div>{/if}
        {#if daily && !stamped}<div><dt>がんばった日</dt><dd>{app.progress.days.length}</dd></div>{/if}
      </dl>
    </div>
    {#if levelUp}
      <!-- Her level went up in this lesson; at levels 2 and 3 a friend joins (src/learn/partners.ts). -->
      <div class="card soft level-up" role="status">
        <span><b>英語レベル{levelUp}</b>になりました！</span>
        {#if newFriend}<span class="joined"><b>{newFriend}</b>が仲間になりました。</span>{/if}
      </div>
    {/if}
  {/snippet}
  {#snippet primary()}
    {#if phase === 'stamp'}
      <div class="pair">
        <button class="btn soft" onclick={onMore}>{extra && phrasesLeft ? 'もっと覚える' : 'もっと練習する'}</button>
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
    color: #c8405e;
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
  .level-up {
    display: grid;
    gap: 2px;
    padding: 10px 14px;
    background: var(--sun);
    font-size: 16px;
    font-weight: 700;
    line-height: 1.5;
  }
  .joined {
    font-size: 14px;
  }
</style>
