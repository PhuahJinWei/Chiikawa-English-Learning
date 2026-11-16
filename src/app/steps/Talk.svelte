<script lang="ts">
  import { untrack } from 'svelte';
  import { UI } from '../../content/index.ts';
  import type { Talk } from '../../content/types.ts';
  import { audioPath } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import SorryButton from '../components/SorryButton.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm, withPartner } from '../scene.ts';
  import { lifetime, type Run } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';

  /**
   * 会話してみよう: a short conversation made of phrases she has learned (src/content/talks.ts, 2026-11-17). It builds
   * up like a chat, the other person on the left and her on the right. Their lines play with no text; on her turn
   * she sees in Japanese what she wants to say, says it in English out loud, and checks (答え合わせ): the model plays,
   * and her line and the one she answered show their English. She goes on when she is ready (続ける), and at the end
   * she can hear the whole conversation again. Nothing is graded, and it never moves the review schedule.
   */
  let { talk: talkProp, onDone, onBack }: { talk: Talk; onDone: () => void; onBack: (() => void) | null } = $props();
  const talk = untrack(() => talkProp);
  const turns = talk.turns;
  const life = lifetime();

  /** Turns on screen, and how many of them show their English (a line she is about to answer stays ♪). */
  let shown = $state(0);
  let revealed = $state(0);
  let phase = $state<'start' | 'them' | 'me' | 'check' | 'end'>('start');
  let armed = $state(false);
  let say = $state('');

  /** On her turn, the line she answers (the other person's line just before), to hear again. */
  const answering = $derived(phase === 'me' && turns[shown - 2]?.who === 'them' ? turns[shown - 2] : null);

  /** Plays the other person's lines until it is her turn, or the conversation ends. */
  async function onward(s: Run) {
    while (shown < turns.length) {
      const t = turns[shown];
      shown++;
      if (t.who === 'me') {
        phase = 'me';
        say = turns[shown - 2]?.who === 'them' ? '英語で、声に出して答えてみてね' : '英語で、声に出して言ってみてね';
        // Her partner gets ready with her.
        act([{ who: 'chiikawa', face: 'determined' }]);
        return;
      }
      phase = 'them';
      say = '「相手」の英語だよ';
      calm(withPartner(talk.cast));
      act(t.acts);
      await s.wait(600);
      await s.play(audioPath(t.line.en), 'other');
      await s.wait(400);
      // A line she does not answer (the next one is theirs too, or it ends the conversation) shows its English now.
      if (turns[shown]?.who !== 'me') revealed = shown;
    }
    end();
  }

  function end() {
    phase = 'end';
    revealed = turns.length;
    sfx.chime();
    say = '会話できたね！';
    calm(withPartner(talk.cast));
    act([
      { who: 'hachiware', gesture: 'cheer', face: 'happy' },
      { who: 'chiikawa', gesture: 'hop', face: 'happy', mark: 'heart' },
    ]);
  }

  life.run(async (s) => {
    say = '覚えたフレーズで、会話してみよう！';
    await s.wait(1800);
    await onward(s);
  });

  /** 答え合わせ: the model plays, then her line and the line she answered show their English. */
  function check() {
    if (phase !== 'me') return;
    phase = 'check';
    armed = false;
    const t = turns[shown - 1];
    sfx.pop();
    life.run(async (s) => {
      calm(withPartner(talk.cast));
      act(t.acts);
      await s.wait(300);
      await s.play(audioPath(t.line.en), 'model');
      revealed = shown;
      say = 'まねして、もう一度言ってみてね';
      // The button changes under her finger: ignore it for a moment, so a double tap does not skip ahead.
      await s.wait(500);
      armed = true;
    });
  }

  function goOn() {
    if (phase !== 'check' || !armed) return;
    life.run(async (s) => {
      await s.wait(200);
      await onward(s);
    });
  }

  /** The whole conversation again, line by line, each card showing that it plays. */
  function hearAll() {
    life.run(async (s) => {
      for (const [i, t] of turns.entries()) {
        document.getElementById(`turn-${i}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await s.play(audioPath(t.line.en), t.who === 'them' ? 'other' : 'model');
        await s.wait(350);
      }
    });
  }
</script>

<StepLayout {onBack}>
  {#snippet top()}
    <Bubble who="hachiware" text={say} named={false}>
      {#snippet before()}
        {#if phase === 'them'}<span class="lead"><UiWord t={UI.listen} size="bubble" /></span>{/if}
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    <div class="card soft cue">
      <span class="chip">こんなとき</span>
      <span class="cue-text">{talk.cue}</span>
    </div>
    {#each turns.slice(0, shown) as t, i (i)}
      <div class="turn {t.who}" id="turn-{i}">
        {#if i < revealed}
          <SpeakerCard kind={t.who === 'them' ? 'other' : 'model'} line={t.line} compact />
        {:else if t.who === 'them'}
          <SpeakerCard kind="other" line={t.line} reveal={false} compact />
        {:else}
          <!-- Her turn: what she wants to say, in Japanese; the English is for her to say. -->
          <div class="card mine">
            <span class="chip">あなた</span>
            <span class="memory" aria-label="英語は隠しています">？？？</span>
            <span class="mine-ja">{t.line.ja}</span>
          </div>
        {/if}
      </div>
    {/each}
  {/snippet}
  {#snippet extra()}
    {#if answering}
      <SorryButton line={answering.line} channel="other" />
    {:else if phase === 'end'}
      <button class="btn light all" onclick={hearAll}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
        通して聞く
      </button>
    {/if}
  {/snippet}
  {#snippet primary()}
    {#if phase === 'end'}
      <button class="btn primary" onclick={onDone}><UiWord t={UI.next} /></button>
    {:else if phase === 'check'}
      <button class="btn primary" disabled={!armed} onclick={goOn}>続ける</button>
    {:else}
      <button class="btn primary" disabled={phase !== 'me'} onclick={check}>答え合わせ</button>
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
  .cue .chip {
    background: var(--white);
  }
  .cue-text {
    font-size: 16px;
    font-weight: 800;
  }
  /* Like a chat: the other person on the left, her on the right. */
  .turn.them {
    margin-right: 14%;
  }
  .turn.me {
    margin-left: 14%;
  }
  .mine {
    display: grid;
    justify-items: start;
    gap: 4px;
    padding: 10px 14px 12px;
    background: #fff4f6;
  }
  .mine .chip {
    background: var(--blush);
  }
  .memory {
    font-family: var(--font-en);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: var(--ink-3);
  }
  .mine-ja {
    font-size: 18px;
    font-weight: 800;
  }
  .all {
    width: auto;
    justify-self: center;
    min-height: 44px;
    padding: 6px 18px 6px 14px;
    gap: 6px;
    font-size: 15px;
  }
  .all svg {
    width: 16px;
    height: 16px;
    fill: var(--ink);
  }
</style>
