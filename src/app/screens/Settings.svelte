<script lang="ts">
  import { EXCHANGES } from '../../content/index.ts';
  import { everLearned, everMastered } from '../../learn/schedule.ts';
  import { play, setSoundMethod, soundInfo } from '../audio.svelte.ts';
  import { audioPath } from '../clips.ts';
  import Ja from '../components/Ja.svelte';
  import { shareText } from '../platform.ts';
  import { app, go, save, versionText } from '../state.svelte.ts';

  /** Settings (a menu tab): display, learning pace, and the app's tools. */
  const s = app.progress.settings;
  /** The app's source and its licence (GPL-3.0-or-later). */
  const SOURCE = 'https://github.com/PhuahJinWei/Chiikawa-English-Learning';
  let shared = $state('');
  let summaryText = $state('');

  const met = $derived(Object.keys(app.progress.ex).length);
  const learned = $derived(Object.values(app.progress.ex).filter((e) => everLearned(e.hear)).length);
  const mastered = $derived(Object.values(app.progress.ex).filter((e) => everMastered(e.hear)).length);

  function toggle(key: 'allJapanese' | 'keepReadings' | 'autoNext') {
    s[key] = !s[key];
    save();
  }

  function setNew(n: number) {
    s.newPerDay = n;
    save();
  }

  function setSound(m: 'standard' | 'backup') {
    s.sound = m;
    save();
    // Directly too: after an automatic switch the setting still says 'standard', so writing it again changes nothing.
    setSoundMethod(m);
  }

  function tour() {
    s.toured = false;
    save();
    go('today');
  }

  /** The progress summary she sends you: the lines she keeps missing come back for another look. */
  async function sendSummary() {
    const missed = Object.entries(app.progress.missedLines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([en, n]) => `・${en}（${n}回）`);
    const text = [
      '【えいごフレンズ】がんばり記録',
      `がんばった日: ${app.progress.days.length}日`,
      `出会ったフレーズ: ${met} / ${EXCHANGES.length}`,
      `覚えた: ${learned}　定着した: ${mastered}`,
      missed.length ? `聞き取りで間違えた:\n${missed.join('\n')}` : '聞き取りの間違い: なし',
      `バージョン: ${versionText()}`,
    ].join('\n');
    const r = await shareText('【えいごフレンズ】がんばり記録', text);
    // Never fail silently (REVIEW 4.12): if it could not be sent or copied, show it to copy by hand.
    summaryText = r === 'failed' ? text : '';
    shared =
      r === 'copied'
        ? 'コピーしました。LINEに貼り付けて送ってください。'
        : r === 'shared'
          ? '送りました。'
          : '送れなかったときは、下の文章をすべて選んでコピーしてください。';
  }

</script>

