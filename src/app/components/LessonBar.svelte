<script lang="ts">
  import type { Step } from '../../learn/session.ts';
  import { STEP_ICONS } from '../step-kinds.ts';

  /**
   * The lesson's top row: ✕ (stop, asks first), which step this is and how far she is, ⏸ (pause). Each kind of step
   * has its own name and icon, so she always knows what she is doing (the Focus design, 2026-11-16).
   */
  let {
    index,
    total,
    kind,
    label,
    tag = '',
    onQuit,
    onPause,
  }: {
    index: number;
    total: number;
    kind: Step['kind'];
    label: string;
    tag?: string;
    onQuit: () => void;
    onPause: () => void;
  } = $props();
  const shown = $derived(Math.min(index + 1, total));
</script>

<div class="bar">
  <button class="icon" onclick={onQuit} aria-label="やめる">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  </button>
  <div class="where">
    <div class="what">
      <svg class="kind" viewBox="0 0 24 24" aria-hidden="true">{#each STEP_ICONS[kind] as d (d)}<path {d} />{/each}</svg>
      <span class="name">{label}</span>
      {#if tag}<span class="tag">{tag}</span>{/if}
      <span class="count" aria-label="{total}ステップ中{shown}">{shown}/{total}</span>
    </div>
    <div class="track" aria-hidden="true"><span style="width:{(index / Math.max(1, total)) * 100}%"></span></div>
  </div>
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
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: var(--line) solid var(--ink);
    border-image: var(--frame-ring);
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
    stroke-width: 2.6;
    stroke-linecap: round;
    fill: none;
  }
  .pause {
    background: var(--sun);
  }
  .where {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 5px;
  }
  .what {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
  .kind {
    flex: none;
    width: 19px;
    height: 19px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .name {
    font-size: 15px;
    font-weight: 900;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tag {
    flex: none;
    font-size: 11px;
    font-weight: 800;
    padding: 1px 7px;
    border-radius: 99px;
    background: var(--paper-2);
    color: var(--ink-2);
  }
  .count {
    margin-left: auto;
    flex: none;
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .track {
    height: 8px;
    border-radius: 99px;
    background: var(--paper-3);
    overflow: hidden;
  }
  .track span {
    display: block;
    height: 100%;
    background: var(--accent-2);
    border-radius: 99px;
    transition: width 0.4s ease;
  }
</style>
