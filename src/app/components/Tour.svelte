<script lang="ts">
  import { audioPath } from '../../content/audio.ts';
  import type { Step } from '../../learn/session.ts';
  import { play } from '../audio.svelte.ts';
  import { act } from '../scene.ts';
  import { STEP_HINTS, STEP_ICONS, STEP_NAMES } from '../step-kinds.ts';

  /**
   * The first-run tour (REVIEW 1.12), three pages: what the app is for, how a lesson goes (the four steps, named and
   * drawn as in the lesson's top bar), and a sound check. Everything else is explained where it is used.
   */
  let { onDone }: { onDone: () => void } = $props();

  let page = $state(0);
  let heard = $state<'unknown' | 'yes' | 'no'>('unknown');
  const last = 2;
  const KINDS: Step['kind'][] = ['meet', 'catch', 'answer'];

  function test() {
    void play(audioPath('Hi!'), 'other');
    act([{ who: 'chiikawa', gesture: 'listen' }]);
  }
</script>

<div class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
  <div class="card body">
    {#if page === 0}
      <h2 id="tour-title">はじめまして！</h2>
      <p>ハチワレたちと一緒に、<b>英語を聞き取って、短い英語で答えたり、自分から話しかけたりする</b>練習をします。</p>
      <p>文法や書く練習はありません。1日10分くらいで大丈夫です。</p>
    {:else if page === 1}
      <h2 id="tour-title">レッスンの流れ</h2>
      <p>新しいフレーズは、この3つのステップで覚えます。いまどのステップかは、画面の上に出ます。</p>
      <ol class="steps">
        {#each KINDS as k (k)}
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true">{#each STEP_ICONS[k] as d (d)}<path {d} />{/each}</svg>
            <span><b>{STEP_NAMES[k]}</b><small>{STEP_HINTS[k]}</small></span>
          </li>
        {/each}
      </ol>
      <p>覚えたフレーズがそろうと、「{STEP_NAMES.talk}」で短い会話もします。途中でやめたいときは⏸を押してください。</p>
    {:else}
      <h2 id="tour-title">音のチェック</h2>
      <p>▶を押して、英語が聞こえるか確かめてください。</p>
      <button class="btn" onclick={test}>▶ 音を鳴らす</button>
      <div class="row">
        <button class="btn good" class:picked={heard === 'yes'} onclick={() => (heard = 'yes')}>聞こえた</button>
        <button class="btn oops" class:picked={heard === 'no'} onclick={() => (heard = 'no')}>聞こえない</button>
      </div>
      {#if heard === 'no'}
        <ul class="tips">
          <li>iPhoneの横の音量ボタンで、音を大きくしてください。</li>
          <li>消音モード（マナーモード）を切ると聞こえることがあります。</li>
          <li>そのあと、もう一度▶を押してください。</li>
          <li>それでも聞こえないときは、あとで「設定」の「音の再生方式」を「予備」にしてみてください。</li>
        </ul>
      {/if}
    {/if}
  </div>
  <div class="nav">
    <div class="dots" aria-hidden="true">{#each [0, 1, 2] as i (i)}<i class:on={i === page}></i>{/each}</div>
    <div class="row">
      {#if page > 0}<button class="btn soft" onclick={() => page--}>前へ</button>{/if}
      {#if page < last}
        <button class="btn primary" onclick={() => page++}>次へ</button>
      {:else}
        <button class="btn primary" onclick={onDone}>はじめよう！</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .tour {
    position: absolute;
    inset: 0;
    z-index: 8;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 16px calc(14px + var(--safe-bottom));
    background: var(--paper);
    /* The same hand-drawn top edge as the page panel (App.svelte). */
    border: 0 solid var(--ink);
    border-top-width: 4px;
    border-radius: 26px 26px 0 0;
    border-image: var(--frame-edge);
    overflow-y: auto;
  }
  .body {
    display: grid;
    gap: 10px;
    align-content: start;
  }
  h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 900;
  }
  p {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.65;
  }
  .steps {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
    counter-reset: step;
  }
  .steps li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border: var(--line) solid var(--ink);
    border-radius: var(--r-row);
    border-image: var(--frame-row);
    background: var(--white);
  }
  .steps svg {
    flex: none;
    width: 26px;
    height: 26px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .steps span {
    display: grid;
  }
  .steps b {
    font-size: 15px;
    font-weight: 900;
  }
  .steps small {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .picked {
    outline: 4px solid var(--sun-2);
  }
  .tips {
    margin: 0;
    padding-left: 0;
    list-style: none;
    display: grid;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
  }
  .tips li::before {
    content: '・';
  }
  .nav {
    margin-top: auto;
    display: grid;
    gap: 10px;
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--paper-3);
  }
  .dots i.on {
    background: var(--ink);
  }
</style>
