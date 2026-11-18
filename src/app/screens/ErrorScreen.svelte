<script lang="ts">
  import { untrack } from 'svelte';
  import { errorText } from '../errors.ts';
  import { deviceSummary, shareText } from '../platform.ts';
  import { app, go, versionLine } from '../state.svelte.ts';

  /**
   * A screen failed to draw (App.svelte catches it, so the menu and the friends keep working): a calm message, a way
   * back, and a way to send the details.
   */
  let { error, reset }: { error: unknown; reset: () => void } = $props();
  let sent = $state('');
  /** The screen that failed (this one is made the moment it fails). */
  const failedOn = untrack(() => app.screen);

  async function send() {
    const text = [
      '【えいごフレンズ】エラー',
      `バージョン: ${versionLine()}`,
      `端末: ${deviceSummary()}`,
      `画面: ${failedOn}`,
      `内容: ${errorText(error)}`,
    ].join('\n');
    const r = await shareText('【えいごフレンズ】エラー', text);
    sent = r === 'copied' ? 'コピーしました。LINEに貼り付けて送ってください。' : r === 'shared' ? '送りました。ありがとうございます！' : '';
  }

  function home() {
    // Another screen gets a fresh start by itself (App.svelte); Today itself is tried again.
    if (failedOn === 'today') reset();
    else go('today');
  }
</script>

<div class="page">
  <div class="card">
    <p class="big">ごめんなさい、この画面がうまく動きませんでした。</p>
    <p class="muted">
      {app.saved ? '記録は保存されています。' : ''}「今日」に戻るか、アプリを開き直してください。直らないときは、詳しい内容を送ってください。
    </p>
  </div>
  {#if sent}<p class="note">{sent}</p>{/if}
  <div class="actions">
    <button class="btn soft" onclick={send}>詳しい内容を送る</button>
    <button class="btn soft" onclick={() => location.reload()}>アプリを開き直す</button>
    <button class="btn primary" onclick={home}>「今日」に戻る</button>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    padding-top: 12px;
  }
  p {
    margin: 0 0 8px;
    line-height: 1.6;
    font-weight: 700;
  }
  .big {
    font-size: 19px;
    font-weight: 900;
  }
  .note {
    text-align: center;
  }
  .actions {
    margin-top: auto;
    display: grid;
    gap: 10px;
  }
</style>
