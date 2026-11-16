<script lang="ts">
  import { audioPath } from '../../content/audio.ts';
  import { UI } from '../../content/index.ts';
  import type { Line } from '../../content/types.ts';
  import { play, type Channel } from '../audio.svelte.ts';
  import UiWord from './UiWord.svelte';

  /** Hear it again. Once learned, the button reads "Sorry, what?": asking again IS the phrase she is practising. */
  let { line, channel, disabled = false }: { line: Line | null; channel: Channel; disabled?: boolean } = $props();
</script>

<button class="btn soft" disabled={disabled || !line} onclick={() => line && play(audioPath(line.en), channel)}>
  <UiWord t={UI.sorry} />
</button>
