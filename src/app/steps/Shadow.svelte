<script lang="ts">
  import { untrack } from 'svelte';
  import { UI, replyWord } from '../../content/index.ts';
  import type { Exchange, Line } from '../../content/types.ts';
  import { audioPath, turnMs } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import SpeakerCard from '../components/SpeakerCard.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import TurnIndicator from '../components/TurnIndicator.svelte';
  import UiWord from '../components/UiWord.svelte';
  import { act, calm } from '../scene.ts';
  import { lifetime } from '../script.svelte.ts';
  import { sfx } from '../sfx.ts';

  /**
   * Shadow: listen, then say it (REVIEW 2.3). The reply is first heard before it is shown. When she is ready, the model
   * plays and she repeats it in the pause after it, four times: twice with the English shown, then twice with it
   * hidden so she says it from memory.
   */
  let { ex: exProp, onDone, onBack }: { ex: Exchange; onDone: () => void; onBack: (() => void) | null } = $props();
  const ex = untrack(() => exProp);

  const life = lifetime();
  const cast = ex.cast;
  const lines = ex.short;
  const reps: { line: Line; hide: boolean }[] =
    lines.length === 1
      ? [false, false, true, true].map((hide) => ({ line: lines[0], hide }))
      : [false, true].flatMap((hide) => lines.map((line) => ({ line, hide })));

  let say = $state('');
  let revealed = $state(ex.kind === 'say' ? lines.length : 0);
  let phase = $state<'intro' | 'ready' | 'reps' | 'done'>('intro');
  let done = $state(0);
  let hide = $state(false);
  let turn = $state(false);

  life.run(async (s) => {
    calm(cast);
    if (ex.kind === 'say') {
      say = 'さっきのフレーズを、声に出して練習しよう';
      await s.wait(1200);
    } else {
      say = 'こう答えよう！ まずは聞いてね';
      for (const [i, line] of lines.entries()) {
        await s.wait(900);
        act(ex.scene.replies?.[i]);
        await s.play(audioPath(line.en), 'model');
        revealed = i + 1;
        sfx.pop();
        await s.wait(600);
        await s.play(audioPath(line.en), 'model');
      }
    }
    phase = 'ready';
    say = 'お手本のあとに続けて、声に出して言ってみよう。準備ができたらボタンを押してね';
  });

  function start() {
    phase = 'reps';
    done = 0;
    hide = false;
    say = 'お手本のあとに、声に出して言ってね';
    life.run(async (s) => {
      calm(cast);
      for (const [i, rep] of reps.entries()) {
        if (rep.hide && !hide) {
          hide = true;
          say = '今度は英語を隠すよ。思い出して言ってみよう！';
          await s.wait(1600);
        }
        await s.wait(700);
        act(ex.scene.replies?.[lines.indexOf(rep.line)]);
        await s.play(audioPath(rep.line.en), 'model');
        turn = true;
        await s.wait(turnMs(rep.line.en));
        turn = false;
        done = i + 1;
      }
      hide = false;
      phase = 'done';
      say = 'おつかれさま！ 声に出すと覚えやすいよ';
      sfx.chime();
    });
  }
</script>

<StepLayout {onBack}>
  {#snippet top()}
    <Bubble who={ex.host} text={say}>
      {#snippet before()}
        {#if phase === 'ready'}<span class="lead"><UiWord t={UI.ready} size="bubble" /></span>{/if}
        {#if phase === 'done'}<span class="lead"><UiWord t={UI.done} size="bubble" /></span>{/if}
      {/snippet}
    </Bubble>
  {/snippet}
  {#snippet body()}
    {#each lines as line, i (line.en)}
      <SpeakerCard kind="model" {line} reveal={i < revealed} hideEnglish={hide} badge={replyWord(ex)} />
    {/each}
    {#if phase !== 'intro'}
      <TurnIndicator t={UI.sayIt} active={turn} />
      <div class="count">
        <div class="dots" aria-hidden="true">
          {#each reps as rep, i (i)}<span class="dot" class:on={i < done} class:memory={rep.hide}></span>{/each}
        </div>
        <span class="count-text">{done}/{reps.length}回</span>
      </div>
      <p class="legend"><span class="dot memory" aria-hidden="true"></span>点線の回は、英語を隠して言います</p>
      {#if phase === 'done'}
        <button class="btn soft again" onclick={start}><UiWord t={UI.again} /></button>
      {/if}
    {/if}
  {/snippet}
  {#snippet primary()}
    {#if phase === 'ready'}
      <button class="btn primary" onclick={start}><UiWord t={UI.ok} /></button>
    {:else}
      <button class="btn primary" disabled={phase !== 'done'} onclick={onDone}><UiWord t={UI.next} /></button>
    {/if}
  {/snippet}
</StepLayout>

<style>
  .lead {
    display: block;
    font-size: 20px;
    margin-bottom: 2px;
  }
  .count {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .count-text {
    font-size: 14px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .legend {
    margin: -4px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .legend .dot {
    width: 12px;
    height: 12px;
    border-width: 2px;
  }
  .again {
    justify-self: center;
    width: auto;
    padding: 6px 22px;
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: var(--line) solid var(--ink);
    background: var(--white);
    transition: background-color 0.2s;
  }
  .dot.memory {
    border-style: dashed;
  }
  .dot.on {
    background: var(--sun-2);
  }
</style>
