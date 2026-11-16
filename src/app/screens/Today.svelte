<script lang="ts">
  import { ORDERED, UI, exchangeById } from '../../content/index.ts';
  import { dayNumber } from '../../learn/schedule.ts';
  import { buildSession, estimateMinutes, resumable } from '../../learn/session.ts';
  import { englishLevel } from '../../learn/shift.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app, go, startDaily } from '../state.svelte.ts';

  /**
   * Today: what today's lesson holds and how long it takes (REVIEW 1.11), 「つづきから」 when it was left part-way,
   * the week's stamps, and the 英語レベル meter (one level per ten phrases learned).
   */
  const life = lifetime();
  // The app may have stayed open past 4 a.m.
  app.today = dayNumber();
  const exists = (id: string) => !!exchangeById(id);

  const going = $derived(resumable(app.progress, app.today, exists));
  const plan = $derived(going ? null : buildSession(app.progress, ORDERED, app.today));
  const doneToday = $derived(app.progress.days.includes(app.today));
  const first = $derived(app.progress.started === null);
  const left = $derived(going ? going.steps.slice(going.index) : (plan?.steps ?? []));
  const mins = $derived(estimateMinutes(left));
  const newTitles = $derived(
    left.filter((s) => s.kind === 'meet').map((s) => exchangeById(s.exId)?.title ?? ''),
  );
  const reviews = $derived(left.filter((s) => (s.kind === 'catch' || s.kind === 'answer') && s.review).length);
  // Checks of today's new phrases belong to learning them; only the rest is practice.
  const learning = $derived(new Set(left.filter((s) => s.kind === 'meet' || s.kind === 'shadow').map((s) => s.exId)));
  const practice = $derived(
    left.filter((s) => (s.kind === 'catch' || s.kind === 'answer') && !s.review && !learning.has(s.exId)).length,
  );
  const day = $derived(app.progress.started === null ? 1 : app.today - app.progress.started + 1);
  const lv = $derived(englishLevel(app.progress));
  const week = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const d = app.today - 6 + i;
      return { d, done: app.progress.days.includes(d), label: '日月火水木金土'[new Date(d * 86400000).getUTCDay()] };
    }),
  );

  // A week after the last backup (or the first lesson), once today's lesson is done: never in the way of learning.
  const remindBackup = $derived(
    doneToday &&
      !going &&
      app.progress.days.length >= 3 &&
      app.backupLater !== app.today &&
      app.today - (app.progress.backedUp ?? app.progress.started ?? app.today) >= 7,
  );

  const hour = new Date().getHours();
  // おはよう in the morning, こんばんは after dark: "Hi!" covers both in English (REVIEW 3.3: never "Good night!").
  const greeting = hour >= 4 && hour < 11 ? UI.morning : hour >= 18 || hour < 4 ? UI.evening : UI.hi;

  const say = $derived.by(() => {
    if (going) return '続きからやろう！ 途中のところから始まるよ。';
    if (first) return 'ハチワレだよ。一緒に、話せる英語を練習しよう！ 1日10分くらいでOK。';
    if (doneToday) return '今日のレッスンは完了！ また明日ね。もっとやりたいときは「練習」へ。';
    if (!left.length) return '今日はお休みの日。習ったフレーズを「練習」で聞いてみよう。';
    return '今日のレッスンの準備ができてるよ。';
  });

  function begin() {
    if (doneToday && !going) go('practice');
    else if (!left.length) go('practice');
    else startDaily();
  }

  life.run(async (s) => {
    await stage.setCast(['hachiware', 'chiikawa']);
    calm(['hachiware', 'chiikawa']);
    await s.wait(300);
    act([{ who: 'hachiware', gesture: 'wave', face: 'smile' }]);
    await s.wait(1800);
    act([{ who: 'chiikawa', gesture: 'hop', face: 'happy' }]);
  });
</script>

