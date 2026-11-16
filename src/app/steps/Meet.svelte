<script lang="ts">
  import { untrack } from 'svelte';
  import { UI, replyWord } from '../../content/index.ts';
  import type { Exchange, Line } from '../../content/types.ts';
  import { stop, type Channel } from '../audio.svelte.ts';
  import { audioPath } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm } from '../scene.ts';
  import { lifetime, type Run } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';

  /**
   * Meet: ears first, one thing per page, so that each page fits the screen (2026-11-17; it used to be one long page):
   *
   * 1. The phrase. It plays twice before any text appears; then the card shows it with its meaning and when it is
   *    used, and it plays once more. For a phrase she says, the situation is shown first (こんなとき).
   * 2. Other ways of saying it, if there are any.
   * 3. For a phrase she answers, the reply: the phrase, then the reply, heard before it is shown (REVIEW 2.3).
   *
   * 次へ goes to the next page and ← 前へ to the one before; a page she has seen comes back as she left it, without
   * playing again. Every card can be replayed and every block tapped. Hachiware asks her to say out loud what she will
   * say, in her own time: there is no timed repeat-after-me (removed 2026-11-17, your decision).
   */
  let {
    ex: exProp,
    onDone,
    onBack,
    onKnown = null,
  }: {
    ex: Exchange;
    onDone: () => void;
    onBack: (() => void) | null;
    /** もう知ってる: she already knows this phrase (today's lesson only; never in practice). */
    onKnown?: (() => void) | null;
  } = $props();
  const ex = untrack(() => exProp);

  const life = lifetime();
  const cast = ex.cast;
  const isSay = ex.kind === 'say';
  const main: Line = isSay ? ex.short[0] : ex.heard[0];
  const channel: Channel = isSay ? 'model' : 'other';
  const others = isSay ? [] : ex.heard.slice(1);
  const replies = ex.kind === 'reply' ? ex.short : [];

  type Page = 'phrase' | 'others' | 'reply';
  const pages: Page[] = ['phrase'];
  if (others.length) pages.push('others');
  if (replies.length) pages.push('reply');

  let at = $state(0);
  const page = $derived(pages[at]);
  /** Pages shown to the end once: they come back as she left them. */
  const seen = new Set<number>();

  let say = $state('');
  let look = $state(false);
  let showMain = $state(false);
  let reveal = $state(false);
  let shownOthers = $state(0);
  /** Reply cards on screen, and how many of them show their text yet. */
  let shownReplies = $state(0);
  let revealedReplies = $state(0);
  let canGo = $state(false);
  let layout: StepLayout | undefined = $state();

  /**
   * What Hachiware says once a page is done, one line at a time: what to do now, then what comes next or that every
   * card can be heard again. One short line keeps the bubble small, so the cards keep their room.
   */
  function doneLines(i: number): string[] {
    const next = pages[i + 1];
    const then = next === 'others' ? '次は、ほかの言い方を聞いてみよう' : next === 'reply' ? '次は、答え方を聞いてみよう' : 'タップで何度でも聞けるよ';
    if (pages[i] === 'phrase') return isSay && !next ? ['まねして、声に出して言ってみよう', then] : [then];
    if (pages[i] === 'others') return ['どれも同じ場面で使うよ', then];
    return ['答えをまねして、声に出して言ってみよう', then];
  }

  /** A page as she left it: everything shown, 次へ ready. */
  function settle(i: number) {
    seen.add(i);
    if (pages[i] === 'phrase') {
      showMain = true;
      reveal = true;
    } else if (pages[i] === 'others') shownOthers = others.length;
    else shownReplies = revealedReplies = replies.length;
    look = false;
    canGo = true;
    const lines = doneLines(i);
    life.run(async (s) => {
      for (const [k, line] of lines.entries()) {
        if (k) await s.wait(3000);
        say = line;
      }
    });
  }

  function show(i: number) {
    if (i !== at) stop(); // what the page she leaves was playing
    at = i;
    canGo = false;
    look = false;
    layout?.toTop();
    if (seen.has(i)) {
      settle(i); // its own run ends whatever the page she left was still doing
      return;
    }
    life.run(async (s) => {
      calm(cast);
      if (pages[i] === 'phrase') await phrase(s, i);
      else if (pages[i] === 'others') await otherWays(s);
      else await reply(s);
      settle(i);
    });
  }

  async function phrase(s: Run, i: number) {
    if (isSay) {
      say = 'こんなとき、どうする？';
      act(ex.scene.heard);
      await s.wait(2600);
      say = 'そんなときは、こう言おう。まずは聞いてね';
      act(ex.scene.replies?.[0]);
    } else {
      say = '新しいフレーズだよ。まずは聞いてみて！';
      act(ex.scene.heard);
    }
    await s.wait(1300);
    showMain = true;
    sfx.pop();
    await s.wait(400);
    await s.play(audioPath(main.en), channel);
    await s.wait(900);
    await s.play(audioPath(main.en), channel);
    await s.wait(500);
    reveal = true;
    look = true;
    sfx.pop();
    // Once she has heard and seen it, she may go on (or say she knows it) while it plays once more.
    seen.add(i);
    canGo = true;
    say = '意味と使い方は、カードに書いてあるよ';
    await s.wait(800);
    await s.play(audioPath(main.en), channel);
  }

  async function otherWays(s: Run) {
    shownOthers = 0;
    say = 'ほかにも、こんな言い方があるよ';
    await s.wait(900);
    for (const [i, l] of others.entries()) {
      shownOthers = i + 1;
      sfx.pop();
      await s.wait(400);
      await s.play(audioPath(l.en), 'other');
      await s.wait(700);
    }
  }

  async function reply(s: Run) {
    shownReplies = revealedReplies = 0;
    say = 'こう言われたら、こう答えよう。まずは聞いてね';
    await s.wait(1000);
    await s.play(audioPath(main.en), channel);
    for (const [i, line] of replies.entries()) {
      shownReplies = i + 1;
      await s.wait(800);
      act(ex.scene.replies?.[i]);
      await s.play(audioPath(line.en), 'model');
      revealedReplies = i + 1;
      sfx.pop();
      await s.wait(600);
      await s.play(audioPath(line.en), 'model');
    }
  }

  show(0);
