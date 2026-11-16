<script lang="ts">
  import { UI } from '../../content/index.ts';
  import UiWord from './UiWord.svelte';

  /** ✕ asks first (REVIEW 1.4). The buttons are "No." / "Yes." once she has learned them. */
  let { daily, onYes, onNo }: { daily: boolean; onYes: () => void; onNo: () => void } = $props();
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="quit-title">
  <div class="card">
    <h2 id="quit-title">{daily ? '今日はここまでにしますか？' : '練習をやめますか？'}</h2>
    {#if daily}<p class="note">ここまでの記録は残ります。続きは「今日」からいつでも再開できます。</p>{/if}
    <div class="row">
      <button class="btn" onclick={onNo}><UiWord t={UI.no} /></button>
      <button class="btn oops" onclick={onYes}><UiWord t={UI.yes} /></button>
    </div>
  </div>
</div>

<style>
  .sheet {
    position: absolute;
    inset: 0;
    z-index: 7;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgba(255, 249, 239, 0.92);
    border-radius: 26px 26px 0 0;
  }
  .card {
    width: 100%;
    max-width: 420px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 900;
    text-align: center;
  }
  .note {
    margin: 0 0 14px;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-2);
    text-align: center;
    line-height: 1.55;
  }
</style>