<div class="page">
  <h1 class="page-title">設定</h1>
  <div class="scroll">
    <h2>表示</h2>
    <section class="card soft list">
      <button class="item" onclick={() => toggle('allJapanese')} role="switch" aria-checked={s.allJapanese}>
        <span>表示をすべて日本語に戻す</span>
        <span class="switch" class:on={s.allJapanese}></span>
      </button>
      <button class="item" onclick={() => toggle('keepReadings')} role="switch" aria-checked={s.keepReadings}>
        <span>カタカナの読みをずっと表示する</span>
        <span class="switch" class:on={s.keepReadings}></span>
      </button>
    </section>

    <h2>学習</h2>
    <section class="card soft list">
      <button class="item" onclick={() => toggle('autoNext')} role="switch" aria-checked={s.autoNext}>
        <span class="label">
          クイズに正解したら自動で次へ
          <small><Ja text="間違えたときは、|「次へ」を押すまで|待ちます。" /></small>
        </span>
        <span class="switch" class:on={s.autoNext}></span>
      </button>
      <div class="item static stack">
        <span class="label">
          1回に習う新しいフレーズの数
          <small><Ja text="今日のレッスンのあと|「もっと覚える」で、|いくつでも|先に進めます。" /></small>
        </span>
        <span class="seg">
          {#each [1, 2, 3] as n (n)}
            <button class:on={s.newPerDay === n} onclick={() => setNew(n)}>{n}</button>
          {/each}
        </span>
      </div>
    </section>

    <h2>音</h2>
    <section class="card soft list">
      <div class="item static stack">
        <span class="label">
          音の再生方式
          <small><Ja text="音が出ない・|途中で止まるときは|「予備」に|してください。" /></small>
        </span>
        <span class="seg words">
          <button class:on={s.sound === 'standard'} onclick={() => setSound('standard')}>標準</button>
          <button class:on={s.sound === 'backup'} onclick={() => setSound('backup')}>予備</button>
        </span>
      </div>
      <button class="item" onclick={() => void play(audioPath('Hi!'), 'other')}>
        <span>音を鳴らしてみる</span><span class="go">▶</span>
      </button>
    </section>
    {#if soundInfo.method !== soundInfo.chosen}
      <p class="note">音が止まったので、いまは「予備」で鳴らしています。</p>
    {/if}

    <h2>アプリ</h2>
    <section class="card soft list">
      <button class="item" onclick={() => go('backup')}><span>記録のバックアップ</span><span class="go">›</span></button>
      <button class="item" onclick={tour}><span>使い方をもう一度見る</span><span class="go">›</span></button>
      <button class="item" onclick={() => go('selfcheck')}><span>動作チェック</span><span class="go">›</span></button>
      <button class="item" onclick={() => go('install')}><span>ホーム画面に追加する方法</span><span class="go">›</span></button>
      <button class="item" onclick={sendSummary}><span>がんばり記録を送る</span><span class="go">›</span></button>
    </section>
    {#if shared}<p class="note">{shared}</p>{/if}
    {#if summaryText}<textarea class="text-out" readonly rows="6" value={summaryText}></textarea>{/if}

    <p class="note muted">
      記録はこのiPhoneの中だけに保存されます{app.saved ? '' : '（いま保存できていません）'}。<br />
      バージョン {versionText()}
    </p>
    <!-- The notice the GPL asks of an app people use: who holds the copyright, the licence, no warranty, and where to
         read the licence (README, Licence). -->
    <p class="note muted legal">
      © 2026 PhuahJinWei<br />
      GPL-3.0ライセンスのフリーソフトウェアです（無保証）。<br />
      <a href={SOURCE} target="_blank" rel="noopener noreferrer">ライセンスとソースコード</a>
    </p>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  h1 {
    margin: 2px 0 4px;
  }
  h2 {
    margin: 8px 0 -4px;
    font-size: 14px;
    font-weight: 900;
    color: var(--ink-2);
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: grid;
    gap: 12px;
    align-content: start;
    /* 4px of room at each side, so the drawn lines' outer edge (they reach 2px outside each card) is not cut off. */
    margin: 0 -4px;
    padding: 4px 4px 12px;
  }
  .list {
    padding: 4px 0;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 8px 16px;
    border: none;
    background: none;
    font-size: 16px;
    font-weight: 800;
    text-align: left;
  }
  .item.static {
    flex-wrap: wrap;
  }
  /* A setting with a note under its name: the control goes under both, lined up with them on the left. */
  .item.stack {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px 14px;
  }
  .item + .item {
    border-top: 2px dashed var(--paper-3);
  }
  .go {
    font-size: 26px;
    color: var(--ink-2);
  }
  .switch {
    flex: none;
    position: relative;
    width: 52px;
    height: 30px;
    border-radius: 99px;
    border: 3px solid var(--ink);
    border-image: var(--frame-pill);
    background: var(--paper-2);
    transition: background-color 0.2s;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--white);
    border: 2px solid var(--ink);
    transition: transform 0.2s;
  }
  .switch.on {
    background: var(--mint-2);
  }
  .switch.on::after {
    transform: translateX(22px);
  }
  /* Like the notebook's tabs: a hand-drawn outline, and the ink behind the buttons shows as the divider. */
  .seg {
    display: inline-flex;
    gap: 2px;
    border: 3px solid var(--ink);
    border-radius: var(--r-ctl);
    border-image: var(--frame-ctl);
    background: var(--ink);
    overflow: hidden;
  }
  /* 44px or more each way: the smallest size a finger hits reliably. */
  .seg button {
    width: 52px;
    height: 44px;
    border: none;
    background: var(--white);
    font-weight: 900;
    font-size: 16px;
  }
  .seg button.on {
    background: var(--sun);
  }
  .seg.words button {
    width: auto;
    padding: 0 18px;
  }
  .label {
    display: grid;
    gap: 4px;
  }
  .label small {
    font-size: 13.5px;
    font-weight: 700;
    line-height: 1.5;
    color: var(--ink-2);
  }
  .text-out {
    width: 100%;
    font: inherit;
    font-size: 16px;
    padding: 8px 10px;
    border: 2px solid var(--ink-3);
    border-radius: 12px;
    background: var(--paper);
    color: var(--ink);
    resize: none;
    -webkit-user-select: text;
    user-select: text;
  }
  .note {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    text-align: center;
    font-weight: 700;
  }
  .legal {
    font-size: 13px;
  }
  .legal a {
    display: inline-block;
    padding: 12px 10px;
    color: inherit;
  }
</style>
