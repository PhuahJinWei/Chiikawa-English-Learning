<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { newNote, putNote, removeNote, tidyEnglish } from '../../learn/notes.ts';
  import { NOTE_EN_MAX, NOTE_JA_MAX, type Note } from '../../learn/progress.ts';
  import { heartPath } from '../clips.ts';
  import { hearNote } from '../note-voice.ts';
  import { app, save } from '../state.svelte.ts';
  import NoteReading from './NoteReading.svelte';
  import SheetHead from './SheetHead.svelte';

  /**
   * Writing or changing one note (REVIEW section 7). The English is usually pasted from a LINE message: she cannot
   * spell it. A note may also be Japanese only, a "how do I say…?" question. What she writes is kept however she
   * leaves: ✕, 保存する, the menu bar, or the app going into the background (to copy English from LINE, say).
   */
  let { note, onClose }: { note: Note | null; onClose: () => void } = $props();
  const editing = untrack(() => note);
  /** The note being written: an existing one, or a new one whose id is fixed now, so saving twice never adds two. */
  const base: Note = untrack(() => note) ?? newNote('', '', Date.now());
  let en = $state(base.en);
  let ja = $state(base.ja);
  /** What was last saved, to save only what changed. */
  let saved = { en: base.en, ja: base.ja.trim() };
  let problem = $state('');
  let confirming = $state(false);
  /** Why it could not be read aloud, if it could not. */
  let voiceProblem = $state('');

  const english = $derived(tidyEnglish(en));
  const heart = $derived(!!english && !!heartPath(english));
  const hasJapanese = $derived(/[ぁ-ヿ一-鿿]/.test(en));
  async function paste() {
    try {
      const text = tidyEnglish(await navigator.clipboard.readText());
      if (!text) {
        // A sticker, a photo or nothing at all: never wipe what is already there.
        problem = 'コピーした英語が見つかりませんでした。LINEで英語の文を長押しして「コピー」してから、もう一度押してください。';
        return;
      }
      en = text;
      problem = '';
    } catch {
      problem = '貼り付けできませんでした。英語の枠を長押しして「ペースト」を選んでください。';
    }
  }

  /** Saves what changed; an empty note is never saved. False only when there is no room for a new note. */
  function keep(): boolean {
    const now = { en: english, ja: ja.trim() };
    if ((now.en === saved.en && now.ja === saved.ja) || (!now.en && !now.ja)) return true;
    if (!putNote(app.progress, { ...base, en: now.en, ja, updated: Date.now() })) return false;
    saved = now;
    save();
    return true;
  }

  /** 保存する: keeps it and closes, or says why it cannot. */
  function done() {
    if (keep()) onClose();
    else problem = 'メモがいっぱいです。使わないメモを削除してから、もう一度保存してください。';
  }

  /** ✕ always closes (keeping what it can): she must never be stuck in here. */
  function close() {
    keep();
    onClose();
  }

  function remove() {
    saved = { en: '', ja: '' };
    en = '';
    ja = '';
    removeNote(app.progress, base.id);
    save();
    onClose();
  }

  // Leaving by the menu bar destroys the editor without ✕; going into the background may be the last chance.
  onDestroy(() => keep());
  $effect(() => {
    const away = () => document.hidden && keep();
    document.addEventListener('visibilitychange', away);
    return () => document.removeEventListener('visibilitychange', away);
  });
</script>

