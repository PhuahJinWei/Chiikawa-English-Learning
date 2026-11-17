<script lang="ts" module>
  export type { StepResult } from '../../learn/run.ts';
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { ORDERED, TALKS, exchangeById, talkById } from '../../content/index.ts';
  import { newNote, noteFor, putNote } from '../../learn/notes.ts';
  import { joinedBetween } from '../../learn/partners.ts';
  import { finishStep, fromSaved, leaveRun, move, practiceRun, skipKnown, type Run, type StepResult } from '../../learn/run.ts';
  import { buildMore, buildSession, newSaved, resumable, unmet, type Step } from '../../learn/session.ts';
  import { englishLevel } from '../../learn/shift.ts';
  import { onInterruption } from '../audio.svelte.ts';
  import LessonBar from '../components/LessonBar.svelte';
  import PauseSheet from '../components/PauseSheet.svelte';
  import { accentStyle } from '../friends.ts';
  import { calm, withPartner } from '../scene.ts';
  import { sfx } from '../sfx.ts';
  import { lesson, pauseLesson, resumeLesson } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app, go, save, startMore } from '../state.svelte.ts';
  import { STEP_NAMES } from '../step-kinds.ts';
  import Answer from '../steps/Answer.svelte';
  import Talk from '../steps/Talk.svelte';
  import Catch from '../steps/Catch.svelte';
  import Finish from '../steps/Finish.svelte';
  import Meet from '../steps/Meet.svelte';
  import { keepAwake } from '../wakelock.svelte.ts';

  /**
   * Runs a lesson step by step, with her in control (REVIEW section 1): ⏸ pauses everything and opens the menu
   * (restart or skip a step, go back, stop for today), ← goes back a step. Today's lesson is saved after every step,
   * so stopping, a reload or a phone call never loses her place; 「続きから」 on the Today screen picks it up again on
   * the same day. The bookkeeping itself lives in src/learn/run.ts (tested).
   */
  const cfg = untrack(() => app.lesson);
  // Today's lesson and もっと覚える are recorded and saved alike; only practice is not.
  const daily = cfg.mode !== 'practice';
  // More new phrases after today's lesson: today's stamp was already given when it began. Found from the stamp, not
  // the mode, so a round she left part-way and continues (続きから) is still one.
  const extra = daily && untrack(() => app.progress.days.includes(app.today));
  const exists = (s: Step) => (s.kind === 'talk' ? !!talkById(s.talkId) : !!exchangeById(s.exId));

  const run: Run = $state(
    untrack(() => {
      if (!daily) return practiceRun(cfg.steps, app.today);
      const going = resumable(app.progress, app.today, exists);
      if (going) return fromSaved($state.snapshot(going));
      const plan =
        cfg.mode === 'more' ? buildMore(app.progress, ORDERED) : buildSession(app.progress, ORDERED, app.today, TALKS);
      const planned = newSaved(plan, app.today);
      app.progress.session = planned;
      save();
      return fromSaved($state.snapshot(planned));
    }),
  );

  let restart = $state(0);

  const step = $derived(run.steps[run.index] as Step | undefined);
  const ex = $derived(step && step.kind !== 'talk' ? exchangeById(step.exId) : undefined);
  const talk = $derived(step?.kind === 'talk' ? talkById(step.talkId) : undefined);
  /** The step's name in the top bar: what she is doing now. */
  const label = $derived(
    !step ? '' : step.kind === 'answer' && ex?.kind === 'say' ? '言ってみよう' : STEP_NAMES[step.kind],
  );
  const tag = $derived(!daily ? '練習' : step && 'review' in step && step.review ? '復習' : '');
  const stamped = $derived(daily && app.progress.days.includes(run.day));
  // Her level when the lesson began, and where it ended: a level that went up is celebrated at the end, together
  // with a friend who joins at that level (src/learn/partners.ts).
  const levelBefore = untrack(() => englishLevel(app.progress).level);
  const finished = $derived(run.index >= run.steps.length);
  // At the end of a round of もっと覚える, whether there are new phrases left for another one.
  const phrasesLeft = $derived(finished && unmet(app.progress, ORDERED).length > 0);
  const levelUp = $derived(finished && englishLevel(app.progress).level > levelBefore ? englishLevel(app.progress).level : null);
  const joining = $derived(levelUp ? (joinedBetween(levelBefore, levelUp).at(-1) ?? null) : null);
  // ちいかわ's part is played by today's partner; a friend who has just joined comes on stage for the celebration.
  const cast = $derived([
    ...withPartner(ex?.cast ?? talk?.cast ?? ['hachiware', 'chiikawa']),
    ...(joining && finished ? [joining] : []),
  ]);

  resumeLesson();

  $effect(() => {
    void stage.setCast(cast);
  });

  // The screen stays on while a step runs, not while paused or on the last screen (REVIEW 4.2).
  const awake = $derived(!lesson.paused && run.index < run.steps.length);
  $effect(() => keepAwake(awake));
  onDestroy(() => keepAwake(false));

  // A step whose exchange no longer exists (content changed) is passed over.
  $effect(() => {
    if (step && !ex && !talk) untrack(() => go_(1));
  });

  // Leaving the app or a sound interruption pauses the lesson; coming back on a new day starts that day's lesson
  // fresh (REVIEW 2.11).
  $effect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        pauseLesson();
        return;
      }
      if (daily && app.today !== run.day) {
        app.progress.session = null;
        save();
        resumeLesson();
        go('today');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const offInterrupt = onInterruption(() => {
      if (run.index < run.steps.length) pauseLesson();
    });
    // Turned sideways, the app is covered by 「iPhoneを縦にして」 (App.svelte): nothing should play behind it.
    const sideways = matchMedia('(orientation: landscape) and (max-height: 500px)');
    const onTurn = () => {
      if (sideways.matches && run.index < run.steps.length) pauseLesson();
    };
    sideways.addEventListener('change', onTurn);
    return () => {
      sideways.removeEventListener('change', onTurn);
      document.removeEventListener('visibilitychange', onVisibility);
      offInterrupt();
      resumeLesson();
    };
  });

  /** Moves and saves (practice too: its practised times and missed lines are kept). */
  function go_(by: number) {
    move(run, app.progress, by);
    restart++;
    resumeLesson();
    save();
  }

  function next(r: StepResult = {}) {
    finishStep(run, app.progress, exchangeById, r, Date.now());
    go_(1);
  }

  const back = () => go_(-1);

  /** もう知ってる on a new phrase (today's lesson only): it counts as known, and today's steps for it are dropped. */
  function known() {
    if (!ex) return;
    sfx.chime();
    skipKnown(run, app.progress, ex);
    go_(1);
  }

  // Keeping the phrase of this step among her memos, from the pause menu (as メモに追加 does in the notebook).
  const memoLine = $derived(ex ? (ex.kind === 'say' ? ex.short[0] : ex.heard[0]) : null);
  let memoFull = $state(false);
  function addMemo() {
    if (!ex || !memoLine) return;
    memoFull = !putNote(app.progress, newNote(memoLine.en, memoLine.ja, Date.now(), ex.id));
    if (!memoFull) save();
  }

  function leave() {
    resumeLesson();
    calm(cast);
    leaveRun(run, app.progress);
    save();
    go(cfg.returnTo);
  }
