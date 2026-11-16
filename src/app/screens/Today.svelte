<script lang="ts">
  import { ORDERED, TALKS, UI, exchangeById, talkById } from '../../content/index.ts';
  import { dayNumber } from '../../learn/schedule.ts';
  import { buildSession, estimateMinutes, resumable, type Step } from '../../learn/session.ts';
  import { nextToJoin } from '../../learn/partners.ts';
  import { englishLevel } from '../../learn/shift.ts';
  import Bubble from '../components/Bubble.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { FRIENDS } from '../friends.ts';
  import { act, calm, choosePartner, withPartner } from '../scene.ts';
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
  const reviews = $derived(left.filter((s) => (s.kind === 'catch' || s.kind === 'answer') && s.review).length);
  // Checks of today's new phrases belong to learning them; only the rest is practice.
  const learning = $derived(new Set(meets.map((s) => s.exId)));
  const practice = $derived(
    left.filter((s) => (s.kind === 'catch' || s.kind === 'answer') && !s.review && !learning.has(s.exId)).length,
  );
  /** Today's conversation (会話してみよう), once she has learned enough phrases for one. */
  const talks = $derived(left.filter((s) => s.kind === 'talk').length);
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
    if (doneToday) return '今日はおしまい！ また明日ね。';
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
        <p class="line">今日のスタンプをもらいました。</p>
      {:else if left.length}
        {#if newTitles.length}
          <p class="line">
            <b>新しいフレーズ</b>：{#each newTitles as t, i (i)}<span class="nobreak">「{t}」</span>{/each}
          </p>
        {/if}
        {#if reviews || practice || talks}
          <p class="line">
            {#if reviews}<b>復習</b>：{reviews}問{/if}{#if reviews && practice}・{/if}{#if practice}<b>練習</b>：{practice}問{/if}{#if talks && (reviews || practice)}・{/if}{#if talks}<b>会話</b>：{talks}{/if}
          </p>
        {/if}
      {:else}
        <p class="line">今日の分はありません。</p>
      {/if}
    </div>

    <div class="level" aria-label="英語レベル{lv.level}。次のレベルまで、あと{lv.toNext}フレーズ">
      <span class="level-name">英語レベル<b>{lv.level}</b></span>
      <span class="track"><span class="fill" style="width:{Math.max(lv.fill * 100, 3)}%"></span></span>
      <!-- The next level's friend, while one is still to join: something to look forward to (src/learn/partners.ts). -->
      <span class="next"
        >あと{lv.toNext}フレーズでレベル{lv.level + 1}{#if joinsNext?.level === lv.level + 1}（{FRIENDS[joinsNext.id].name}が仲間に！）{/if}</span
      >
    </div>

    <div class="week-box">
      <div class="week-head">
        <span>今週のスタンプ</span>
        {#if studied}<span class="muted">がんばった日：{studied}日</span>{/if}
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
    <button class="btn primary start" onclick={begin}>
      {going ? '続きから' : doneToday || !left.length ? '練習する' : 'はじめる'}
    </button>
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
  .level {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2px 10px;
    padding: 0 2px;
  }
  .level-name {
    font-size: 15px;
    font-weight: 800;
  }
  .level-name b {
    font-size: 20px;
    margin-left: 3px;
  }
  .next {
    grid-column: 1 / -1;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .track {
    height: 10px;
    border: var(--line) solid var(--ink);
    border-radius: 99px;
    overflow: hidden;
    background: var(--white);
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--sun-2);
  }
  .week-box {
    display: grid;
    gap: 6px;
    padding: 0 2px;
  }
  .week-head {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 800;
  }
  .offline {
    margin: 0;
    font-size: 12px;
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
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px dashed var(--ink-3);
    display: grid;
    place-items: center;
    font-size: 13px;
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
  /* On a short screen (an iPhone SE, or any iPhone in Safari with its bars), a slightly lower button leaves the
     lesson card, the level and the stamps room to show whole. */
  @media (max-height: 700px) {
    .btn.start {
      min-height: 54px;
    }
  }
</style>
