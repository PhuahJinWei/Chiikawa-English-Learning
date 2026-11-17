<script lang="ts">
  import { onDestroy } from 'svelte';
  import { ORDERED, TALKS, UI, exchangeById, talkById } from '../../content/index.ts';
  import { dayNumber } from '../../learn/schedule.ts';
  import { buildMore, buildSession, estimateMinutes, resumable, type Step } from '../../learn/session.ts';
  import { nextToJoin } from '../../learn/partners.ts';
  import { englishLevel } from '../../learn/shift.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { FRIENDS } from '../friends.ts';
  import { fitScene } from '../scene-fit.svelte.ts';
  import { act, calm, choosePartner, partnerOnStage, pick, withPartner } from '../scene.ts';
  import { lifetime, type Run } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app, go, startDaily, startMore } from '../state.svelte.ts';

  /**
   * Today: what today's lesson holds and how long it takes (REVIEW 1.11), 「つづきから」 when it was left part-way,
   * the week's stamps, and the 英語レベル meter (one level per ten phrases learned). The friends' scene above gives
   * the cards the room they need, so they and the button always show whole (src/app/scene-fit.svelte.ts).
   */
  const life = lifetime();
  onDestroy(() => fitScene(null));
  // The greeting lies over the top of the stage: the friends are framed to stand below it, clear of its tail (18px).
  let greetEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    const el = greetEl;
    if (!el) return;
    const report = () => stage.setInsets({ top: el.getBoundingClientRect().bottom + 22 });
    const watch = new ResizeObserver(report);
    watch.observe(el);
    report();
    return () => {
      watch.disconnect();
      stage.setInsets({ top: 0 });
    };
  });
  // The app may have stayed open past 4 a.m.
  app.today = dayNumber();
  // Hachiware and today's partner (src/learn/partners.ts): a friend's first day as her partner gets a welcome.
  const partner = choosePartner();
  const cast = withPartner(['hachiware', 'chiikawa']);
  const exists = (s: Step) => (s.kind === 'talk' ? !!talkById(s.talkId) : !!exchangeById(s.exId));

  const going = $derived(resumable(app.progress, app.today, exists));
  const plan = $derived(going ? null : buildSession(app.progress, ORDERED, app.today, TALKS));
  const doneToday = $derived(app.progress.days.includes(app.today));
  const first = $derived(app.progress.started === null);
  const left = $derived(going ? going.steps.slice(going.index) : (plan?.steps ?? []));
  const mins = $derived(estimateMinutes(left));
  const meets = $derived(left.filter((s): s is Extract<Step, { kind: 'meet' }> => s.kind === 'meet'));
  const newTitles = $derived(meets.map((s) => exchangeById(s.exId)?.title ?? ''));
  // Once today's lesson is done she can keep going (もっと覚える): the next new phrases in the path, round after round.
  const more = $derived(doneToday && !going ? buildMore(app.progress, ORDERED) : null);
  const moreTitles = $derived(
    (more?.steps ?? []).flatMap((s) => (s.kind === 'meet' ? [exchangeById(s.exId)?.title ?? ''] : [])),
  );
  const reviews = $derived(left.filter((s) => (s.kind === 'catch' || s.kind === 'answer') && s.review).length);
  // Checks of today's new phrases belong to learning them; only the rest is practice.
  const learning = $derived(new Set(meets.map((s) => s.exId)));
  const practice = $derived(
    left.filter((s) => (s.kind === 'catch' || s.kind === 'answer') && !s.review && !learning.has(s.exId)).length,
  );
  /** Today's conversation (会話してみよう), once she has learned enough phrases for one. */
  const talks = $derived(left.filter((s) => s.kind === 'talk').length);
  /** What today's lesson holds, in one short line under its new phrases: 新しいフレーズ 2・復習 3問・練習 2問. */
  const rest = $derived(
    [
      { name: '新しいフレーズ', n: newTitles.length, unit: '' },
      { name: '復習', n: reviews, unit: '問' },
      { name: '練習', n: practice, unit: '問' },
      { name: '会話', n: talks, unit: '' },
    ].filter((r) => r.n > 0),
  );
  // The days she has studied (one stamp each), not the days since she started: a day she skipped does not count.
  const studied = $derived(app.progress.days.length);
  const lv = $derived(englishLevel(app.progress));
  const joinsNext = $derived(nextToJoin(lv.level));
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

  // One short line each: the bubble floats above the friends, and on a small iPhone a longer one covers their heads.
  const say = $derived.by(() => {
    if (going) return '続きからやろう！';
    if (first) return 'ハチワレだよ。一緒に英語を話そう！';
    if (partner.first && !doneToday) return `今日から${FRIENDS[partner.id].name}も一緒だよ！`;
    if (remindBackup) return 'おつかれさま！記録をバックアップしよう。';
    if (doneToday) return moreTitles.length ? 'おつかれさま！もっと覚えてもいいよ。' : '今日はおしまい！ また明日ね。';
    if (!left.length) return '今日はお休み。「練習」で復習しよう！';
    return '今日のレッスン、準備できてるよ！';
  });

  function begin() {
    if (doneToday && !going) go('practice');
    else if (!left.length) go('practice');
    else startDaily();
  }

  /**
   * One small moment, now and then while she is on this screen (2026-11-17): a look between them, a hop or a wave,
   * a sit, or what fits the hour (a snack at lunchtime, a nap late in the evening). They stay where they stand:
   * walking about would keep the stage drawing at full speed and take them under the bubble.
   */
  async function moment(s: Run) {
    const buddy = partnerOnStage();
    const hour = new Date().getHours();
    // A rest wears its own face (eyes shut for a nap), then the greeting's happy face comes back.
    const rest = async (gesture: 'sit' | 'eat' | 'doze', ms: number) => {
      stage.setFace(buddy, null);
      void stage.play(buddy, gesture);
      if (gesture === 'doze') stage.mark(buddy, 'zzz');
      await s.wait(ms);
      stage.stop(buddy);
      act([{ who: 'chiikawa', face: 'happy' }]);
    };
    const moments = [
      async () => {
        stage.lookAt('hachiware', buddy);
        await s.wait(400);
        stage.lookAt(buddy, 'hachiware');
        await s.wait(1600);
        stage.lookAt('hachiware', 'learner');
        stage.lookAt(buddy, 'learner');
      },
      async () => act([{ who: 'chiikawa', gesture: 'hop', face: 'happy' }]),
      async () => act([{ who: 'hachiware', gesture: 'wave', face: 'smile' }]),
      () => rest('sit', 6000),
      ...(hour >= 11 && hour < 14 ? [() => rest('eat', 5000)] : []),
      ...(hour >= 21 || hour < 5 ? [() => rest('doze', 8000)] : []),
    ];
    await pick(moments)();
  }

  life.run(async (s) => {
    // A friend's first day as her partner, they walk in (App.svelte asks the same, whichever comes first).
    await stage.setCast(cast, { walkIn: partner.first ? [partnerOnStage()] : [] });
    calm(cast);
    await s.wait(300);
    act([{ who: 'hachiware', gesture: 'wave', face: 'smile' }]);
    await s.wait(partner.first ? 2600 : 1800);
    // Her partner (ちいかわ's part, played by today's partner: src/app/scene.ts); a new one gets a heart.
    act([{ who: 'chiikawa', gesture: 'hop', face: 'happy', ...(partner.first ? { mark: 'heart' as const } : {}) }]);
    // Then a small moment every 15 to 25 seconds, not with Reduce Motion, and not under the first-run tour.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (;;) {
      await s.wait(15000 + Math.random() * 10000);
      if (app.progress.settings.toured) await moment(s);
    }
  });