<div class="sheet" role="dialog" aria-modal="true" aria-label="メモ">
  <SheetHead title={editing ? 'メモ' : '新しいメモ'} onClose={close} />
  <div class="scroll">
    <label class="field">
      <span class="label">英語</span>
      <textarea
        class="en"
        rows="3"
        lang="en"
        maxlength={NOTE_EN_MAX}
        autocapitalize="off"
        autocomplete="off"
        spellcheck="false"
        placeholder="LINEで送ってもらった英語を、ここに貼り付けます"
        bind:value={en}
      ></textarea>
    </label>
    <div class="row tools">
      <button class="btn soft" onclick={paste}>コピーした英語を貼り付ける</button>
      <!-- Which voice reads it is said on the button itself: the lessons' voice, or the iPhone's for other English. -->
      <button class="btn soft listen" disabled={!english} onclick={async () => (voiceProblem = await hearNote(english))} aria-label="英語を聞く">
        <span>▶ 聞く</span>
        {#if english}<span class="voice">{heart ? 'レッスンの声' : 'iPhoneの声'}</span>{/if}
      </button>
    </div>
    {#if english}
      <NoteReading en={english} boxed />
    {/if}
    {#if voiceProblem}<p class="warn">{voiceProblem}</p>{/if}
    {#if hasJapanese}<p class="warn">英語の欄に日本語が入っています。英語だけにすると、正しく読み上げられます。</p>{/if}

    <label class="field">
      <span class="label">メモ（日本語）</span>
      <textarea rows="4" maxlength={NOTE_JA_MAX} placeholder="意味、使う場面、聞いてみたいことなど" bind:value={ja}></textarea>
    </label>
    {#if !english}
      <p class="hint">英語がなくても保存できます。「英語で何て言う？」として残しておいて、あとで聞いてみましょう。</p>
    {/if}
    {#if problem}<p class="warn">{problem}</p>{/if}

    {#if editing}
      {#if confirming}
        <div class="confirm">
          <p>このメモを削除しますか？</p>
          <div class="row">
            <button class="btn soft" onclick={() => (confirming = false)}>やめる</button>
            <button class="btn soft oops" onclick={remove}>削除する</button>
          </div>
        </div>
      {:else}
        <button class="delete" onclick={() => (confirming = true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 4h4" /><path d="M7 7l1 12.5h8L17 7" /><path d="M10.5 10.5v6M13.5 10.5v6" /></svg>
          このメモを削除
        </button>
      {/if}
    {/if}
  </div>
  <div class="actions">
    <button class="btn primary" disabled={!english && !ja.trim()} onclick={done}>保存する</button>
  </div>
</div>

<style>
  .sheet {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    padding: 12px 16px calc(12px + var(--safe-bottom));
    background: var(--paper);
    border-radius: 26px 26px 0 0;
  }
  .scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: grid;
    gap: 10px;
    align-content: start;
    /* 4px of room at each side, so the drawn lines' outer edge (they reach 2px outside each card) is not cut off. */
    margin: 0 -4px;
    padding: 6px 4px 12px;
  }
  .field {
    display: grid;
    gap: 4px;
  }
  .label {
    font-size: 14px;
    font-weight: 900;
    color: var(--ink-2);
  }
  /* 16px or more: iPhone zooms the page into smaller text boxes. */
  textarea {
    width: 100%;
    font: inherit;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.5;
    padding: 10px 12px;
    border: var(--line) solid var(--ink);
    border-radius: var(--r-row);
    border-image: var(--frame-row);
    background: var(--white);
    color: var(--ink);
    resize: none;
    -webkit-user-select: text;
    user-select: text;
  }
  textarea.en {
    font-family: var(--font-en);
    font-size: 19px;
    font-weight: 800;
  }
  .tools {
    grid-auto-flow: row;
    grid-template-columns: 1fr auto;
  }
  .listen {
    flex-direction: column;
    gap: 0;
    padding: 6px 14px;
    line-height: 1.2;
  }
  .voice {
    font-size: 12px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .hint {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-2);
    line-height: 1.5;
  }
  .warn {
    margin: 0;
    padding: 6px 10px;
    border-radius: 10px;
    background: var(--blush);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.5;
  }
  /* Deleting is rare: a quiet link under the note, not a button as big as 保存する. It still asks first. */
  .delete {
    justify-self: center;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 12px;
    border: none;
    background: none;
    font-size: 14px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .delete:active {
    color: var(--ink);
  }
  .delete svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .confirm {
    display: grid;
    gap: 8px;
  }
  .confirm p {
    margin: 0;
    font-weight: 800;
    text-align: center;
  }
  .actions {
    padding-top: 8px;
  }
</style>
