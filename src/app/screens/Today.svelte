<script lang="ts">
  import { ORDERED, TALKS, UI, exchangeById, talkById } from '../../content/index.ts';
  import { dayNumber } from '../../learn/schedule.ts';
  import { buildMore, buildSession, estimateMinutes, resumable, type Step } from '../../learn/session.ts';
  import { nextToJoin } from '../../learn/partners.ts';
  import { englishLevel } from '../../learn/shift.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { FRIENDS } from '../friends.ts';
  import { act, calm, choosePartner, withPartner } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app, go, startDaily, startMore } from '../state.svelte.ts';

  /**
   * Today: what today's lesson holds and how long it takes (REVIEW 1.11), 「つづきから」 when it was left part-way,
   * the week's stamps, and the 英語レベル meter (one level per ten phrases learned).
   */
  const life = lifetime();
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
    if (doneToday) return moreTitles.length ? 'おつかれさま！もっと覚えてもいいよ。' : '今日はおしまい！ また明日ね。';
    if (!left.length) return '今日はお休み。「練習」で復習しよう！';
    return '今日のレッスン、準備できてるよ！';
  });

  function begin() {
    if (doneToday && !going) go('practice');
    else if (!left.length) go('practice');
    else startDaily();
  }

  life.run(async (s) => {
    await stage.setCast(cast);
    calm(cast);
    await s.wait(300);
    act([{ who: 'hachiware', gesture: 'wave', face: 'smile' }]);
    await s.wait(1800);
    // Her partner (ちいかわ's part, played by today's partner: src/app/scene.ts); a new one gets a heart.
    act([{ who: 'chiikawa', gesture: 'hop', face: 'happy', ...(partner.first ? { mark: 'heart' as const } : {}) }]);
  });
</script>

<!-- Hachiware's greeting floats over the scene, above the friends (not during the first-run tour, which greets her). -->
{#if app.progress.settings.toured}
  <div class="greet">
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

<StepLayout>
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
        <!-- 完了 ✓ and the pink stamp below already say it is done: the card shows what comes next, if anything. -->
        {#if moreTitles.length}
          <p class="label">次の新しいフレーズ</p>
          {@render chips(moreTitles)}
        {:else}
          <p class="line">今日のスタンプをもらいました。</p>
        {/if}
      {:else if left.length}
        {#if newTitles.length}{@render chips(newTitles)}{/if}
        {#if rest.length}
          <p class="meta">
            {#each rest as r, i (r.name)}{#if i}<span class="sep">・</span>{/if}{r.name} <b>{r.n}</b>{r.unit}{/each}
          </p>
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
  .remind {
    display: grid;
    gap: 10px;
    background: var(--sun);
  }
  .remind .line {
    margin: 0;
    font-size: 14px;
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
    margin: 10px 0 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .meta b,
  .to-next b,
  .studied b {
    margin: 0 1px;
    font-size: 15px;
    color: var(--ink);
  }
  .sep {
    margin: 0 3px;
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
  /* On a short screen (an iPhone SE, or any iPhone in Safari with its bars), a slightly lower button and tighter
     cards leave the lesson card and her progress room to show whole. */
  @media (max-height: 700px) {
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