</script>

<div class="lesson" style={accentStyle(ex?.host ?? 'hachiware')}>
  {#if step && (ex || talk)}
    <LessonBar index={run.index} total={run.steps.length} kind={step.kind} {label} {tag} onPause={pauseLesson} />
    {#key `${run.index}:${restart}`}
      <div class="slot">
        {#if talk}
          <Talk {talk} onDone={() => next()} onBack={run.index > 0 ? back : null} />
        {:else if ex && step.kind === 'meet'}
          <Meet {ex} onDone={() => next()} onBack={run.index > 0 ? back : null} onKnown={daily ? known : null} />
        {:else if ex && step.kind === 'catch'}
          <Catch {ex} {step} onDone={next} onBack={run.index > 0 ? back : null} />
        {:else if ex}
          <Answer {ex} onDone={next} onBack={run.index > 0 ? back : null} />
        {/if}
      </div>
    {/key}
  {:else if run.index >= run.steps.length}
    <div class="slot">
      <Finish
        {daily}
        {extra}
        {stamped}
        {levelUp}
        joined={joining}
        counts={run.counts}
        {phrasesLeft}
        onClose={leave}
        onMore={() => (extra && phrasesLeft ? startMore() : go('practice'))}
      />
    </div>
  {/if}

  {#if lesson.paused && run.index < run.steps.length}
    <PauseSheet
      canBack={run.index > 0}
      {daily}
      onResume={resumeLesson}
      onRestart={() => go_(0)}
      onBack={back}
      onSkip={() => go_(1)}
      onQuit={leave}
      memo={memoLine ? { noted: !!noteFor(app.progress, memoLine.en), full: memoFull, onAdd: addMemo } : null}
    />
  {/if}
</div>

<style>
  .lesson {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .slot {
    flex: 1;
    min-height: 0;
  }
</style>
