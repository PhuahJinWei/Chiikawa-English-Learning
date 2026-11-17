<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { setSoundMethod } from './audio.svelte.ts';
  import Notices from './components/Notices.svelte';
  import { noteError } from './errors.ts';
  import { askToKeepData } from '../learn/progress.ts';
  import Backup from './screens/Backup.svelte';
  import TabBar from './components/TabBar.svelte';
  import Tour from './components/Tour.svelte';
  import { isIOS, isStandalone } from './platform.ts';
  import { scene, sceneBox } from './scene-fit.svelte.ts';
  import { choosePartner, partnerOnStage, withPartner } from './scene.ts';
  import ErrorScreen from './screens/ErrorScreen.svelte';
  import InstallGuide from './screens/InstallGuide.svelte';
  import Lesson from './screens/Lesson.svelte';
  import Notebook from './screens/Notebook.svelte';
  import Practice from './screens/Practice.svelte';
  import SelfCheck from './screens/SelfCheck.svelte';
  import Settings from './screens/Settings.svelte';
  import Today from './screens/Today.svelte';
  import { stage } from './stage.ts';
  import { app, go, save } from './state.svelte.ts';

  /**
   * The app's frame: the friends' stage on top, the current screen under it, and the menu bar at the bottom on every
   * screen except a lesson (REVIEW 1.1). The stage is sized to what the friends do on each screen (the Focus design,
   * 2026-11-16): a large scene on Today and at the end of a lesson, a band in a lesson where they react to her, a
   * slim strip on the self-check (which measures it) and the install guide, and nothing on the list pages
   * (Notebook, Practice, Settings, Backup), which get the whole screen and stop the 3D drawing to save battery.
   */
  let stageEl: HTMLDivElement | undefined = $state();

  type StageMode = 'scene' | 'band' | 'strip' | 'none';
  const mode: StageMode = $derived(
    app.screen === 'today'
      ? 'scene'
      : app.screen === 'lesson'
        ? app.celebrating
          ? 'scene'
          : 'band'
        : app.screen === 'selfcheck' || app.screen === 'install'
          ? 'strip'
          : 'none',
  );
  $effect(() => {
    stage.setPaused(mode === 'none');
  });
  /** How far the panel's rounded top reaches up over the stage (px): the friends are framed to stand above it. */
  const OVERLAP = 22;
  /** On a short stage (the lesson's band, a page's strip), a closer shot: up to a fifth of the friends goes under the
   * panel's edge, so their faces show bigger. The celebration and Today show them whole. */
  const CLOSE_CROP = 0.2;
  $effect(() => {
    stage.setInsets({ bottom: mode === 'none' ? 0 : OVERLAP, crop: mode === 'band' || mode === 'strip' ? CLOSE_CROP : 0 });
  });

  const withTabs = $derived(app.screen !== 'lesson');
  const touring = $derived(!app.progress.settings.toured && app.screen === 'today');

  // Her sound setting. Untracked, so an automatic switch to the backup way is not undone (audio.svelte.ts).
  $effect(() => {
    const method = app.progress.settings.sound;
    untrack(() => setSoundMethod(method));
  });

  function tourDone() {
    app.progress.settings.toured = true;
    save();
  }

  onMount(() => {
    sceneBox(stageEl ?? null);
    if (stageEl) {
      // Hachiware and today's partner (src/learn/partners.ts); a friend's first day as her partner, they walk in.
      const partner = choosePartner();
      const cast = withPartner(['hachiware', 'chiikawa']);
      const walkIn = partner.first ? [partnerOnStage()] : [];
      void stage
        .mount(stageEl)
        .then(() => stage.setCast(cast, { walkIn }))
        .then(() => stage.followPointer(true));
    }
    let later = false;
    try {
      later = !!sessionStorage.getItem('eigo-friends/install-later');
    } catch {
      // ignore
    }
    // On iPhone, learning must happen in the home-screen app (it keeps its own saved data): guide there first.
    if (isIOS && !isStandalone && !later) go('install');
    // Ask iOS to keep her record when space runs low (home-screen apps are usually allowed; REVIEW 4.5).
    if (isStandalone) void askToKeepData();
  });
</script>

<div
  class="app mode-{mode}"
  class:no-tabs={!withTabs}
  style="--overlap: {OVERLAP}px{scene.fit === null ? '' : `; --scene-fit: ${scene.fit}px`}"
