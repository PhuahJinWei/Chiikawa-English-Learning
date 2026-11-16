<script lang="ts">
  import { ORDERED } from '../../content/index.ts';
  import { buildPractice, type PracticeKind } from '../../learn/session.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import { lifetime } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app, startPractice } from '../state.svelte.ts';

  /**
   * Practice she chooses (REVIEW 1.7): weak phrases, everything mixed, listening only or speaking only. It never
   * changes the review schedule, and rotates so every learned phrase comes round. Usagi bounces about on stage, but
   * Hachiware does the talking: in the original, Usagi never speaks in sentences.
   */
  const life = lifetime();
  const learnedCount = $derived(ORDERED.filter((e) => app.progress.ex[e.id]?.hear).length);
  const speakable = $derived(ORDERED.filter((e) => app.progress.ex[e.id]?.hear && e.kind !== 'understand').length);

  const choices: { kind: PracticeKind; title: string; desc: string }[] = [
    { kind: 'weak', title: '苦手なフレーズ', desc: '間違えたり迷ったりしたフレーズを中心に' },
    { kind: 'mixed', title: '全部まぜて', desc: '習ったフレーズをまんべんなく' },
    { kind: 'listen', title: '聞き取りだけ', desc: '英語を聞いて、意味や答えを選ぶ' },
    { kind: 'speak', title: '話すだけ', desc: '聞かれたら、声に出して答える' },
  ];

  function begin(kind: PracticeKind, title: string) {
    startPractice(buildPractice(app.progress, ORDERED, kind), title, 'practice');
  }

  life.run(async (s) => {
    await stage.setCast(['hachiware', 'usagi']);
    await s.wait(400);
    void stage.play('usagi', 'hop');
    stage.mark('usagi', 'exclaim');
  });
</script>

<StepLayout>
  {#snippet top()}
    <Bubble
      who="hachiware"
      text={learnedCount ? '練習しよう！ やりたいものを選んでね。何回やってもOK！' : 'まずは「今日」のレッスンでフレーズを習ってね。習ったら、ここで練習できるよ！'}
    />
  {/snippet}
  {#snippet body()}
    {#if learnedCount}
      {#each choices as c (c.kind)}
        <button class="btn choice" disabled={c.kind === 'speak' && !speakable} onclick={() => begin(c.kind, c.title)}>
          <span class="title">{c.title}</span>
          <span class="desc">{c.desc}</span>
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
