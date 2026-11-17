<script lang="ts">
  import { dayLabel, makeBackup, readBackup } from '../../learn/backup.ts';
  import { mergeNotes } from '../../learn/notes.ts';
  import { emptyProgress, type Progress } from '../../learn/progress.ts';
  import SheetHead from '../components/SheetHead.svelte';
  import { shareText } from '../platform.ts';
  import { app, go, save } from '../state.svelte.ts';

  /**
   * The record's backup (REVIEW 1.14, 4.5): her progress lives only on this phone, inside the home-screen app.
   * She sends a backup to herself (LINE or Notes) and pastes it back after deleting the app or changing phones.
   * Starting over takes two confirmations.
   */
  let made = $state('');
  let fallbackText = $state('');
  let pasted = $state('');
  let readProblem = $state('');
  let found = $state<Progress | null>(null);
  let erase = $state<0 | 1 | 2>(0);
  let done = $state('');
  let scroller: HTMLDivElement | undefined = $state();

  /** The result is shown at the top, where she may have scrolled away from. */
  function tell(text: string) {
    done = text;
    scroller?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const phrases = (p: Progress) => Object.keys(p.ex).length;

  async function backUp() {
    made = '';
    fallbackText = '';
    const text = await makeBackup($state.snapshot(app.progress) as Progress, app.today);
    const r = await shareText('えいごフレンズの記録', text);
    if (r === 'failed') {
      // Sharing was cancelled or is not possible here: show the text so she can copy it by hand.
      fallbackText = text;
      return;
    }
    noteBackedUp();
    made = r === 'copied' ? 'コピーしました。LINEやメモに貼り付けて保存してください。' : '保存できました。';
  }

  function noteBackedUp() {
    app.progress.backedUp = app.today;
    save();
  }

  async function pasteFromClipboard() {
    try {
      pasted = await navigator.clipboard.readText();
      await check();
    } catch {
      readProblem = '貼り付けできませんでした。下の枠を長押しして「ペースト」を選んでください。';
    }
  }

  async function check() {
    found = null;
    readProblem = '';
    const r = await readBackup(pasted);
    if (r.ok) found = r.progress;
    else if (r.why === 'missing') readProblem = 'バックアップが見つかりませんでした。「えいごフレンズの記録」から最後の「~」までを、まるごと貼り付けてください。';
    else readProblem = 'バックアップが途中で切れているか、壊れています。もう一度コピーしてから貼り付けてください。';
  }

  function restore() {
    if (!found) return;
    // Her notes are never lost to an older backup: the two sets are put together.
    const notes = mergeNotes($state.snapshot(app.progress.notes) as Progress['notes'], found.notes);
    app.progress = { ...found, notes, backedUp: app.today };
    save();
    found = null;
    pasted = '';
    // Only when it was really written: a full phone leaves the old record on it.
    tell(app.saved ? '記録を戻しました！' : '保存できませんでした。iPhoneの空き容量を確かめて、もう一度ためしてください。');
  }

  function eraseAll() {
    // Starting the course again keeps her own notes and settings.
    const keep = $state.snapshot(app.progress) as Progress;
    app.progress = { ...emptyProgress(), notes: keep.notes, settings: { ...keep.settings, toured: true } };
    save();
    erase = 0;
    tell('記録をすべて消しました。');
  }
</script>

<div class="page">
  <!-- The way back is at the top, as on the other pages reached from Settings. -->
  <SheetHead title="記録のバックアップ" onClose={() => go('settings')} />
  <div class="scroll" bind:this={scroller}>
    <p class="intro">
      記録はこのiPhoneの中だけにあります。アプリを消したりiPhoneを替えたりすると消えてしまうので、ときどきバックアップをLINEやメモに保存してください。
    </p>
    {#if done}<p class="note done">{done}</p>{/if}

    <h2>バックアップする</h2>
    <section class="card soft box">
      <p class="muted">
        {app.progress.backedUp === null ? 'まだバックアップしていません。' : `前回のバックアップ：${dayLabel(app.progress.backedUp)}`}
      </p>
      <button class="btn" onclick={backUp}>バックアップを作って送る</button>
      {#if made}<p class="note">{made}</p>{/if}
      {#if fallbackText}
        <p class="note">送れなかったときは、下の文章をすべて選んでコピーしてください。</p>
        <!-- Copying it by hand counts as a backup too. -->
        <textarea class="text" readonly rows="4" value={fallbackText} oncopy={noteBackedUp}></textarea>
      {/if}
    </section>

    <h2>バックアップから戻す</h2>
    <section class="card soft box">
      <button class="btn soft" onclick={pasteFromClipboard}>コピーしたバックアップを貼り付ける</button>
      <textarea class="text" rows="3" placeholder="または、ここに貼り付けてください" bind:value={pasted} oninput={check}></textarea>
      {#if readProblem}<p class="note">{readProblem}</p>{/if}
      {#if found}
        <div class="confirm">
          <p>
            このバックアップ（{found.backedUp === null ? '日付なし' : dayLabel(found.backedUp)}・{found.days.length}日分・フレーズ{phrases(found)}個・メモ{found.notes.length}件）に置き換えますか？
            いまの記録（{app.progress.days.length}日分・フレーズ{phrases(app.progress)}個）は消えます。メモは、いまのメモと合わせて残ります。
          </p>
          <div class="row">
            <button class="btn soft" onclick={() => (found = null)}>やめる</button>
            <button class="btn soft good" onclick={restore}>置き換える</button>
          </div>
        </div>
      {/if}
    </section>

    <h2>はじめからやり直す</h2>
    <section class="card soft box">
      {#if erase === 0}
        <button class="btn soft oops" onclick={() => (erase = 1)}>記録をすべて消す</button>
      {:else if erase === 1}
        <p>本当に消しますか？</p>
        <div class="row">
          <button class="btn soft" onclick={() => (erase = 0)}>やめる</button>
          <button class="btn soft oops" onclick={() => (erase = 2)}>消す</button>
        </div>
      {:else}
        <p>もう一度確認です。{app.progress.days.length}日分の記録と、覚えたフレーズがすべて消えます。元には戻せません。メモと設定は残ります。</p>
        <div class="row">
          <button class="btn soft" onclick={() => (erase = 0)}>やめる</button>
          <button class="btn soft oops" onclick={eraseAll}>すべて消す</button>
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  h2 {
    margin: 8px 0 -4px;
    font-size: 14px;
    font-weight: 900;
    color: var(--ink-2);
  }
  .scroll {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: grid;
    gap: 12px;
    align-content: start;
    /* 4px of room at each side, so the drawn lines' outer edge (they reach 2px outside each card) is not cut off. */
    margin: 0 -4px;
    padding: 4px 4px 12px;
  }
  .intro,
  .box p {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.6;
  }
  .box {
    display: grid;
    gap: 10px;
  }
  .text {
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
  .confirm {
    display: grid;
    gap: 10px;
    padding-top: 4px;
    border-top: 2px dashed var(--paper-3);
  }
  .note {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    font-weight: 700;
    text-align: center;
  }
  .done {
    padding: 8px;
    border-radius: 12px;
    background: var(--mint);
  }
</style>
