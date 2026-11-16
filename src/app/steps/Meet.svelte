<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { UI, replyWord } from '../../content/index.ts';
  import type { Exchange, Line } from '../../content/types.ts';
  import type { Channel } from '../audio.svelte.ts';
  import { audioPath } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';

  /**
   * Meet: ears first. The phrase plays twice before any text appears; then the card shows it with its meaning and
   * when it is used (which stays on the card), and it plays once more. Other ways of saying it follow. For an
   * exchange she answers, the reply comes next, again heard before it is shown (REVIEW 2.3). Every card can be
   * replayed and every block tapped, and Hachiware asks her to say what she will say out loud, in her own time: there
   * is no timed repeat-after-me (removed 2026-11-17, your decision).
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

  let say = $state('');
  let look = $state(false);
  let showCue = $state(false);
  let showMain = $state(false);
  let reveal = $state(false);
  let shownOthers = $state<Line[]>([]);
  /** Reply cards on screen, and how many of them show their text yet. */
  let shownReplies = $state(0);
  let revealedReplies = $state(0);
  let canGo = $state(false);
  let layout: StepLayout | undefined = $state();

  life.run(async (s) => {
    calm(cast);
    if (isSay) {
      say = 'こんなとき、どうする？';
      showCue = true;
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
    // With a reply still to come, she goes on only once she has met it.
    canGo = !replies.length;
    look = true;
    sfx.pop();
    say = '意味と使い方は、カードに書いてあるよ';
    await s.wait(800);
    await s.play(audioPath(main.en), channel);
    for (const l of others) {
      await s.wait(1000);
      shownOthers = [...shownOthers, l];
      await s.play(audioPath(l.en), 'other');
    }
    if (replies.length) {
      if (others.length) {
        say = 'どれも同じ場面で使うよ';
        await s.wait(1600);
      }
      say = 'こう言われたら、こう答えよう。まずは聞いてね';
      for (const [i, line] of replies.entries()) {
        shownReplies = i + 1;
        await s.wait(900);
        act(ex.scene.replies?.[i]);
        await s.play(audioPath(line.en), 'model');
        revealedReplies = i + 1;
        sfx.pop();
        await tick();
        layout?.toEnd();
        await s.wait(600);
        await s.play(audioPath(line.en), 'model');
      }
      canGo = true;
      say = '答えをまねして、声に出して言ってみよう。タップで何度でも聞けるよ';
      return;
    }
    if (isSay) say = 'まねして、声に出して言ってみよう。タップで何度でも聞けるよ';
    else say = others.length ? 'どれも同じ場面で使うよ。タップで何度でも聞けるよ' : 'タップで何度でも聞けるよ';
    layout?.toTop();
  });
</script>

<StepLayout {onBack} bind:this={layout}>
  {#snippet top()}
    <Bubble who={ex.host} text={say}>
      {#snippet before()}
        {#if look}<span class="lead"><UiWord t={UI.look} size="bubble" /></span>{/if}
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    {#if showCue}
      <div class="card soft cue">
        <span class="chip">こんなとき</span>
        <p class="cue-text">{ex.cue}</p>
      </div>
    {/if}
    {#if showMain}
      <SpeakerCard kind={channel} line={main} {reveal} note={reveal ? ex.when : ''} badge={isSay ? replyWord(ex) : ''} />
    {/if}
    {#if shownOthers.length}<p class="others-title">ほかの言い方</p>{/if}
    {#each shownOthers as l (l.en)}
      <SpeakerCard kind="other" line={l} compact />
    {/each}
    {#if shownReplies}<p class="others-title">答え方</p>{/if}
    {#each replies.slice(0, shownReplies) as line, i (line.en)}
      <SpeakerCard kind="model" {line} reveal={i < revealedReplies} badge={replyWord(ex)} />
    {/each}
  {/snippet}
  {#snippet primary()}
    {#if onKnown}
      <!-- Once she has heard and seen the phrase, she can say she knows it already: it comes back for a check in a
           few days instead of being taught today. -->
      <div class="pair">
        <button class="btn soft known keep" disabled={!reveal} onclick={onKnown}>もう<wbr />知ってる</button>
        <button class="btn primary" disabled={!canGo} onclick={onDone}><UiWord t={UI.next} /></button>
      </div>
    {:else}
      <button class="btn primary" disabled={!canGo} onclick={onDone}><UiWord t={UI.next} /></button>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .lead {
    display: block;
    font-size: 20px;
    margin-bottom: 2px;
  }
  .cue {
    background: var(--paper-2);
  }
  /* Chips have no outline, and their usual cream is this card's own colour: white here. */
  .cue .chip {
    background: var(--white);
  }
  .cue-text {
    margin: 8px 0 0;
    font-size: 19px;
    font-weight: 800;
  }
  .pair {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px;
  }
  .known {
    width: auto;
    padding: 8px 12px;
  }
  /* On a narrow phone, beside ← 前へ, the label goes on two lines (もう / 知ってる) so 次へ stays the widest button. */
  @media (max-width: 359px) {
    .known {
      max-width: 90px;
    }
  }
  .others-title {
    margin: 4px 0 -4px;
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
  }
</style>
