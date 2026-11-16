<script lang="ts">
  /** Title row of a page reached from Settings (backup, self-check, install guide), with a close button. */
  let { title, onClose }: { title: string; onClose: () => void } = $props();
</script>

<div class="head">
  <h1>{title}</h1>
  <button class="close" onclick={onClose} aria-label="閉じる">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
  </button>
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0 6px;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 900;
  }
  .close {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: var(--line) solid var(--ink);
    background: var(--white);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .close svg {
    width: 20px;
    height: 20px;
    stroke: var(--ink);
    stroke-width: 3;
    stroke-linecap: round;
  }
</style>
