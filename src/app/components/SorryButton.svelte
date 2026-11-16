<script lang="ts">
  import { audioPath } from '../../content/audio.ts';
  import { UI } from '../../content/index.ts';
  import type { Line } from '../../content/types.ts';
  import { play, type Channel } from '../audio.svelte.ts';
  import UiWord from './UiWord.svelte';

  /**
   * Hear it again. Once learned, the button reads "Sorry, what?": asking again IS the phrase she is practising.
   * A light button under the sound it replays, not as wide as the page: it helps, it is not the task (2026-11-17).
   */
  let { line, channel, disabled = false }: { line: Line | null; channel: Channel; disabled?: boolean } = $props();
</script>

<button class="btn light again" disabled={disabled || !line} onclick={() => line && play(audioPath(line.en), channel)}>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95" /><path d="M19 4.5V8h-3.5" /></svg>
  <UiWord t={UI.sorry} />
</button>

<style>
  .again {
    width: auto;
    justify-self: center;
    min-height: 44px;
    padding: 6px 18px 6px 14px;
    gap: 6px;
    font-size: 15px;
  }
  .again svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--ink);
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
