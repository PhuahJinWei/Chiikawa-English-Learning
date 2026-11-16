<script lang="ts">
  /**
   * Japanese text that wraps only between phrases, never in the middle of a word ("いくつで／も" or "くださ／い"):
   * `|` in the text marks where a line may break, and nowhere else may it (2026-11-17). Each piece must fit a phone
   * line, so pieces are short phrases.
   */
  let { text }: { text: string } = $props();
  const parts = $derived(text.split('|'));
</script>

<span class="keep">{#each parts as p, i (i)}{#if i}<wbr />{/if}{p}{/each}</span>