</script>

<StepLayout onBack={at > 0 ? () => show(at - 1) : onBack} bind:this={layout}>
  {#snippet top()}
    <Bubble who={ex.host} text={say} named={false}>
      {#snippet before()}
        {#if look}<span class="lead"><UiWord t={UI.look} size="bubble" /></span>{/if}
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    {#if page === 'phrase'}
      {#if isSay}
        <div class="card soft cue">
          <span class="chip">こんなとき</span>
          <span class="cue-text">{ex.cue}</span>
        </div>
      {/if}
      {#if showMain}
        <SpeakerCard kind={channel} line={main} {reveal} note={reveal ? ex.when : ''} badge={isSay ? replyWord(ex) : ''}>
          {#snippet aside()}
            {#if onKnown && reveal}
              <!-- She already knows it: it comes back for a check in a few days instead of being taught today. -->
              <button class="known" onclick={onKnown}>もう知ってる</button>
            {/if}
          {/snippet}
        </SpeakerCard>
      {/if}
    {:else if page === 'others'}
      <p class="title">ほかの言い方</p>
      {#each others.slice(0, shownOthers) as l (l.en)}
        <SpeakerCard kind="other" line={l} compact />
      {/each}
    {:else}
      <!-- The phrase, small, so the reply has the room: she hears them as a pair. -->
      <SpeakerCard kind={channel} line={main} compact />
      <p class="title">答え方</p>
      {#each replies.slice(0, shownReplies) as line, i (line.en)}
        <SpeakerCard kind="model" {line} reveal={i < revealedReplies} badge={replyWord(ex)} />
      {/each}
    {/if}
  {/snippet}
  {#snippet primary()}
    <button class="btn primary" disabled={!canGo} onclick={() => (at < pages.length - 1 ? show(at + 1) : onDone())}>
      <UiWord t={UI.next} />
    </button>
  {/snippet}
</StepLayout>

<style>
  .lead {
    display: block;
    font-size: 20px;
    margin-bottom: 2px;
  }
  /* The situation, in one line above the phrase: it sets the scene, the phrase is what she learns. */
  .cue {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    padding: 8px 12px;
    background: var(--paper-2);
  }
  /* Chips have no outline, and their usual cream is this card's own colour: white here. */
  .cue .chip {
    background: var(--white);
  }
  .cue-text {
    font-size: 17px;
    font-weight: 800;
  }
  .title {
    margin: 2px 0 -4px;
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
  }
  /* A small link beside ▶, not a button: going on (次へ) is the main way, and this one skips the phrase. */
  .known {
    min-height: 44px;
    margin-right: 6px;
    padding: 0 6px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 800;
    color: var(--ink-2);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
