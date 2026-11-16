<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { FriendId } from '../../stage/types.ts';
  import { audioState } from '../audio.svelte.ts';
  import { FRIENDS } from '../friends.ts';
  import { sfx } from '../sfx.ts';
  import { stage } from '../stage.ts';

  /**
   * A friend's own speech: Japanese typed out with soft blips while their mouth moves. The mouth moves only while
   * typing AND while no English clip is playing: the English voice is never a friend's voice (REVIEW 3.10).
   * The tail points at whoever is speaking: up from under the stage (lessons), or down from above their head (Today,
   * where the bubble floats over the scene).
   */
  let {
    who,
    text = '',
    tail = 'up',
    named = true,
    before,
    children,
  }: {
    who: FriendId;
    text?: string;
    tail?: 'up' | 'down';
    /** Show the speaker's name (off where the tail alone makes it plain, as on Today). */
    named?: boolean;
    before?: Snippet;
    children?: Snippet;
  } = $props();

  let shown = $state('');
  let typing = $state(false);
  let el: HTMLDivElement | undefined = $state();

  $effect(() => {
    const full = text;
    shown = '';
    typing = false;
    if (!full) return;
    const chars = [...full];
    const step = Math.max(14, Math.min(38, 1300 / chars.length));
    let i = 0;
    let timer = 0;
    typing = true;
    const tick = () => {
      i++;
      shown = chars.slice(0, i).join('');
      if (i % 3 === 1 && !audioState.playing) sfx.blip();
      if (i < chars.length) timer = window.setTimeout(tick, step);
      else typing = false;
    };
    timer = window.setTimeout(tick, 60);
    return () => {
      clearTimeout(timer);
      typing = false;
    };
  });

  $effect(() => {
    const id = who;
    stage.setTalking(id, typing && !audioState.playing);
    return () => stage.setTalking(id, false);
  });

  // Keep the tail under the speaker as they move.
  $effect(() => {
    const id = who;
    const place = () => {
      if (!el) return;
      const head = stage.headAnchor(id);
      const box = el.getBoundingClientRect();
      const x = head ? head.x - box.left : box.width / 2;
      el.style.setProperty('--tail-x', `${Math.max(28, Math.min(box.width - 28, x))}px`);
    };
    place();
    return stage.onFrame(place);
  });
</script>

<div class="bubble" class:down={tail === 'down'} bind:this={el}>
  {#if named}<span class="name">{FRIENDS[who].name}</span>{/if}
  {@render before?.()}
  {#if text}<p class="text" aria-label={text}>{shown}<span class="rest" aria-hidden="true">{text.slice(shown.length)}</span></p>{/if}
  {@render children?.()}
</div>

<style>
  .bubble {
    --tail-x: 50%;
    position: relative;
    background: var(--white);
    border: var(--line) solid var(--ink);
    border-radius: var(--hand);
    padding: 7px 13px 9px;
    font-size: 15px;
    line-height: 1.5;
    font-weight: 700;
  }
  .bubble::before,
  .bubble::after {
    content: '';
    position: absolute;
    left: var(--tail-x);
    border-style: solid;
    transform: translateX(-50%);
  }
  .bubble::before {
    top: -15px;
    border-width: 0 10px 15px 10px;
    border-color: transparent transparent var(--ink) transparent;
  }
  .bubble::after {
    top: -11px;
    border-width: 0 7px 12px 7px;
    border-color: transparent transparent var(--white) transparent;
  }
  .down::before {
    top: auto;
    bottom: -15px;
    border-width: 15px 10px 0 10px;
    border-color: var(--ink) transparent transparent transparent;
  }
  .down::after {
    top: auto;
    bottom: -11px;
    border-width: 12px 7px 0 7px;
    border-color: var(--white) transparent transparent transparent;
  }
  .name {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: var(--ink-2);
    margin-bottom: 1px;
  }
  .text {
    margin: 0;
    white-space: pre-line;
  }
  /* The untyped rest keeps its space, so the bubble does not grow line by line. */
  .rest {
    visibility: hidden;
  }
</style>
