<script lang="ts">
  import { audioPath } from '../../content/audio.ts';
  import { play } from '../audio.svelte.ts';
  import { act } from '../scene.ts';

  /** The first-run tour (REVIEW 1.12): what the app is for, the two cards, a sound check, and how to stay in control. */
  let { onDone }: { onDone: () => void } = $props();

  let page = $state(0);
  let heard = $state<'unknown' | 'yes' | 'no'>('unknown');
  const last = 3;

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
      <h2 id="tour-title">カードの見方</h2>
      <div class="mini other"><span class="chip">相手</span>話し相手が言う英語</div>
      <div class="mini model"><span class="chip">お手本</span>あなたが言う英語のお手本</div>
      <p>英語を話すのは「相手」と「お手本」です。ハチワレたちは、一緒に聞いて応援する役です。</p>
      <p>英語のブロックをタップすると、そのことばだけ聞けて、意味も出ます。カタカナの読みの上の点（・）は、強く言うところです。</p>
    {:else if page === 2}
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
    {:else}
      <h2 id="tour-title">いつでも止められます</h2>
      <ul class="keys">
        <li><span class="key">⏸</span>一時停止。最初からやり直したり、前に戻ったりもできます</li>
        <li><span class="key">← 前へ</span>ひとつ前のステップに戻ります</li>
        <li><span class="key">✕</span>今日はここまで。続きはあとでできます</li>
      </ul>
      <p>下のメニューの「ノート」には習ったフレーズが全部あって、いつでも聞けます。「練習」では好きなだけ練習できます。</p>
    {/if}
  </div>
  <div class="nav">
    <div class="dots" aria-hidden="true">{#each [0, 1, 2, 3] as i (i)}<i class:on={i === page}></i>{/each}</div>
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
    border-top: var(--line) solid var(--ink);
    border-radius: 26px 26px 0 0;
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
  .mini {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 2px solid var(--ink);
    border-radius: 14px;
    font-weight: 800;
    font-size: 14px;
  }
  .mini.other .chip {
    background: var(--sky);
  }
  .mini.model {
    background: #fff4f6;
  }
  .mini.model .chip {
    background: var(--blush);
  }
  .picked {
    outline: 4px solid var(--sun-2);
  }
  .tips,
  .keys {
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
  .key {
    display: inline-block;
    min-width: 64px;
    margin-right: 8px;
    padding: 2px 8px;
    border: 2px solid var(--ink);
    border-radius: 10px;
    background: var(--white);
    text-align: center;
    font-weight: 900;
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
