<script lang="ts">
  import { tick } from 'svelte';
  import { EXCHANGES, SHELVES } from '../../content/index.ts';
  import type { Exchange } from '../../content/types.ts';
  import { notesMessage } from '../../learn/notes.ts';
  import type { Note } from '../../learn/progress.ts';
  import { TOP_BOX } from '../../learn/schedule.ts';
  import { play } from '../audio.svelte.ts';
  import { audioPath, heartPath } from '../clips.ts';
  import Bubble from '../components/Bubble.svelte';
  import NoteSheet from '../components/NoteSheet.svelte';
  import PhraseSheet from '../components/PhraseSheet.svelte';
  import StepLayout from '../components/StepLayout.svelte';
  import { hearNote } from '../note-voice.ts';
  import { shareText } from '../platform.ts';
  import { lifetime } from '../script.svelte.ts';
  import { stage } from '../stage.ts';
  import { app } from '../state.svelte.ts';

  /**
   * The notebook (REVIEW 1.6), with two shelves. 習ったフレーズ: every phrase she has learned, grouped by pack; ▶
   * plays it, tapping the row opens it with all its versions, the replies and practice. メモ: her own notes (REVIEW
   * section 7), which she can send you. Furuhonya, the bookseller, keeps it.
   */
  const life = lifetime();
  let open = $state<Exchange | null>(null);
  let shelf = $state<'phrases' | 'notes'>('phrases');
  let writing = $state<Note | 'new' | null>(null);
  let sent = $state('');
  let sentText = $state('');
  /** A note that could not be read aloud, and why: shown under that note. */
  let voiceProblem = $state<{ id: string; text: string } | null>(null);
  let layout: StepLayout | undefined = $state();
  let sentEl: HTMLElement | undefined = $state();

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

  async function sendNotes() {
    const text = notesMessage($state.snapshot(app.progress.notes) as Note[], (en) => !!heartPath(en));
    const r = await shareText('【えいごフレンズ】メモ', text);
    sentText = r === 'failed' ? text : '';
    sent =
      r === 'copied'
        ? 'コピーしました。LINEに貼り付けて送ってください。'
        : r === 'shared'
          ? '送りました。'
          : '送れなかったときは、下の文章をすべて選んでコピーしてください。';
    await tick();
    sentEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const learned = (e: Exchange) => !!app.progress.ex[e.id]?.hear;
  /** One pip per review box (src/learn/schedule.ts). */
  const PIPS = Array.from({ length: TOP_BOX }, (_, i) => i + 1);
  const sections = $derived(SHELVES.map((s) => ({ shelf: s.topic, items: s.exchanges.filter(learned) })).filter((s) => s.items.length));
  const count = $derived(EXCHANGES.filter(learned).length);
  const main = (e: Exchange) => (e.kind === 'say' ? e.short[0] : e.heard[0]);
  const level = (e: Exchange) => {
    const ep = app.progress.ex[e.id];
    const say = e.kind === 'understand' ? (ep?.hear?.box ?? 0) : (ep?.say?.box ?? 0);
    return Math.min(ep?.hear?.box ?? 0, say);
  };

  life.run(async () => {
    await stage.setCast(['furuhonya']);
    void stage.play('furuhonya', 'read');
  });
</script>

<StepLayout bind:this={layout}>
  {#snippet top()}
    <Bubble
      who="furuhonya"
      text={shelf === 'notes'
        ? notes.length
          ? 'メモは▶で聞けるよ。タップすると書き直せるよ。'
          : 'ここは、あなたのメモ帳。送ってもらった英語を貼り付けたり、英語で何て言うか知りたいことを書いたりできるよ。'
        : count
          ? '習ったフレーズのノートだよ。▶で聞けるし、タップすると詳しく見られるよ。'
          : 'ここは、習ったフレーズのノート。「今日」のレッスンで習うと、ここにたまっていくよ。'}
    />
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
    <!-- One wrapper per shelf: switching shelves is not "new cards", which StepLayout would scroll to. -->
    {#if shelf === 'notes'}
      <div class="shelf">
        <button class="btn soft" onclick={() => (writing = 'new')}>＋ メモを書く</button>
        <ul class="list">
          {#each notes as n (n.id)}
            <li class="note-item">
              <div class="row">
                {#if n.en}
                  <button class="play" onclick={() => hear(n)} aria-label="「{n.en}」を聞く">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                  </button>
                {:else}
                  <span class="play ask" aria-hidden="true">?</span>
                {/if}
                <button class="row-main" onclick={() => (writing = n)}>
                  <span class="text">
                    {#if n.en}
                      <span class="note-en" lang="en">{n.en}</span>
                    {:else}
                      <span class="ask-label">英語で何て言う？</span>
                    {/if}
                    {#if n.ja}<span class="note-ja">{n.ja}</span>{/if}
                    {#if n.en && !heartPath(n.en)}<span class="voice">iPhoneの声</span>{/if}
                  </span>
                  <span class="go" aria-hidden="true">›</span>
                </button>
              </div>
              {#if voiceProblem?.id === n.id}<p class="problem" role="status">{voiceProblem.text}</p>{/if}
            </li>
          {/each}
        </ul>
        {#if notes.length}
          <button class="btn soft" onclick={sendNotes}>メモを送る</button>
          <div bind:this={sentEl}>
            {#if sent}<p class="later">{sent}</p>{/if}
            {#if sentText}<textarea class="text-out" readonly rows="6" value={sentText}></textarea>{/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="shelf">
        <p class="count">習ったフレーズ <b>{count}</b> / {EXCHANGES.length}</p>
        {#each sections as s (s.shelf.id)}
          <section>
            <h3>{s.shelf.title}</h3>
            <ul class="list">
              {#each s.items as e (e.id)}
                <li class="row">
                  <button
                    class="play"
                    onclick={() => play(audioPath(main(e).en), e.kind === 'say' ? 'model' : 'other')}
                    aria-label="「{main(e).en}」を聞く"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                  </button>
                  <button class="row-main" onclick={() => (open = e)}>
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
        {#if count < EXCHANGES.length}
          <p class="later">まだ習っていないフレーズ：あと{EXCHANGES.length - count}個</p>
        {/if}
      </div>
    {/if}
  {/snippet}
</StepLayout>

{#if open}<PhraseSheet ex={open} onClose={() => (open = null)} />{/if}
{#if writing}<NoteSheet note={writing === 'new' ? null : writing} onClose={() => (writing = null)} />{/if}

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
  .row {
    display: flex;
    align-items: stretch;
    gap: 8px;
  }
  .play {
    flex: none;
    width: 48px;
    border-radius: 16px;
    border: 2px solid var(--ink);
    background: var(--sky);
    display: grid;
    place-items: center;
    padding: 0;
  }
  .play svg {
    width: 20px;
    height: 20px;
    fill: var(--ink);
    margin-left: 2px;
  }
  .row-main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 58px;
    padding: 6px 10px 6px 12px;
    border: 2px solid var(--ink);
    border-radius: 16px;
    background: var(--white);
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
    font-size: 13px;
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
    background: var(--blush);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.5;
  }
  .shelves {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 3px solid var(--ink);
    border-radius: 14px;
    overflow: hidden;
  }
  .shelves button {
    min-height: 42px;
    border: none;
    background: var(--white);
    font-weight: 900;
    font-size: 15px;
  }
  .shelves button + button {
    border-left: 2px solid var(--ink);
  }
  .shelves button.on {
    background: var(--sun);
  }
  .play.ask {
    background: var(--paper-2);
    font-size: 22px;
    font-weight: 900;
  }
  .note-en {
    font-family: var(--font-en);
    font-weight: 800;
    font-size: 17px;
    overflow-wrap: anywhere;
  }
  .ask-label {
    font-weight: 900;
    font-size: 14px;
    color: var(--ink-2);
  }
  .note-ja {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .voice {
    justify-self: start;
    margin-top: 2px;
    padding: 0 6px;
    border-radius: 6px;
    background: var(--paper-2);
    font-size: 11px;
    font-weight: 800;
    color: var(--ink-2);
  }
  .text-out {
    width: 100%;
    font: inherit;
    font-size: 16px;
    padding: 8px 10px;
    border: 2px solid var(--ink-3);
    border-radius: 12px;
    background: var(--paper);
    color: var(--ink);
    resize: none;
    -webkit-user-select: text;
    user-select: text;
  }
</style>
