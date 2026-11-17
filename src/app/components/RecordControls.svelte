<script lang="ts">
  import { canRecord, playMine, recorder, startRecording, stopRecording } from '../recorder.svelte.ts';

  /**
   * Her own voice in a conversation (src/app/recorder.svelte.ts): `record` while it is her turn (only if she taps it),
   * `listen` once the model has played. Nothing shows on a phone that cannot record.
   */
  let { mode }: { mode: 'record' | 'listen' } = $props();
  const able = canRecord();
</script>

{#if able && mode === 'record'}
  {#if recorder.state === 'recording'}
    <button class="btn light rec on" onclick={() => void stopRecording()}><span class="dot" aria-hidden="true"></span>録音中…（タップで止める）</button>
  {:else}
    <button class="btn light rec" disabled={recorder.state === 'asking'} onclick={() => void startRecording()}>
      <span class="dot" aria-hidden="true"></span>{recorder.state === 'ready' ? '録音しなおす' : '自分の声を録音する'}
    </button>
  {/if}
  {#if recorder.state === 'denied'}
    <p class="rec-note">マイクが使えませんでした。iPhoneの「設定」でマイクを許可すると録音できます。</p>
  {:else if recorder.state === 'failed'}
    <p class="rec-note">録音できませんでした。録音なしでも続けられます。</p>
  {/if}
{:else if able && recorder.state === 'ready'}
  <button class="btn light rec" class:on={recorder.playing} onclick={playMine}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
    {recorder.playing ? '止める' : '自分の声を聞く'}
  </button>
{/if}

<style>
  .rec {
    width: auto;
    justify-self: center;
    min-height: 44px;
    padding: 6px 18px 6px 14px;
    gap: 8px;
    font-size: 15px;
  }
  .rec.on {
    background: var(--blush);
  }
  .rec svg {
    width: 16px;
    height: 16px;
    fill: var(--ink);
  }
  .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #e0607a;
  }
  .rec.on .dot {
    animation: rec 1s ease-in-out infinite;
  }
  @keyframes rec {
    50% {
      opacity: 0.25;
    }
  }
  .rec-note {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
  }
</style>
