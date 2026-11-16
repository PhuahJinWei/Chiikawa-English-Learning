<script lang="ts">
  import { untrack } from 'svelte';
  import { UI, replyWord } from '../../content/index.ts';
  import type { Exchange } from '../../content/types.ts';
  import { audioPath } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import SorryButton from '../components/SorryButton.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm, partnerOnStage, pick } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';
  import { stage } from '../stage.ts';
  import type { StepResult } from '../screens/Lesson.svelte';

  /**
   * Answer: someone asks (voice only, no text), she answers out loud, then hears the model. Only then does she rate
   * herself, and the rating buttons ignore taps for a moment, so a double tap can never rate before the model was
   * heard (REVIEW 1.9, 1.10). Hachiware asks her to say the model once more, in her own time (no timed turn since
   * 2026-11-17), and then, separately, how her first answer went. Once she checks, the question shrinks to one row
   * so the model is in full view. Longer answers are steps of their own, built from the short one. The phone does not
   * judge her speech.
   */
  let { ex: exProp, onDone, onBack }: { ex: Exchange; onDone: (r: StepResult) => void; onBack: (() => void) | null } = $props();
  const ex = untrack(() => exProp);

  const life = lifetime();
  const cast = ex.cast;
  const question = ex.kind === 'say' ? null : pick(ex.heard);
  const word = replyWord(ex);

  let phase = $state<'ask' | 'failed' | 'turn' | 'model' | 'rate'>('ask');
  /** 答え合わせ was tapped: the model is playing or has played. */
  const checking = $derived(phase === 'model' || phase === 'rate');
  let say = $state('');
  let shown = $state(0);
  let armed = $state(false);

  function ask() {
    phase = 'ask';
    life.run(async (s) => {
      calm(cast);
      if (question) {
        say = '「相手」が話しかけてくるよ';
        void stage.play(partnerOnStage(), 'listen');
        await s.wait(1100);
        const r = await s.play(audioPath(question.en), 'other');
        stage.stop(partnerOnStage());
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
      // What to do now, and that not knowing is fine: 答え合わせ is the next step either way.
      say = question
        ? '英語で、声に出して答えてみてね。わからなくても大丈夫、答え合わせしよう'
        : '英語で、声に出して言ってみてね。わからなくても大丈夫、答え合わせしよう';
    });
  }
  ask();

  function showModel() {
    phase = 'model';
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
      // One thing at a time: say the model, then rate the first answer.
      phase = 'rate';
      say = 'まねして、もう一度言ってみてね';
      await s.wait(2200);
      say = '最初の答えはどうだった？';
      armed = true;
    });
  }

  function rate(grade: 'good' | 'hard' | 'again') {
    if (phase === 'rate' && armed) onDone({ grade });
  }
</script>

<StepLayout onBack={phase === 'rate' ? null : onBack}>
  {#snippet top()}
    <Bubble who={ex.host} text={say} named={false}>
      {#snippet before()}
        {#if phase === 'ask' && question}<span class="lead"><UiWord t={UI.listen} size="bubble" /></span>{/if}
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    {#if question}
      <!-- Once she checks, the question shrinks to one row, so the model answer has the room. -->
      <SpeakerCard
        kind="other"
        line={question}
        reveal={checking}
        compact={checking}
        hiddenNote="英語は答え合わせのあとに出ます"
      />
      {#if phase === 'turn'}<SorryButton line={question} channel="other" />{/if}
    {:else}
      <div class="card soft cue">
        <span class="chip">こんなとき</span>
        <span class="cue-text">{ex.cue}</span>
      </div>
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
      <button class="btn primary" disabled={phase !== 'turn'} onclick={showModel}>答え合わせ</button>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .lead {
    display: block;
    font-size: 20px;
    margin-bottom: 2px;
  }
  /* The situation in one line, as in 新しいフレーズ. */
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