</script>

<!-- Hachiware's greeting floats over the scene, above the friends (not during the first-run tour, which greets her). -->
{#if app.progress.settings.toured}
  <div class="greet" bind:this={greetEl}>
    <Bubble who="hachiware" text={say} tail="down" named={false}>
      {#snippet before()}
        <span class="hello"><UiWord t={greeting} size="bubble" /></span>
      {/snippet}
    </Bubble>
  </div>
{/if}

<!-- Phrase titles as small labels that wrap whole, never in the middle of a title. -->
{#snippet chips(titles: string[])}
  <ul class="phrases">
    {#each titles as t, i (i)}<li>{t}</li>{/each}
  </ul>
{/snippet}

<StepLayout onFit={fitScene}>
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
        <!-- 完了 ✓ and the pink stamp below already say it is done: the card shows what comes next, if anything. A
             backup reminder comes first; the next phrases show again once she has saved or said あとで. -->
        {#if remindBackup}
          <!-- Hachiware asks for it in the greeting; the card keeps to a label and the two buttons, so it still fits
               a small iPhone. The backup page says why it matters. -->
          <p class="label">記録のバックアップ（{app.progress.backedUp === null ? 'まだありません' : '前回から1週間'}）</p>
          <div class="row remind">
            <button class="btn soft" onclick={() => (app.backupLater = app.today)}>あとで</button>
            <button class="btn soft good" onclick={() => go('backup')}>保存する</button>
          </div>
        {:else if moreTitles.length}
          <p class="label">次の新しいフレーズ</p>
          {@render chips(moreTitles)}
        {:else}
          <p class="line">今日のスタンプをもらいました。</p>
        {/if}
      {:else if left.length}
        {#if newTitles.length}{@render chips(newTitles)}{/if}
        {#if rest.length}
          <!-- Each count whole: when they do not fit on one line, the line breaks between them. -->
          <ul class="meta">
            {#each rest as r (r.name)}<li>{r.name} <b>{r.n}</b>{r.unit}</li>{/each}
          </ul>
        {/if}
      {:else}
        <p class="line">今日の分はありません。</p>
      {/if}
    </div>

    <!-- Her progress in one card: the English level, then the week's stamps. -->
    <section class="card soft progress">
      <div class="level" aria-label="英語レベル{lv.level}。次のレベルまで、あと{lv.toNext}フレーズ">
        <span class="level-name">英語レベル<b>{lv.level}</b></span>
        <span class="track"><span class="fill" style="width:{Math.max(lv.fill * 100, 3)}%"></span></span>
        <!-- The next level's friend, while one is still to join: something to look forward to (src/learn/partners.ts). -->
        <span class="to-next"
          >あと<b>{lv.toNext}</b>フレーズでレベル{lv.level + 1}{#if joinsNext?.level === lv.level + 1}、{FRIENDS[joinsNext.id].name}が仲間に！{/if}</span
        >
      </div>

      <div class="week-box">
        <div class="week-head">
          <span>今週のスタンプ</span>
          {#if studied}<span class="studied">がんばった日 <b>{studied}</b>日</span>{/if}
        </div>
        <!-- Each day's letter sits in its circle, and a stamped day is inked over in pink like a date stamp. -->
        <div class="week">
          {#each week as w (w.d)}
            <span
              class="day"
              class:done={w.done}
              class:today={w.d === app.today}
              role="img"
              aria-label="{w.label}曜日{w.done ? '：スタンプあり' : ''}">{w.label}</span
            >
          {/each}
        </div>
      </div>
    </section>

    <!-- "Ready offline" is for the first open (the install guide tells her to look for it); after her first lesson it
         only takes room. Not being ready yet always shows. -->
    {#if app.offline === 'ready' && !app.progress.days.length}
      <p class="offline">✓ ネットなしでも使えます</p>
    {:else if app.offline === 'preparing'}
      <p class="offline">ネットなしで使う準備中…</p>
    {/if}
  {/snippet}
  {#snippet primary()}
    {#if moreTitles.length}
      <div class="pair">
        <button class="btn soft" onclick={() => go('practice')}>練習する</button>
        <button class="btn primary start" onclick={startMore}>もっと覚える</button>
      </div>
    {:else}
      <button class="btn primary start" onclick={begin}>
        {going ? '続きから' : doneToday || !left.length ? '練習する' : 'はじめる'}
      </button>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .greet {
    position: fixed;
    top: calc(var(--safe-top) + 12px);
    left: 16px;
    right: 16px;
    max-width: 520px;
    margin: 0 auto;
    z-index: 4;
  }
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
  /* The backup reminder's buttons, in the lesson card once the lesson is done. */
  .remind .btn {
    min-height: 44px;
  }
  /* The new phrases: small labels that wrap whole, never in the middle of a title. */
  .label {
    margin: 8px 0 5px;
    font-size: 13.5px;
    font-weight: 800;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .phrases {
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .label + .phrases {
    margin-top: 0;
  }
  .phrases li {
    padding: 4px 11px;
    border-radius: 10px;
    background: var(--paper-2);
    font-size: 15px;
    font-weight: 800;
    line-height: 1.35;
  }
  .meta {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .meta li {
    white-space: nowrap;
  }
  .meta b,
  .to-next b,
  .studied b {
    margin: 0 1px;
    font-size: 15px;
    color: var(--ink);
  }
  /* Her progress in one card: the level, a dashed line (as between the items of a settings card), the stamps. */
  .progress {
    display: grid;
    gap: 10px;
    padding: 10px 14px 12px;
  }
  .level {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 4px 12px;
  }
  .level-name {
    font-size: 15px;
    font-weight: 800;
    line-height: 1.3;
  }
  .level-name b {
    margin-left: 4px;
    font-size: 22px;
    font-weight: 900;
    line-height: 1;
  }
  .to-next {
    grid-column: 1 / -1;
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .track {
    height: 12px;
    border: var(--line) solid var(--ink);
    border-radius: 99px;
    overflow: hidden;
    background: var(--paper);
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--sun-2);
  }
  .week-box {
    display: grid;
    gap: 6px;
    padding-top: 10px;
    border-top: 2px dashed var(--paper-3);
  }
  .week-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 14px;
    font-weight: 800;
    line-height: 1.4;
  }
  .studied {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .offline {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    justify-items: center;
  }
  .day {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px dashed var(--ink-3);
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 800;
    color: var(--ink-2);
  }
  /* Today, before its stamp: a darker ring. */
  .day.today {
    border-color: var(--ink-2);
    color: var(--ink);
  }
  /* A stamped day: the same rubber-stamp ring as the stamp at the end of a lesson, small. */
  .day.done {
    border: none;
    background: var(--stamp-sm) center / 100% 100% no-repeat, #fff7f8;
    color: #e0607a;
    font-weight: 900;
  }
  /* After today's lesson: 練習する beside もっと覚える, as at the end of a lesson. */
  .pair {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 10px;
    align-items: stretch;
  }
  .pair .soft {
    min-height: 60px;
  }
  /* On all but the tallest iPhones (the home-screen app of an iPhone 13 is 797px tall: the status bar and the home
     bar take their share), a slightly lower button and tighter cards, so the friends' scene above keeps its size. */
  @media (max-height: 820px) {
    .btn.start,
    .pair .soft {
      min-height: 52px;
    }
    .lesson {
      padding: 8px 14px 10px;
    }
    .lesson-head {
      margin-bottom: 2px;
    }
    .label {
      margin: 4px 0 3px;
    }
    .phrases li {
      padding: 3px 10px;
    }
    .meta {
      margin-top: 6px;
    }
    .progress {
      gap: 6px;
      padding: 7px 14px 8px;
    }
    .level {
      gap: 2px 12px;
    }
    .week-box {
      gap: 4px;
      padding-top: 6px;
    }
    .day {
      width: 29px;
      height: 29px;
      font-size: 13px;
    }
  }
</style>