>
  <div class="stage" bind:this={stageEl} aria-hidden={mode === 'none'}></div>
  <Notices />
  <div class="lower">
    <main class="panel">
      <!-- A screen that fails to draw is replaced by the error screen; the menu and the friends keep working. The key
           gives every screen a fresh boundary, so a tap on the menu always leaves the error screen. -->
      {#key app.screen}
        <svelte:boundary onerror={(e) => noteError(e)}>
          {#if app.screen === 'today'}
            <Today />
          {:else if app.screen === 'notebook'}
            <Notebook />
          {:else if app.screen === 'practice'}
            <Practice />
          {:else if app.screen === 'settings'}
            <Settings />
          {:else if app.screen === 'lesson'}
            <!-- A new lesson can start from the end of the last one (もっと覚える): a fresh screen for each. -->
            {#key app.lessonKey}<Lesson />{/key}
          {:else if app.screen === 'selfcheck'}
            <SelfCheck />
          {:else if app.screen === 'install'}
            <InstallGuide />
          {:else if app.screen === 'backup'}
            <Backup />
          {/if}
          {#snippet failed(error, reset)}
            <ErrorScreen {error} {reset} />
          {/snippet}
        </svelte:boundary>
      {/key}
    </main>
    {#if withTabs}<TabBar />{/if}
    {#if touring}<Tour onDone={tourDone} />{/if}
    <!-- Sideways, the buttons would not fit: ask her to hold the phone upright (iOS ignores the manifest's
         orientation for home-screen apps; REVIEW 4.12). -->
    <div class="upright">
      <div class="card">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="15" y="6" width="18" height="32" rx="4" />
          <path d="M8 30a16 16 0 0 0 10 12M40 18A16 16 0 0 0 30 6" />
          <path d="M14 44l4-2-2-4M34 4l-4 2 2 4" />
        </svg>
        <p>iPhoneを縦にして使ってください</p>
      </div>
    </div>
    {#if app.updating}
      <div class="updating" role="status">
        <div class="card">
          <p class="up-title">アップデート中<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>
          <p class="muted">新しいバージョンを読み込んでいます。まもなく終わります。少しお待ちください。</p>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .app {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--paper);
    --stage-now: 0px;
    /* The scene's usual height, on Today and at the end of a lesson; a little less on a short screen (an iPhone SE). */
    --scene: clamp(230px, 44dvh, 420px);
  }
  @media (max-height: 700px) {
    .app {
      --scene: clamp(220px, 41dvh, 420px);
    }
  }
  /* On Today the scene gives up the room the cards below lack (src/app/scene-fit.svelte.ts), so they and the button
     show whole: never more than its usual height, and never under 210px, where the cards scroll instead. */
  .mode-scene {
    --stage-now: clamp(210px, var(--scene-fit, var(--scene)), var(--scene));
  }
  /* In a lesson the friends react while she works on the cards below, so the cards get most of the room
     (2026-11-17: the band was 32dvh, which left a small iPhone about 250px for the cards). */
  .mode-band {
    --stage-now: clamp(140px, 24dvh, 230px);
  }
  /* On a short screen (an iPhone SE's home-screen app is 647px tall) a little lower still, so a quiz's card and its
     answer fit under a three-line bubble instead of sliding under it (2026-11-17). */
  @media (max-height: 700px) {
    .mode-band {
      --stage-now: clamp(120px, 20dvh, 230px);
    }
  }
  .mode-strip {
    --stage-now: clamp(120px, 18dvh, 170px);
  }
  .stage {
    position: relative;
    flex: none;
    height: var(--stage-now);
    transition: height 0.35s ease;
    overflow: hidden;
    /* The meadow's sky and field (src/stage/Backdrop.ts), for the moment before the stage draws. */
    background: linear-gradient(#a3d7f0, #eaf5f0 37%, #d4eab6 38%, #c3e19c);
  }
  .lower {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin-top: calc(-1 * var(--overlap));
  }
  .panel {
    position: relative;
    flex: 1;
    min-height: 0;
    padding: 10px 16px 10px;
    background: var(--paper);
    /* The hand-drawn edge along the top. The top border is as deep as that line, so sheets laid over the panel
       (they fill the inside of its border) never cover it; the padding above is 2px less to make up for it. */
    border: 0 solid var(--ink);
    border-top-width: 4px;
    border-radius: 26px 26px 0 0;
    border-image: var(--frame-edge);
    display: flex;
    flex-direction: column;
  }
  /* No menu bar in a lesson: the panel keeps clear of the home indicator itself. */
  .no-tabs .panel {
    padding-bottom: calc(10px + var(--safe-bottom));
  }
  /* A page without the stage: the panel is the whole page, under the phone's status bar. */
  .mode-none .lower {
    margin-top: 0;
  }
  .mode-none .panel {
    border-top: none;
    /* The frame's picture is taken off through its variable: the build's minifier turns `border-image: none` here
       into an empty value, which browsers ignore, so the line kept showing at the page's top corners (2026-11-17). */
    --frame-edge: none;
    border-radius: 0;
    padding-top: calc(14px + var(--safe-top));
  }
  .panel > :global(*) {
    flex: 1;
    min-height: 0;
  }
  .upright {
    display: none;
  }
  @media (orientation: landscape) and (max-height: 500px) {
    .upright {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--paper);
    }
    .upright .card {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .upright p {
      margin: 0;
      font-size: 18px;
      font-weight: 900;
    }
    .upright svg {
      width: 48px;
      height: 48px;
      fill: none;
      stroke: var(--ink);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
  .updating {
    position: absolute;
    inset: 0;
    z-index: 9;
    display: grid;
    place-items: center;
    padding: 24px 20px;
    background: rgba(255, 249, 239, 0.95);
    border-radius: 26px 26px 0 0;
  }
  .updating p {
    margin: 0;
    line-height: 1.6;
    font-weight: 700;
  }
  .up-title {
    font-size: 20px;
    font-weight: 900 !important;
    margin-bottom: 6px !important;
  }
  .dots i {
    font-style: normal;
    animation: blink 1.2s infinite;
  }
  .dots i:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dots i:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 0.2;
    }
    40% {
      opacity: 1;
    }
  }
</style>
