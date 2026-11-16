<script lang="ts">
  import { kanaSegments } from '../../content/kana.ts';

  /**
   * A katakana reading with its stressed beat marked by dots above it (傍点, the way Japanese marks emphasis) and set
   * in bold: "say this part strongly".
   */
  let { text }: { text: string } = $props();
  const parts = $derived(kanaSegments(text));
</script>

{#each parts as p, i (i)}{#if p.stress}<b class="stress">{p.text}</b>{:else}{p.text}{/if}{/each}

<style>
  .stress {
    font-weight: 900;
    color: var(--ink);
    -webkit-text-emphasis: filled circle;
    text-emphasis: filled circle;
    -webkit-text-emphasis-position: over right;
    text-emphasis-position: over right;
  }
</style>
