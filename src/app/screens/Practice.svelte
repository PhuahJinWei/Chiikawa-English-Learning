<script lang="ts">
  import { ORDERED, TALKS } from '../../content/index.ts';
  import { buildPractice, readyTalks, type PracticeKind } from '../../learn/session.ts';
  import StepLayout from '../components/StepLayout.svelte';
  import { app, startPractice } from '../state.svelte.ts';

  /**
   * Practice she chooses (REVIEW 1.7): weak phrases, everything mixed, listening only, speaking only, or short
   * conversations (once she has learned the phrases of one: src/content/talks.ts). It never
   * changes the review schedule, and rotates so every learned phrase comes round. A page of its own, without the
   * friends' stage; they come back in the practice lesson itself.
   */
  const learnedCount = $derived(ORDERED.filter((e) => app.progress.ex[e.id]?.hear).length);
  const speakable = $derived(ORDERED.filter((e) => app.progress.ex[e.id]?.hear && e.kind !== 'understand').length);
  /** Conversations made only of phrases she has learned (src/content/talks.ts). */
  const talkable = $derived(readyTalks(app.progress, TALKS).length);

  const choices: { kind: PracticeKind; title: string; desc: string }[] = [
    { kind: 'weak', title: '苦手なフレーズ', desc: '間違えたり迷ったりしたフレーズを中心に' },
    { kind: 'mixed', title: '全部まぜて', desc: '習ったフレーズをまんべんなく' },
    { kind: 'listen', title: '聞き取りだけ', desc: '英語を聞いて、意味や答えを選ぶ' },
    { kind: 'speak', title: '話すだけ', desc: '聞かれたら、声に出して答える' },
    { kind: 'talk', title: '会話', desc: '覚えたフレーズで、短い会話をする' },
  ];
  const off = (kind: PracticeKind) => (kind === 'speak' && !speakable) || (kind === 'talk' && !talkable);

  function begin(kind: PracticeKind, title: string) {
    startPractice(buildPractice(app.progress, ORDERED, kind, 8, TALKS), title, 'practice');
  }

</script>

<StepLayout>
  {#snippet top()}
    <header>
      <h1 class="page-title">練習</h1>
      <p class="page-intro">
        {learnedCount
          ? '習ったフレーズを、好きなだけ練習できます。やりたいものを選んでください。'
          : 'まずは「今日」のレッスンでフレーズを習ってください。習ったフレーズを、ここで練習できます。'}
      </p>
    </header>
  {/snippet}
  {#snippet body()}
    {#if learnedCount}
      {#each choices as c (c.kind)}
        <button class="btn choice" disabled={off(c.kind)} onclick={() => begin(c.kind, c.title)}>
          <span class="title">{c.title}</span>
          <span class="desc">{c.kind === 'talk' && !talkable ? 'フレーズをもう少し覚えると、できるようになります' : c.desc}</span>
        </button>
      {/each}
      <p class="note">練習は、復習の予定には影響しません。</p>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .choice {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-height: 68px;
    padding: 10px 16px;
    text-align: left;
  }
  .title {
    font-size: 18px;
  }
  .desc {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .note {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
  }
</style>
