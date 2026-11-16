<script lang="ts">
  import SheetHead from '../components/SheetHead.svelte';
  import { inLine, inOtherApp, isIOS, isStandalone } from '../platform.ts';
  import { go } from '../state.svelte.ts';

  /**
   * How to put the app on the home screen, in pictures. Matters for more than looks: on iPhone, a home-screen app
   * keeps its own saved data, separate from Safari's, so she should learn only from the home-screen icon.
   */
  function later() {
    try {
      sessionStorage.setItem('eigo-friends/install-later', '1');
    } catch {
      // private mode: it just asks again next time
    }
    go('today');
  }

  function openInSafari() {
    const url = new URL(location.href);
    url.searchParams.set('openExternalBrowser', '1');
    location.href = url.toString();
  }
</script>

<div class="page">
  <SheetHead title="ホーム画面に追加" onClose={later} />
  <div class="scroll">
    {#if isStandalone}
      <div class="card"><p class="big">もうホーム画面から開いています。ばっちりです！</p></div>
    {:else if inLine || inOtherApp}
      <div class="card">
        <p class="big">{inLine ? 'LINE' : 'このアプリ'}の中では、ホーム画面に追加できません。</p>
        <p>右上（または右下）の <b class="key">⋯</b> をタップして、「<b>Safariで開く</b>」か「<b>ブラウザで開く</b>」を選んでください。</p>
        <button class="btn primary" onclick={openInSafari}>Safariで開く</button>
      </div>
    {:else if isIOS}
      <ol class="steps">
        <li class="card">
          <span class="num">1</span>
          <div>
            <p>画面の下の<b>共有ボタン</b>か <b>⋯</b> をタップ</p>
            <div class="icons" aria-hidden="true">
              <svg viewBox="0 0 40 40"><rect x="9" y="15" width="22" height="19" rx="3" /><path d="M20 4v19M13.5 10.5L20 4l6.5 6.5" /></svg>
              <span>または</span>
              <svg viewBox="0 0 40 40"><circle cx="10" cy="20" r="2.6" class="dot" /><circle cx="20" cy="20" r="2.6" class="dot" /><circle cx="30" cy="20" r="2.6" class="dot" /></svg>
            </div>
          </div>
        </li>
        <li class="card">
          <span class="num">2</span>
          <div>
            <p>「<b>ホーム画面に追加</b>」をタップ</p>
            <p class="small muted">見つからないときは、下にスクロールしてください。⋯ をタップした場合は、先に「共有」を選んでください。</p>
            <div class="fake" aria-hidden="true">
              <span>ホーム画面に追加</span>
              <svg viewBox="0 0 40 40"><rect x="8" y="8" width="24" height="24" rx="5" /><path d="M20 14v12M14 20h12" /></svg>
            </div>
          </div>
        </li>
        <li class="card">
          <span class="num">3</span>
          <div>
            <p>右上の「<b>追加</b>」をタップ。これからは、ホーム画面の<b>えいごフレンズ</b>から開いてください。</p>
          </div>
        </li>
        <li class="card">
          <span class="num">4</span>
          <div>
            <p>はじめてホーム画面から開くときは、<b>ネットにつながった状態</b>で開いてください。</p>
            <p class="small muted">そのときに、ネットなしで使うための準備をします。「今日」の画面に「✓ ネットなしでも使えます」と出たら準備完了です。</p>
          </div>
        </li>
      </ol>
      <p class="small muted center">ホーム画面から開くと、記録がしっかり残ります（Safariで開いたときの記録とは別になります）。</p>
    {:else}
      <div class="card">
        <p class="big">iPhoneのSafariで開いてください。</p>
        <p class="muted">このまま試すこともできます。</p>
      </div>
    {/if}
  </div>
  <div class="actions">
    <button class="btn soft" onclick={later}>{isStandalone ? '戻る' : 'あとで'}</button>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    display: grid;
    gap: 12px;
    align-content: start;
    padding: 8px 0 12px;
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  .steps li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .num {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--sun);
    display: grid;
    place-items: center;
    font-weight: 900;
  }
  p {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.55;
  }
  .big {
    font-size: 18px;
    font-weight: 800;
  }
  .small {
    font-size: 13px;
  }
  .center {
    text-align: center;
  }
  .key {
    display: inline-block;
    padding: 0 6px;
    border: 2px solid var(--ink);
    border-radius: 8px;
  }
  .icons {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
  }
  svg {
    width: 44px;
    height: 44px;
    padding: 4px;
    border: 2px solid var(--ink);
    border-radius: 12px;
    background: var(--white);
    fill: none;
    stroke: #2f7de1;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .dot {
    fill: #2f7de1;
    stroke: none;
  }
  .fake {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px 8px 14px;
    border: 2px solid var(--ink-3);
    border-radius: 12px;
    background: var(--white);
    font-weight: 800;
  }
  .fake svg {
    width: 34px;
    height: 34px;
    border: none;
    stroke: var(--ink);
  }
  .actions {
    padding-top: 10px;
  }
</style>
