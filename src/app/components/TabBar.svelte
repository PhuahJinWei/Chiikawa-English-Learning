<script lang="ts">
  import { app, go, type Tab } from '../state.svelte.ts';

  /** The menu bar: four places, always one tap away except inside a lesson (REVIEW 1.1). */
  const tabs: { id: Tab; label: string; paths: string[] }[] = [
    { id: 'today', label: '今日', paths: ['M4 11.5L12 4l8 7.5', 'M6 10v10h4.5v-5.5h3V20H18V10'] },
    { id: 'notebook', label: 'ノート', paths: ['M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z', 'M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3', 'M9 7.5h6M9 11h6'] },
    { id: 'practice', label: '練習', paths: ['M4.5 12a7.5 7.5 0 0 1 13-5.1', 'M18.5 3.5v4h-4', 'M19.5 12a7.5 7.5 0 0 1-13 5.1', 'M5.5 20.5v-4h4'] },
    {
      id: 'settings',
      label: '設定',
      paths: [
        'M12 2.8l1.6 2.3 2.7-.6.8 2.6 2.6.8-.6 2.7 2.3 1.6-2.3 1.6.6 2.7-2.6.8-.8 2.6-2.7-.6L12 21.2l-1.6-2.3-2.7.6-.8-2.6-2.6-.8.6-2.7L2.8 12l2.3-1.6-.6-2.7 2.6-.8.8-2.6 2.7.6z',
        'M12 8.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4z',
      ],
    },
  ];
  const current = $derived(['selfcheck', 'install', 'backup'].includes(app.screen) ? 'settings' : app.screen);
</script>

<nav class="tabs" aria-label="メニュー">
  {#each tabs as t (t.id)}
    <button class:on={current === t.id} aria-current={current === t.id ? 'page' : undefined} onclick={() => go(t.id)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{#each t.paths as d, i (i)}<path {d} />{/each}</svg>
      <span>{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tabs {
    flex: none;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 6px 10px calc(6px + var(--safe-bottom));
    background: var(--paper);
    border-top: 2px solid var(--paper-3);
  }
  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 0 4px;
    border: none;
    border-radius: 14px;
    background: none;
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-3);
  }
  button.on {
    color: var(--ink);
    background: var(--paper-2);
  }
  svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
