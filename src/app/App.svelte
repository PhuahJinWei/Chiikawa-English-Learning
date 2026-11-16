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
   * screen except a lesson (REVIEW 1.1). The stage is larger on Today, smaller in a lesson and on list screens.
   */
  let stageEl: HTMLDivElement | undefined = $state();

  const withTabs = $derived(app.screen !== 'lesson');
  const size = $derived(app.screen === 'today' ? 'big' : app.screen === 'lesson' ? 'mid' : 'small');
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
    if (stageEl) {
      void stage
        .mount(stageEl)
        .then(() => stage.setCast(['hachiware', 'chiikawa']))
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

<div class="app size-{size}">
  <div class="stage" bind:this={stageEl}></div>
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
            <Lesson />
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
    --stage-now: clamp(130px, 21dvh, 190px);
  }
  .size-big {
    --stage-now: clamp(190px, 33dvh, 340px);
  }
  .size-mid {
    --stage-now: clamp(150px, 26dvh, 280px);
  }
  .stage {
    position: relative;
    flex: none;
    height: var(--stage-now);
    transition: height 0.35s ease;
    overflow: hidden;
    background: linear-gradient(#cfe9f6, #fdf3e2);
  }
  .lower {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    margin-top: -22px;
  }
  .panel {
    position: relative;
    flex: 1;
    min-height: 0;
    padding: 12px 16px 10px;
    background: var(--paper);
    border-top: var(--line) solid var(--ink);
    border-radius: 26px 26px 0 0;
    box-shadow: 0 -4px 0 rgba(102, 67, 47, 0.08);
    display: flex;
    flex-direction: column;
  }
  .size-mid .panel {
    padding-bottom: calc(10px + var(--safe-bottom));
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
