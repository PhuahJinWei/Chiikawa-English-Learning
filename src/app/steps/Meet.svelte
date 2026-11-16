<script lang="ts">
  import { untrack } from 'svelte';
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
   * when it is used (which stays on the card), and it plays once more. Other ways of saying it follow. Every card
   * can be replayed and every block tapped. The reply is introduced in the next step (Shadow).
   */
  let { ex: exProp, onDone, onBack }: { ex: Exchange; onDone: () => void; onBack: (() => void) | null } = $props();
  const ex = untrack(() => exProp);

  const life = lifetime();
  const cast = ex.cast;
  const isSay = ex.kind === 'say';
  const main: Line = isSay ? ex.short[0] : ex.heard[0];
  const channel: Channel = isSay ? 'model' : 'other';
  const others = isSay ? [] : ex.heard.slice(1);

  let say = $state('');
  let look = $state(false);
  let showCue = $state(false);
  let showMain = $state(false);
  let reveal = $state(false);
  let shownOthers = $state<Line[]>([]);
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
    canGo = true;
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
    say = others.length ? 'どれも同じ場面で使うよ。タップで何度でも聞けるよ' : 'タップで何度でも聞けるよ';
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
      <div class="card cue">
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
  {/snippet}
  {#snippet primary()}
    <button class="btn primary" disabled={!canGo} onclick={onDone}><UiWord t={UI.next} /></button>
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
  .cue-text {
    margin: 8px 0 0;
    font-size: 19px;
    font-weight: 800;
  }
  .others-title {
    margin: 4px 0 -4px;
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
  }
</style>
