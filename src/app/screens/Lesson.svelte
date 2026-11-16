<script lang="ts" module>
  export type { StepResult } from '../../learn/run.ts';
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { ORDERED, exchangeById } from '../../content/index.ts';
  import { finishStep, fromSaved, leaveRun, move, practiceRun, type Run, type StepResult } from '../../learn/run.ts';
  import { buildSession, newSaved, resumable, type Step } from '../../learn/session.ts';
  import { onInterruption } from '../audio.svelte.ts';
  import ConfirmQuit from '../components/ConfirmQuit.svelte';
  import LessonBar from '../components/LessonBar.svelte';
  import PauseSheet from '../components/PauseSheet.svelte';
  import { accentStyle } from '../friends.ts';
  import { calm } from '../scene.ts';
  import { lesson, pauseLesson, resumeLesson } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app, go, save } from '../state.svelte.ts';
  import Answer from '../steps/Answer.svelte';
  import Catch from '../steps/Catch.svelte';
  import Finish from '../steps/Finish.svelte';
  import Meet from '../steps/Meet.svelte';
  import Shadow from '../steps/Shadow.svelte';
  import { keepAwake } from '../wakelock.svelte.ts';

  /**
   * Runs a lesson step by step, with her in control (REVIEW section 1): ⏸ pauses everything, ← goes back a step,
   * the pause sheet restarts or skips a step, ✕ asks first. Today's lesson is saved after every step, so ✕, a reload
   * or a phone call never loses her place; 「続きから」 on the Today screen picks it up again on the same day.
   * The bookkeeping itself lives in src/learn/run.ts (tested).
   */
  const cfg = untrack(() => app.lesson);
  const daily = cfg.mode === 'daily';
  const exists = (id: string) => !!exchangeById(id);

  const run: Run = $state(
    untrack(() => {
      if (!daily) return practiceRun(cfg.steps, app.today);
      const going = resumable(app.progress, app.today, exists);
      if (going) return fromSaved($state.snapshot(going));
      const planned = newSaved(buildSession(app.progress, ORDERED, app.today), app.today);
      app.progress.session = planned;
      save();
      return fromSaved($state.snapshot(planned));
    }),
  );

  let restart = $state(0);
  let quitting = $state(false);

  const step = $derived(run.steps[run.index] as Step | undefined);
  const ex = $derived(step ? exchangeById(step.exId) : undefined);
  const cast = $derived(ex ? ex.cast : (['hachiware', 'chiikawa'] as const));
  const stamped = $derived(daily && app.progress.days.includes(run.day));

  resumeLesson();

  $effect(() => {
    void stage.setCast(cast);
  });

  // The screen stays on while a step runs, not while paused or on the last screen (REVIEW 4.2).
  const awake = $derived(!lesson.paused && !quitting && run.index < run.steps.length);
  $effect(() => keepAwake(awake));
  onDestroy(() => keepAwake(false));

  // A step whose exchange no longer exists (content changed) is passed over.
  $effect(() => {
    if (step && !ex) untrack(() => go_(1));
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

  function leave() {
    quitting = false;
    resumeLesson();
    calm(cast);
    leaveRun(run, app.progress);
    save();
    go(cfg.returnTo);
  }

  function askQuit() {
    pauseLesson();
    quitting = true;
  }
</script>

<div class="lesson" style={accentStyle(ex?.host ?? 'hachiware')}>
  {#if step && ex}
    <LessonBar index={run.index} total={run.steps.length} onQuit={askQuit} onPause={pauseLesson} />
    {#key `${run.index}:${restart}`}
      <div class="slot">
        {#if step.kind === 'meet'}
          <Meet {ex} onDone={() => next()} onBack={run.index > 0 ? back : null} />
        {:else if step.kind === 'shadow'}
          <Shadow {ex} onDone={() => next()} onBack={run.index > 0 ? back : null} />
        {:else if step.kind === 'catch'}
          <Catch {ex} {step} onDone={next} onBack={run.index > 0 ? back : null} />
        {:else}
          <Answer {ex} onDone={next} onBack={run.index > 0 ? back : null} />
        {/if}
      </div>
    {/key}
  {:else if run.index >= run.steps.length}
    <div class="slot">
      <Finish {daily} {stamped} counts={run.counts} onClose={leave} onMore={() => go('practice')} />
    </div>
  {/if}

  {#if quitting}
    <ConfirmQuit
      {daily}
      onYes={leave}
      onNo={() => {
        quitting = false;
        resumeLesson();
      }}
    />
  {:else if lesson.paused && run.index < run.steps.length}
    <PauseSheet
      canBack={run.index > 0}
      {daily}
      onResume={resumeLesson}
      onRestart={() => go_(0)}
      onBack={back}
      onSkip={() => go_(1)}
      onQuit={leave}
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
