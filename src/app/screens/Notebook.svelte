<script lang="ts">
  import { EXCHANGES, SHELVES } from '../../content/index.ts';
  import type { Exchange } from '../../content/types.ts';
  import { newNote, noteFor, putNote, removeNote } from '../../learn/notes.ts';
  import type { Step } from '../../learn/session.ts';
  import type { Note } from '../../learn/progress.ts';
  import { TOP_BOX } from '../../learn/schedule.ts';
  import { audioState, play } from '../audio.svelte.ts';
  import { audioPath } from '../clips.ts';
  import NoteReading from '../components/NoteReading.svelte';
  import Ja from '../components/Ja.svelte';
  import NoteSheet from '../components/NoteSheet.svelte';
  import PhraseSheet from '../components/PhraseSheet.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import { hearNote } from '../note-voice.ts';
  import { app, save, startPractice } from '../state.svelte.ts';

  /**
   * The notebook (REVIEW 1.6), with two shelves. 習ったフレーズ: every phrase she has learned, grouped by pack; ▶
   * plays it, tapping the row opens it with all its versions, the replies and practice. メモ: her own notes (REVIEW
   * section 7); ⋯ on a note, or holding it, opens a small menu (change, hear, delete: 2026-11-17). A page of its own, without the friends' stage: lists need the room.
   */
  let open = $state<Exchange | null>(null);
  let shelf = $state<'phrases' | 'notes'>('phrases');
  let writing = $state<Note | 'new' | null>(null);
  /** The note whose menu is open (⋯, or a long press). */
  let menu = $state<Note | null>(null);
  /** The learned phrase whose menu is open (a long press). */
  let phraseMenu = $state<Exchange | null>(null);
  /** What she is looking for: phrases and memos whose English or Japanese holds it (2026-11-17). */
  let q = $state('');
  const needle = $derived(q.trim().toLowerCase());
  const has = (...texts: (string | undefined)[]) => texts.some((t) => !!t && t.toLowerCase().includes(needle));
  /** The memo just deleted, for 元に戻す (a few seconds), with its place in the list. */
  let undo = $state<{ note: Note; at: number } | null>(null);
  let undoTimer = 0;
  /** A note that could not be read aloud, and why: shown under that note. */
  let voiceProblem = $state<{ id: string; text: string } | null>(null);
  let layout: StepLayout | undefined = $state();

  async function hear(n: Note) {
    voiceProblem = null;
    const text = await hearNote(n.en);
    if (text) voiceProblem = { id: n.id, text };
  }

  function showShelf(which: 'phrases' | 'notes') {
    shelf = which;
    voiceProblem = null;
    layout?.toTop();
  }

  const notes = $derived(app.progress.notes);
  const shownNotes = $derived(needle ? notes.filter((n) => has(n.en, n.ja, ...(n.more ?? []))) : notes);

  /** Deletes a memo at once, and offers to undo it for a few seconds: kinder than asking every time. */
  function drop(id: string) {
    const at = app.progress.notes.findIndex((x) => x.id === id);
    if (at < 0) return;
    const note = $state.snapshot(app.progress.notes[at]) as Note;
    removeNote(app.progress, id);
    save();
    undo = { note, at };
    clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => (undo = null), 6000);
  }
  function restore() {
    if (!undo) return;
    app.progress.notes.splice(Math.min(undo.at, app.progress.notes.length), 0, undo.note);
    save();
    undo = null;
    clearTimeout(undoTimer);
  }

  // Holding a row for half a second opens its menu; the tap that ends the hold must not also open the row.
  const HOLD_MS = 500;
  let holdTimer = 0;
  let held = false;
  let startAt = { x: 0, y: 0 };
  function press(e: PointerEvent, open: () => void) {
    held = false;
    startAt = { x: e.clientX, y: e.clientY };
    clearTimeout(holdTimer);
    holdTimer = window.setTimeout(() => {
      held = true;
      open();
    }, HOLD_MS);
  }
  function drift(e: PointerEvent) {
    // Scrolling the list is not holding a row.
    if (Math.hypot(e.clientX - startAt.x, e.clientY - startAt.y) > 10) clearTimeout(holdTimer);
  }
  const release = () => clearTimeout(holdTimer);
  /** A tap, unless it is the end of a hold. */
  function tap(open: () => void) {
    if (held) held = false;
    else open();
  }
  /** The right mouse button, or an iPhone's own long press, opens the menu too. */
  function context(e: Event, open: () => void) {
    e.preventDefault();
    release();
    held = true;
    open();
  }

  // A learned phrase's menu: the same things its page offers.
  const keepLine = (e: Exchange) => (e.kind === 'say' ? e.short[0] : e.heard[0]);
  function practise(e: Exchange) {
    const steps: Step[] = [{ kind: 'catch', exId: e.id, review: false, ask: 'meaning' }];
    if (e.kind === 'reply') steps.push({ kind: 'catch', exId: e.id, review: false, ask: 'reply' });
    if (e.kind !== 'understand') steps.push({ kind: 'answer', exId: e.id, review: false });
    startPractice(steps, `「${e.title}」の練習`, 'notebook');
  }
  function addToNotes(e: Exchange) {
    const l = keepLine(e);
    if (putNote(app.progress, newNote(l.en, l.ja, Date.now(), e.id))) save();
  }

  const learned = (e: Exchange) => !!app.progress.ex[e.id]?.hear;
  /** One pip per review box (src/learn/schedule.ts). */
  const PIPS = Array.from({ length: TOP_BOX }, (_, i) => i + 1);
  const found = (e: Exchange) => !needle || has(e.title, ...[...e.heard, ...e.short, ...e.then].flatMap((l) => [l.en, l.ja]));
  const sections = $derived(
    SHELVES.map((s) => ({ shelf: s.topic, items: s.exchanges.filter((e) => learned(e) && found(e)) })).filter((s) => s.items.length),
  );
  const count = $derived(EXCHANGES.filter(learned).length);
  /** The clip playing now: its ▶ turns yellow, as in a lesson. */
  const playing = $derived(audioState.playing?.path ?? '');
  const main = (e: Exchange) => (e.kind === 'say' ? e.short[0] : e.heard[0]);
  const level = (e: Exchange) => {
    const ep = app.progress.ex[e.id];
    const say = e.kind === 'understand' ? (ep?.hear?.box ?? 0) : (ep?.say?.box ?? 0);
    return Math.min(ep?.hear?.box ?? 0, say);
  };

