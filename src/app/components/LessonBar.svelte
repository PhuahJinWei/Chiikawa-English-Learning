<script lang="ts">
  /** The lesson's top row: ✕ (stop, asks first), how far she is, ⏸ (pause). */
  let { index, total, onQuit, onPause }: { index: number; total: number; onQuit: () => void; onPause: () => void } = $props();
  const shown = $derived(Math.min(index + 1, total));
</script>

<div class="bar">
  <button class="icon" onclick={onQuit} aria-label="やめる">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  </button>
  <div class="track" aria-label="{shown} / {total}"><span style="width:{(index / Math.max(1, total)) * 100}%"></span></div>
  <span class="count">{shown}/{total}</span>
  <button class="icon pause" onclick={onPause} aria-label="一時停止">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" /></svg>
  </button>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
  }
  .icon {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2px solid var(--ink);
    background: var(--white);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .icon:active {
    transform: scale(0.92);
  }
  .icon svg {
    width: 20px;
    height: 20px;
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
    fill: none;
  }
  .pause {
    background: var(--sun);
  }
  .track {
    flex: 1;
    height: 14px;
    border: 2px solid var(--ink);
    border-radius: 99px;
    background: var(--white);
    overflow: hidden;
  }
  .track span {
    display: block;
    height: 100%;
    background: var(--accent-2);
    border-radius: 99px;
    transition: width 0.4s ease;
  }
  .count {
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
    min-width: 34px;
    text-align: right;
  }
</style>
