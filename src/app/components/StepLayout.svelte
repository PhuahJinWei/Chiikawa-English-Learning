<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * A step: the friend's bubble pinned at the top (it is their voice, so it never scrolls away), the cards scrolling
   * under it, and the thumb-zone buttons at the bottom: optional extra rows, then ← 前へ beside the main action.
   * New cards scroll just into view, so what was shown first stays on screen as long as possible (REVIEW 1.13).
   */
  let {
    top,
    body,
    extra,
    primary,
    onBack = null,
  }: { top?: Snippet; body: Snippet; extra?: Snippet; primary?: Snippet; onBack?: (() => void) | null } = $props();

  let content: HTMLDivElement | undefined = $state();
  let scroller: HTMLDivElement | undefined = $state();
  // ← 前へ appears where the previous step's main button was: ignore it for a moment so a double tap does not
  // send her straight back.
  let backArmed = $state(false);
  $effect(() => {
    const t = setTimeout(() => (backArmed = true), 600);
    return () => clearTimeout(t);
  });

  /** Brings the first card back into view (for example the main phrase, once the other phrasings have played). */
  export function toTop(): void {
    scroller?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $effect(() => {
    if (!content) return;
    const box = content;
    let count = box.childElementCount;
    const mo = new MutationObserver(() => {
      if (box.childElementCount > count) box.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      count = box.childElementCount;
    });
    mo.observe(box, { childList: true });
    return () => mo.disconnect();
  });
</script>

<div class="step">
  {#if top}<div class="top">{@render top()}</div>{/if}
  <div class="scroll" bind:this={scroller}>
    <div class="content" bind:this={content}>{@render body()}</div>
  </div>
  <div class="actions">
    {@render extra?.()}
    {#if onBack || primary}
      <div class="final">
        {#if onBack}
          <button class="btn soft back" onclick={() => backArmed && onBack?.()} aria-label="前のステップへ">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            前へ
          </button>
        {/if}
        {#if primary}<div class="primary">{@render primary()}</div>{/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .step {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .top {
    flex: none;
    padding-top: 18px;
    position: relative;
    z-index: 1;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    margin: 0 -16px;
    padding: 0 16px;
    mask-image: linear-gradient(transparent 0, #000 12px);
  }
  .content {
    display: grid;
    gap: 10px;
    padding: 10px 0 8px;
  }
  .step:not(:has(.top)) .content {
    padding-top: 16px;
  }
  .actions {
    flex: none;
    display: grid;
    gap: 10px;
    padding-top: 8px;
  }
  .final {
    display: flex;
    gap: 10px;
  }
  .back {
    flex: none;
    width: auto;
    padding: 8px 14px 8px 10px;
    gap: 2px;
  }
  .back svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .primary {
    flex: 1;
    display: grid;
    gap: 10px;
  }
</style>