</script>

<StepLayout bind:this={layout}>
  {#snippet top()}
    <header>
      <h1 class="page-title">ノート</h1>
      <p class="page-intro">
        <Ja
          text={shelf === 'notes'
            ? notes.length
              ? 'メモは▶で聞けます|（レッスンにない英語は、|iPhoneの声で読みます）。|タップで書き直し、|長押しで|メニューが出ます。'
              : '送ってもらった英語を|貼り付けたり、|英語で何て言うか|知りたいことを|書いたりできます。'
            : count
              ? '習ったフレーズは|▶で聞けます。|タップで詳しく、|長押しで|メニューが出ます。'
              : '「今日」のレッスンで|習ったフレーズが、|ここに|たまっていきます。'}
        />
      </p>
    </header>
  {/snippet}
  {#snippet body()}
    <div class="shelves" role="tablist" aria-label="ノートの棚">
      <button role="tab" aria-selected={shelf === 'phrases'} class:on={shelf === 'phrases'} onclick={() => showShelf('phrases')}>
        習ったフレーズ
      </button>
      <button role="tab" aria-selected={shelf === 'notes'} class:on={shelf === 'notes'} onclick={() => showShelf('notes')}>
        メモ{notes.length ? `（${notes.length}）` : ''}
      </button>
    </div>
    {#if count || notes.length}
      <label class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg>
        <input type="text" enterkeyhint="search" autocapitalize="off" autocomplete="off" placeholder="英語か日本語でさがす" aria-label="さがす" bind:value={q} />
        {#if q}
          <button class="clear" onclick={() => (q = '')} aria-label="さがすのをやめる">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        {/if}
      </label>
    {/if}
    <!-- One wrapper per shelf: switching shelves is not "new cards", which StepLayout would scroll to. -->
    {#if shelf === 'notes'}
      <div class="shelf">
        <button class="btn soft" onclick={() => (writing = 'new')}>＋ メモを書く</button>
        <ul class="list">
          {#each shownNotes as n (n.id)}
            <li class="note-item">
              <div class="row">
                {#if n.en}
                  <button class="play" onclick={() => hear(n)} aria-label="「{n.en}」を聞く">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                  </button>
                {:else}
                  <span class="play ask" aria-hidden="true">?</span>
                {/if}
                <!-- In the list a note is short: two lines of English and of its reading, then two of her own
                     Japanese, which is what she scans for. The note opens whole in the editor. -->
                <button
                  class="row-main"
                  onclick={() => tap(() => (writing = n))}
                  onpointerdown={(e) => press(e, () => (menu = n))}
                  onpointermove={drift}
                  onpointerup={release}
                  onpointercancel={release}
                  onpointerleave={release}
                  oncontextmenu={(e) => context(e, () => (menu = n))}
                >
                  <span class="text">
                    {#if n.en}
                      <span class="note-en" lang="en">{n.en}</span>
                      <NoteReading en={n.en} small />
                    {:else}
                      <span class="ask-tag">英語で何て言う？</span>
                    {/if}
                    {#if n.ja}<span class="note-ja" class:main={!n.en}>{n.ja}</span>{/if}
                    {#each n.more ?? [] as m, i (i)}<span class="note-ja other"><b>{i + 2}</b>{m}</span>{/each}
                  </span>
                </button>
                <button class="dots" onclick={() => (menu = n)} aria-label="このメモのメニュー">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" /></svg>
                </button>
              </div>
              {#if voiceProblem?.id === n.id}<p class="problem" role="status">{voiceProblem.text}</p>{/if}
            </li>
          {/each}
        </ul>
        {#if needle && !shownNotes.length}<p class="later">「{q.trim()}」のメモは見つかりませんでした。</p>{/if}
      </div>
    {:else}
      <div class="shelf">
        <div class="count-row">
          <p class="count">習ったフレーズ <b>{count}</b> / {EXCHANGES.length}</p>
          {#if count}
            <!-- What the bars beside each phrase mean, said once. -->
            <span class="legend"><span class="level" aria-hidden="true"><i class="on"></i><i class="on"></i><i></i></span>覚えた度</span>
          {/if}
        </div>
        {#each sections as s (s.shelf.id)}
          <section>
            <h3>{s.shelf.title}</h3>
            <ul class="list">
              {#each s.items as e (e.id)}
                <li class="row">
                  <button
                    class="play"
                    class:on={playing === audioPath(main(e).en)}
                    onclick={() => play(audioPath(main(e).en), e.kind === 'say' ? 'model' : 'other')}
                    aria-label="「{main(e).en}」を聞く"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                  </button>
                  <button
                    class="row-main"
                    onclick={() => tap(() => (open = e))}
                    onpointerdown={(ev) => press(ev, () => (phraseMenu = e))}
                    onpointermove={drift}
                    onpointerup={release}
                    onpointercancel={release}
                    onpointerleave={release}
                    oncontextmenu={(ev) => context(ev, () => (phraseMenu = e))}
                  >
                    <span class="text">
                      <span class="title">{e.title}</span>
                      <span class="en" lang="en">{main(e).en}</span>
                    </span>
                    <span class="level" aria-label="覚えた度 {level(e)} / {TOP_BOX}">
                      {#each PIPS as n (n)}<i class:on={n <= level(e)}></i>{/each}
                    </span>
                    <span class="go" aria-hidden="true">›</span>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
        {#if needle && !sections.length}<p class="later">「{q.trim()}」のフレーズは見つかりませんでした。</p>{/if}
        {#if count < EXCHANGES.length && !needle}
          <p class="later">まだ習っていないフレーズ：あと{EXCHANGES.length - count}個</p>
        {/if}
      </div>
    {/if}
  {/snippet}
</StepLayout>

{#if open}<PhraseSheet ex={open} onClose={() => (open = null)} />{/if}
{#if writing}
  <NoteSheet
    note={writing === 'new' ? null : writing}
    onClose={() => (writing = null)}
    onDelete={() => {
      const n = writing;
      writing = null;
      if (n && n !== 'new') drop(n.id);
    }}
  />
{/if}

<!-- A note's menu: from ⋯ on its row, or from holding it. Deleting asks once, right here. -->
{#if menu}
  {@const n = menu}
  <div class="menu-back" role="presentation" onclick={() => (menu = null)}></div>
  <div class="menu" role="dialog" aria-modal="true" aria-label="メモのメニュー">
    <p class="menu-title" lang={n.en ? 'en' : 'ja'}>{n.en || n.ja}</p>
    <button
        class="btn soft"
        onclick={() => {
          writing = n;
          menu = null;
        }}>書き直す</button
      >
      {#if n.en}
        <button
          class="btn soft"
          onclick={() => {
            void hear(n);
            menu = null;
          }}>▶ 聞く</button
        >
      {/if}
      <button
        class="btn soft oops"
        onclick={() => {
          drop(n.id);
          menu = null;
        }}>メモを削除</button
      >
      <button class="btn light" onclick={() => (menu = null)}>閉じる</button>
  </div>
{/if}

<!-- A learned phrase's menu, from holding it. -->
{#if phraseMenu}
  {@const e = phraseMenu}
  {@const noted = !!noteFor(app.progress, keepLine(e).en)}
  <div class="menu-back" role="presentation" onclick={() => (phraseMenu = null)}></div>
  <div class="menu" role="dialog" aria-modal="true" aria-label="フレーズのメニュー">
    <p class="menu-title" lang="en">{keepLine(e).en}</p>
    <button
      class="btn soft"
      onclick={() => {
        void play(audioPath(keepLine(e).en), e.kind === 'say' ? 'model' : 'other');
        phraseMenu = null;
      }}>▶ 聞く</button
    >
    <button class="btn soft" onclick={() => practise(e)}>練習する</button>
    <button class="btn soft" disabled={noted} onclick={() => addToNotes(e)}>{noted ? 'メモにあります' : 'メモに追加'}</button>
    <button
      class="btn soft"
      onclick={() => {
        open = e;
        phraseMenu = null;
      }}>詳しく見る</button
    >
    <button class="btn light" onclick={() => (phraseMenu = null)}>閉じる</button>
  </div>
{/if}

<!-- After deleting a memo: a few seconds to take it back. -->
{#if undo}
  <div class="undo" role="status">
    <span>メモを削除しました</span>
    <button onclick={restore}>元に戻す</button>
  </div>
{/if}

<style>
  .count {
    margin: 0;
    font-weight: 800;
  }
  h3 {
    margin: 4px 0 6px;
    font-size: 15px;
    font-weight: 900;
    color: var(--ink-2);
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .count-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .legend {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .legend .level i {
    height: 11px;
  }
  /* One card per phrase: ▶ on the left, then the phrase, which opens it. */
  .row {
    display: flex;
    align-items: center;
    /* ▶ is 44px, with room between it and the row, so a tap meant for one does not land on the other. */
    gap: 8px;
    padding-left: 9px;
    border: var(--line) solid var(--ink);
    border-radius: var(--r-row);
    border-image: var(--frame-row);
    background: var(--white);
  }
  /* ▶ as in a lesson: a round button in a drawn ring, yellow while its phrase plays. */
  .play {
    flex: none;
    width: 44px;
    height: 44px;
    border: var(--line) solid var(--ink);
    border-radius: 50%;
    border-image: var(--frame-ring);
    background: var(--white);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .play.on {
    background: var(--sun);
  }
  .play:active {
    transform: scale(0.92);
  }
  .play svg {
    width: 17px;
    height: 17px;
    fill: var(--ink);
    margin-left: 2px;
  }
  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 60px;
    padding: 8px 10px 8px 2px;
    border: none;
    background: none;
    text-align: left;
  }
  .text {
    flex: 1;
    display: grid;
    min-width: 0;
  }
  .title {
    font-weight: 800;
    font-size: 15px;
  }
  .en {
    font-family: var(--font-en);
    font-weight: 800;
    font-size: 16px;
    color: var(--ink-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .level {
    display: inline-flex;
    gap: 2px;
  }
  .level i {
    width: 7px;
    height: 14px;
    border-radius: 3px;
    background: var(--paper-3);
  }
  .level i.on {
    background: var(--mint-2);
  }
  .go {
    font-size: 22px;
    color: var(--ink-3);
  }
  .later {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-2);
  }
  .shelf {
    display: grid;
    gap: inherit;
  }
  .note-item {
    display: grid;
    gap: 6px;
  }
  .problem {
    margin: 0;
    padding: 6px 10px;
    border-radius: 10px;
    background: var(--alert);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.5;
  }
  /* A hand-drawn outline around both tabs. The ink behind them shows in the gap between them (the divider) and fills
     any room the drawn line leaves along their edges. */
  .shelves {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    border: 3px solid var(--ink);
    border-radius: var(--r-ctl);
    border-image: var(--frame-ctl);
    background: var(--ink);
    overflow: hidden;
  }
  .shelves button {
    min-height: 46px;
    border: none;
    background: var(--white);
    font-weight: 900;
    font-size: 15px;
  }
  .shelves button.on {
    background: var(--sun);
  }
  .play.ask {
    background: var(--paper-2);
    font-size: 22px;
    font-weight: 900;
  }
  .note-item .text {
    gap: 2px;
  }
  .note-en {
    font-family: var(--font-en);
    font-weight: 800;
    font-size: 17px;
    line-height: 1.3;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* A question with no English yet: a small tag, then her question as the note's main line. */
  .ask-tag {
    justify-self: start;
    padding: 2px 9px;
    border-radius: 99px;
    background: var(--paper-2);
    font-size: 12.5px;
    font-weight: 800;
    color: var(--ink-2);
  }
  /* Her own Japanese: darker than the reading, since it is what she looks for in the list. */
  .note-ja {
    font-size: 14.5px;
    font-weight: 700;
    line-height: 1.5;
    color: var(--ink);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .note-ja.main {
    font-size: 15.5px;
    font-weight: 800;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
  /* The other meanings of a note, numbered from 2 (the first is her main Japanese). */
  .note-ja.other {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
  .note-ja.other b {
    display: inline-block;
    min-width: 17px;
    margin-right: 5px;
    padding: 0 4px;
    border-radius: 6px;
    background: var(--paper-2);
    font-size: 12px;
    text-align: center;
    color: var(--ink-2);
  }
  /* Holding a note opens its menu: no iPhone callout or text selection in the way. */
  .note-item .row-main {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    padding-right: 2px;
  }
  .dots {
    flex: none;
    align-self: stretch;
    width: 44px;
    border: none;
    background: none;
    display: grid;
    place-items: center;
    padding: 0;
  }
  .dots svg {
    width: 22px;
    height: 22px;
    fill: var(--ink-2);
  }
  .menu-back {
    position: absolute;
    inset: 0;
    z-index: 6;
    background: rgba(74, 55, 40, 0.35);
  }
  .menu {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 7;
    display: grid;
    gap: 8px;
    padding: 14px 16px calc(14px + var(--safe-bottom));
    background: var(--paper);
    /* The same hand-drawn top edge as the page panel. */
    border: 0 solid var(--ink);
    border-top-width: 4px;
    border-radius: 26px 26px 0 0;
    border-image: var(--frame-edge);
  }
  .menu-title {
    margin: 0 0 2px;
    font-weight: 800;
    font-size: 16px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* Holding a phrase opens its menu too. */
  .row .row-main {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px 0 12px;
    border: var(--line) solid var(--ink);
    border-radius: var(--r-row);
    border-image: var(--frame-row);
    background: var(--white);
  }
  .search svg {
    flex: none;
    width: 19px;
    height: 19px;
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 2.4;
    stroke-linecap: round;
  }
  /* 16px or more: iPhone zooms the page into smaller text boxes. */
  .search input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    border: none;
    outline: none;
    background: none;
    font: inherit;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink);
    -webkit-user-select: text;
    user-select: text;
  }
  .search input::placeholder {
    font-weight: 500;
    color: var(--ink-3);
    opacity: 1;
  }
  .clear {
    flex: none;
    width: 34px;
    height: 34px;
    border: var(--line) solid var(--ink);
    border-radius: 50%;
    border-image: var(--frame-ring);
    background: var(--white);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .clear svg {
    width: 14px;
    height: 14px;
  }
  .undo {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 10px;
    z-index: 8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 8px 8px 14px;
    /* A sticker, like the notices over the stage. */
    border: var(--line) solid var(--ink);
    border-radius: var(--r-btn);
    border-image: var(--frame-btn);
    background: var(--white);
    font-size: 14.5px;
    font-weight: 800;
  }
  .undo button {
    min-height: 40px;
    padding: 0 14px;
    border: var(--line) solid var(--ink);
    border-radius: var(--r-row);
    border-image: var(--frame-row);
    background: var(--sun);
    font-size: 14.5px;
    font-weight: 900;
  }
</style>
