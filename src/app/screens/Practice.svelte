<script lang="ts">
  import { ORDERED, TALKS } from '../../content/index.ts';
  import { buildPractice, readyTalks, type PracticeKind } from '../../learn/session.ts';
  import Ja from '../components/Ja.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import { app, startPractice } from '../state.svelte.ts';
  import { STEP_ICONS } from '../step-kinds.ts';

  /**
   * Practice she chooses (REVIEW 1.7): weak phrases, everything mixed, listening only, speaking only, or short
   * conversations (once she has learned the phrases of one: src/content/talks.ts). It never
   * changes the review schedule, and rotates so every learned phrase comes round. A page of its own, without the
   * friends' stage; they come back in the practice lesson itself.
   *
   * Each choice has an icon (the lesson's own for listening, speaking and conversations), and one is suggested
   * (おすすめ, 2026-11-17): her weak phrases once she has missed any, otherwise everything mixed. It is the one
   * sticker button on the page; the others are light, like the quiz's choices.
   */
  const learnedCount = $derived(ORDERED.filter((e) => app.progress.ex[e.id]?.hear).length);
  const speakable = $derived(ORDERED.filter((e) => app.progress.ex[e.id]?.hear && e.kind !== 'understand').length);
  /** Conversations made only of phrases she has learned (src/content/talks.ts). */
  const talkable = $derived(readyTalks(app.progress, TALKS).length);

  /** A target: the phrases to aim at. */
  const TARGET = ['M12 3.8a8.2 8.2 0 1 0 0 16.4a8.2 8.2 0 1 0 0-16.4z', 'M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 1 0 0-7.2z', 'M12 12h.01'];
  /** Two crossing arrows: everything, shuffled. */
  const SHUFFLE = [
    'M4 16.5h2.2c4.6 0 5.8-9 10.4-9H20',
    'M17.5 5l2.5 2.5-2.5 2.5',
    'M4 7.5h2.2c1.7 0 2.8 1.2 3.7 2.8',
    'M13.4 13.7c.9 1.6 2 2.8 3.2 2.8H20',
    'M17.5 14l2.5 2.5-2.5 2.5',
  ];

  const choices: { kind: PracticeKind; title: string; desc: string; icon: string[] }[] = [
    { kind: 'weak', title: '苦手なフレーズ', desc: '間違えたり|迷ったりした|フレーズを|中心に', icon: TARGET },
    { kind: 'mixed', title: '全部まぜて', desc: '習ったフレーズをまんべんなく', icon: SHUFFLE },
    { kind: 'listen', title: '聞き取りだけ', desc: '英語を聞いて、|意味や答えを選ぶ', icon: STEP_ICONS.catch },
    { kind: 'speak', title: '話すだけ', desc: '聞かれたら、|声に出して答える', icon: STEP_ICONS.answer },
    { kind: 'talk', title: '会話', desc: '覚えたフレーズで、|短い会話をする', icon: STEP_ICONS.talk },
  ];
  const off = (kind: PracticeKind) => (kind === 'speak' && !speakable) || (kind === 'talk' && !talkable);

  /** Whether she has missed any learned phrase: then her weak phrases are the practice to suggest. */
  const missed = $derived(
    ORDERED.some((e) => {
      const ep = app.progress.ex[e.id];
      return (ep?.hear?.misses ?? 0) + (ep?.say?.misses ?? 0) > 0;
    }),
  );
  const suggested = $derived<PracticeKind>(missed ? 'weak' : 'mixed');

  function begin(kind: PracticeKind, title: string) {
    startPractice(buildPractice(app.progress, ORDERED, kind, 8, TALKS), title, 'practice');
  }

</script>

<StepLayout>
  {#snippet top()}
    <header>
      <h1 class="page-title">練習</h1>
      <p class="page-intro">
        <Ja
          text={learnedCount
            ? '習ったフレーズを、|好きなだけ|練習できます。|やりたいものを|選んでください。'
            : 'まずは「今日」の|レッスンで|フレーズを|習ってください。|習ったフレーズを、|ここで|練習できます。'}
        />
      </p>
    </header>
  {/snippet}
  {#snippet body()}
    {#if learnedCount}
      {#each choices as c (c.kind)}
        {@const rec = c.kind === suggested}
        <button class="btn choice {c.kind}" class:light={!rec} class:rec disabled={off(c.kind)} onclick={() => begin(c.kind, c.title)}>
          <span class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">{#each c.icon as d (d)}<path {d} />{/each}</svg>
          </span>
          <span class="text">
            <span class="title">{c.title}{#if rec}<span class="chip tag">おすすめ</span>{/if}</span>
            <span class="desc"><Ja text={c.kind === 'talk' && !talkable ? 'フレーズを|もう少し|覚えると、|できるように|なります' : c.desc} /></span>
          </span>
        </button>
      {/each}
      <p class="note">練習は、復習の予定には影響しません。</p>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .choice {
    justify-content: flex-start;
    gap: 12px;
    min-height: 70px;
    padding: 10px 14px;
    text-align: left;
  }
  .choice.rec {
    background: var(--sun);
  }
  /* The icon in a soft circle, a colour for each kind: listening sky blue as the other person's card in a lesson,
     speaking mint, weak phrases blush. */
  .icon {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--paper-2);
  }
  .weak .icon {
    background: var(--blush);
  }
  .mixed .icon {
    background: var(--sun);
  }
  .listen .icon {
    background: var(--sky);
  }
  .speak .icon {
    background: var(--mint);
  }
  .talk .icon {
    background: var(--paper-3);
  }
  .rec .icon {
    background: var(--white);
  }
  .icon svg {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.3;
  }
  .tag {
    padding: 2px 9px;
    background: var(--white);
    font-size: 12.5px;
  }
  .desc {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .note {
    margin: 2px 0 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
  }
</style>
