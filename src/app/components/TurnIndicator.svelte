<script lang="ts">
  import type { UiText } from '../../content/ui.ts';
  import UiWord from './UiWord.svelte';

  /** "Your turn": tells her when to speak out loud. The phone does not listen; this only shows the moment. */
  let { t, active }: { t: UiText; active: boolean } = $props();
</script>

<div class="turn" class:active aria-live="polite">
  <span class="ring" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8H4l2.2-2.6A7.9 7.9 0 0 1 4 12z" /><path d="M9 11h.01M12 11h.01M15 11h.01" /></svg>
  </span>
  <span class="label"><UiWord {t} size="small" /></span>
</div>

<style>
  .turn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 6px 0;
    opacity: 0.35;
    transition: opacity 0.2s;
  }
  .turn.active {
    opacity: 1;
  }
  .ring {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 3px solid var(--ink);
    background: var(--sun);
    display: grid;
    place-items: center;
  }
  .active .ring::after {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 3px solid var(--sun-2);
    animation: pulse 1.1s ease-out infinite;
  }
  @keyframes pulse {
    from {
      transform: scale(0.8);
      opacity: 1;
    }
    to {
      transform: scale(1.25);
      opacity: 0;
    }
  }
  .ring svg {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .label {
    font-size: 17px;
    font-weight: 900;
  }
</style>
