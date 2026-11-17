<script lang="ts">
  import { audioState } from '../audio.svelte.ts';
  import { app } from '../state.svelte.ts';

  /**
   * One small notice at a time, over the friends' stage, where it never covers a button (REVIEW 4.8): a failed save
   * matters most; then sound that did not play outside a lesson (a lesson shows that on its pause sheet); then a
   * non-fatal error, which she may close.
   */
  let glitchClosed = $state(false);
</script>

{#if !app.saved}
  <div class="notice warn" role="alert">記録を保存できませんでした。iPhoneの空き容量を確かめてください。</div>
{:else if audioState.stuck && app.screen !== 'lesson'}
  <div class="notice" role="status">音が出なかったようです。もう一度タップしてください。</div>
{:else if app.glitch && !glitchClosed}
  <div class="notice" role="status">
    <span>うまく動かない部分があったかもしれません。おかしいときは、アプリを開き直してください。</span>
    <button class="close" onclick={() => (glitchClosed = true)} aria-label="閉じる">✕</button>
  </div>
{/if}

<style>
  .notice {
    position: absolute;
    z-index: 10;
    top: calc(var(--safe-top) + 8px);
    left: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: var(--line) solid var(--ink);
    border-radius: var(--r-btn);
    /* A button's frame: the same hand-drawn line, with the hard shadow that lifts it off the page. */
    border-image: var(--frame-btn);
    background: var(--white);
    font-size: 14px;
    font-weight: 800;
    line-height: 1.45;
    animation: drop 0.25s ease-out both;
  }
  .warn {
    background: var(--alert);
  }
  .notice span {
    flex: 1;
  }
  .close {
    flex: none;
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    font-size: 18px;
    font-weight: 900;
  }
  @keyframes drop {
    from {
      transform: translateY(-8px);
      opacity: 0;
    }
  }
</style>