<StepLayout>
  {#snippet top()}
    <Bubble who="hachiware" text={say}>
      {#snippet before()}
        <span class="hello"><UiWord t={greeting} size="bubble" /></span>
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    <div class="card lesson">
      <div class="lesson-head">
        <span class="chip">今日のレッスン</span>
        {#if doneToday && !going}
          <span class="done">完了 ✓</span>
        {:else if left.length}
          <span class="mins">約{mins}分</span>
        {/if}
      </div>
      {#if going}
        <p class="line"><b>途中から</b>：あと{left.length}ステップ</p>
      {:else if doneToday}
        <p class="line">今日のスタンプをもらいました。</p>
      {:else if left.length}
        {#if newTitles.length}<p class="line"><b>新しいフレーズ</b>：{newTitles.join('・')}</p>{/if}
        {#if reviews}<p class="line"><b>復習</b>：{reviews}問</p>{/if}
        {#if practice}<p class="line"><b>練習</b>：{practice}問</p>{/if}
      {:else}
        <p class="line">今日の分はありません。</p>
      {/if}
    </div>

    <div class="stats">
      <span class="chip">{day}日目</span>
      <span class="chip meter" aria-label="英語レベル{lv.level}。次のレベルまで、あと{lv.toNext}フレーズ">
        英語レベル{lv.level}
        <span class="track"><span class="fill" style="width:{Math.max(lv.fill * 100, 2)}%"></span></span>
        <span class="next">あと{lv.toNext}</span>
      </span>
      {#if app.offline === 'ready'}
        <span class="chip offline">✓ ネットなしでも使えます</span>
      {:else if app.offline === 'preparing'}
        <span class="chip offline">ネットなしで使う準備中…</span>
      {/if}
    </div>

    <div class="week" aria-label="この1週間">
      {#each week as w (w.d)}
        <span class="wday" class:today={w.d === app.today}>
          <span class="circle" class:done={w.done}>{w.done ? '✓' : ''}</span>
          <span class="wlabel">{w.label}</span>
        </span>
      {/each}
    </div>

    {#if remindBackup}
      <div class="card remind">
        <p class="line">
          <b>記録のバックアップ</b>：{app.progress.backedUp === null ? 'まだありません。' : '前回から1週間たちました。'}LINEやメモに保存しておくと、iPhoneを替えても続きから使えます。
        </p>
        <div class="row">
          <button class="btn soft" onclick={() => (app.backupLater = app.today)}>あとで</button>
          <button class="btn soft good" onclick={() => go('backup')}>保存する</button>
        </div>
      </div>
    {/if}
  {/snippet}
  {#snippet primary()}
    <button class="btn primary" onclick={begin}>
      {going ? '続きから' : doneToday || !left.length ? '練習する' : 'はじめる'}
    </button>
  {/snippet}
</StepLayout>

<style>
  .hello {
    display: block;
    font-size: 20px;
    margin-bottom: 2px;
  }
  .lesson-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .lesson .chip {
    background: var(--sun);
  }
  .mins,
  .done {
    font-weight: 900;
    font-size: 16px;
  }
  .done {
    color: #3e8a3a;
  }
  .line {
    margin: 4px 0 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.5;
  }
  .remind {
    display: grid;
    gap: 10px;
    background: var(--sun);
  }
  .remind .line {
    margin: 0;
    font-size: 14px;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .stats .chip {
    background: var(--white);
  }
  .stats .chip.offline {
    background: var(--paper-2);
    color: var(--ink-2);
  }
  .meter {
    gap: 6px;
  }
  .next {
    font-size: 12px;
    color: var(--ink-2);
  }
  .track {
    width: 54px;
    height: 9px;
    border: 2px solid var(--ink);
    border-radius: 99px;
    overflow: hidden;
    background: var(--white);
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--sun-2);
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .wday {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .circle {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px dashed var(--ink-3);
    display: grid;
    place-items: center;
    font-weight: 900;
    color: #e0607a;
  }
  .circle.done {
    border: 3px solid #e0607a;
    background: #fff7f8;
  }
  .wlabel {
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .today .wlabel {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
