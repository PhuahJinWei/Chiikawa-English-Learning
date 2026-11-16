<script lang="ts">
  import { untrack } from 'svelte';
  import { UI, replyWord } from '../../content/index.ts';
  import type { Exchange } from '../../content/types.ts';
  import { audioPath, turnMs } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import SorryButton from '../components/SorryButton.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import TurnIndicator from '../components/TurnIndicator.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm, pick } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';
  import { stage } from '../stage.ts';
  import type { StepResult } from '../screens/Lesson.svelte';

  /**
   * Answer: someone asks (voice only, no text), she answers out loud, then hears the model and says it once more
   * after it. Only then does she rate herself, and the rating buttons ignore taps for a moment, so a double tap can
   * never rate before the model was heard (REVIEW 1.9, 1.10). Longer answers are steps of their own, built from the
   * short one. The phone does not judge her speech.
   */
  let { ex: exProp, onDone, onBack }: { ex: Exchange; onDone: (r: StepResult) => void; onBack: (() => void) | null } = $props();
  const ex = untrack(() => exProp);

  const life = lifetime();
  const cast = ex.cast;
  const question = ex.kind === 'say' ? null : pick(ex.heard);
  const word = replyWord(ex);

  let phase = $state<'ask' | 'failed' | 'turn' | 'model' | 'again' | 'rate'>('ask');
  let say = $state('');
  let shown = $state(0);
  let turn = $state(false);
  let armed = $state(false);

  function ask() {
    phase = 'ask';
    life.run(async (s) => {
      calm(cast);
      if (question) {
        say = '「相手」が話しかけてくるよ';
        void stage.play('chiikawa', 'listen');
        await s.wait(1100);
        const r = await s.play(audioPath(question.en), 'other');
        stage.stop('chiikawa');
        if (r === 'failed') {
          phase = 'failed';
          say = '音が出なかったみたい。もう一度ためすか、このステップをとばしてね';
          return;
        }
      } else {
        say = 'こんなとき、何て言う？';
        act(ex.scene.heard);
        await s.wait(1600);
      }
      phase = 'turn';
      turn = true;
      say = '声に出して答えてね。言えたら、お手本を聞こう';
    });
  }
  ask();

  function showModel() {
    phase = 'model';
    turn = false;
    sfx.pop();
    say = 'お手本はこれ';
    life.run(async (s) => {
      for (const [i, l] of ex.short.entries()) {
        shown = i + 1;
        calm(cast);
        act(ex.scene.replies?.[i]);
        await s.wait(350);
        await s.play(audioPath(l.en), 'model');
        await s.wait(500);
      }
      phase = 'again';
      say = 'もう一度、お手本のあとに言ってみよう';
      turn = true;
      await s.wait(turnMs(ex.short[0].en));
      turn = false;
      phase = 'rate';
      say = 'どうだった？ 正直に選んでね';
      await s.wait(600);
      armed = true;
    });
  }

  function rate(grade: 'good' | 'hard' | 'again') {
    if (phase === 'rate' && armed) onDone({ grade });
  }
</script>

<StepLayout onBack={phase === 'rate' ? null : onBack}>
  {#snippet top()}
    <Bubble who={ex.host} text={say}>
      {#snippet before()}
        {#if phase === 'ask' && question}<span class="lead"><UiWord t={UI.listen} size="bubble" /></span>{/if}
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    {#if question}
      <SpeakerCard kind="other" line={question} reveal={phase === 'rate'} />
      {#if phase === 'turn'}<SorryButton line={question} channel="other" />{/if}
    {:else}
      <div class="card soft cue">
        <span class="chip">こんなとき</span>
        <p class="cue-text">{ex.cue}</p>
      </div>
    {/if}
    {#if phase === 'turn' || phase === 'again'}
      <TurnIndicator t={phase === 'turn' ? UI.yourTurn : UI.sayIt} active={turn} />
    {/if}
    {#each ex.short.slice(0, shown) as line (line.en)}
      <SpeakerCard kind="model" {line} badge={word} />
    {/each}
  {/snippet}
  {#snippet extra()}
    {#if phase === 'failed'}
      <div class="row">
        <button class="btn soft" onclick={ask}>もう一度ためす</button>
        <button class="btn soft keep" onclick={() => onDone({})}>このステップを<wbr />とばす</button>
      </div>
    {/if}
  {/snippet}
  {#snippet primary()}
    {#if phase === 'rate'}
      <div class="rates" class:armed>
        <button class="btn good" onclick={() => rate('good')}>言えた</button>
        <button class="btn" onclick={() => rate('hard')}>迷った</button>
        <button class="btn oops" onclick={() => rate('again')}>言えなかった</button>
      </div>
    {:else if phase !== 'failed'}
      <button class="btn primary" disabled={phase !== 'turn'} onclick={showModel}>お手本を聞く</button>
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
  .rates {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  .rates.armed {
    opacity: 1;
  }
  .rates .btn {
    font-size: 15px;
    padding: 8px 6px;
    min-height: 56px;
  }
</style>
