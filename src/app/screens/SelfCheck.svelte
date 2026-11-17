<script lang="ts">
  import { onMount } from 'svelte';
  import { askToKeepData, unreadableCopy } from '../../learn/progress.ts';
  import {
    englishVoice,
    NO_ENGLISH_VOICE,
    play,
    setSoundMethod,
    soundDetails,
    soundInfo,
    speak,
    speechDetails,
    speechInfo,
  } from '../audio.svelte.ts';
  import { audioPath } from '../clips.ts';
  import SheetHead from '../components/SheetHead.svelte';
  import { errorLog } from '../errors.ts';
  import { deviceSummary, featureProbes, isIOS, isStandalone, screenSummary, shareText } from '../platform.ts';
  import { stage, stageInfo } from '../stage.ts';
  import { app, go, save, versionText } from '../state.svelte.ts';
  import { workerStatus } from '../updates.ts';
  import { testWakeLock, wakeInfo } from '../wakelock.svelte.ts';

  /**
   * 動作チェック (REVIEW 4.7): neither of us has an iPhone, so the app tests itself on hers and she sends the report.
   * Automatic checks run by themselves; sound needs her ears (○ / ✕), including after leaving the app and after
   * closing it completely (iOS 26.0 and 26.1 lost sound after the first run, REVIEW 4.4). Her answers are kept for a
   * day, so she can close the app, come back and carry on. The report's second half is for you: features (the iOS
   * version), screen sizes, the sound system, the stage, storage, the offline copy and recent errors.
   */
  type Status = 'wait' | 'ok' | 'ng' | 'ask' | 'info';
  interface Row {
    id: string;
    label: string;
    status: Status;
    detail: string;
    how?: string;
  }
  const ASKED = ['sound', 'silent', 'back', 'reopen', 'speech'];
  /** The iPhone's own voice reads her notes when they have no Heart clip (REVIEW section 7). */
  const SPEECH_TEST = 'Hello! This is the voice for your notes.';
  const KEY = 'eigo-friends/selfcheck';

  let rows = $state<Row[]>([
    { id: 'home', label: 'ホーム画面から開いている', status: 'wait', detail: '' },
    { id: 'sound', label: '音が聞こえる', status: 'ask', detail: '', how: '▶を押して、英語が聞こえたら ○' },
    { id: 'silent', label: '消音モードでも聞こえる', status: 'ask', detail: '', how: 'iPhoneを消音モード（マナーモード）にしてから ▶' },
    { id: 'back', label: 'ほかのアプリから戻っても聞こえる', status: 'ask', detail: '', how: 'いったんホーム画面に戻り、もう一度このアプリを開いてから ▶' },
    {
      id: 'reopen',
      label: 'アプリを閉じて開き直しても聞こえる',
      status: 'ask',
      detail: '',
      how: '画面の下から上にスワイプして途中で止め、このアプリのカードを上にはらって閉じます。もう一度開いてここに戻り ▶（ほかの答えは残ります）',
    },
    { id: 'speech', label: 'メモの声（iPhoneの声）が聞こえる', status: 'ask', detail: '', how: '▶を押して、英語が聞こえたら ○' },
    { id: 'offline', label: 'ネットなしでも使える', status: 'wait', detail: '' },
    { id: 'save', label: '記録の保存', status: 'wait', detail: '' },
    { id: 'awake', label: 'レッスン中に画面が消えない', status: 'wait', detail: '' },
    { id: 'stage', label: '3Dの表示', status: 'wait', detail: 'はかっています…' },
  ]);
  let sent = $state('');
  let reportText = $state('');
  let fps: number | null = null;
  let storageLine = '';
  let offlineLine = '';

  const set = (id: string, status: Status, detail = '') => {
    const r = rows.find((x) => x.id === id)!;
    r.status = status;
    r.detail = detail;
  };

  type Kept = Record<string, { status: Status; detail: string; at: number }>;
  const DAY_MS = 86_400_000;

  /** Her answers, each kept for a day from when she gave it. */
  function kept(): Kept {
    try {
      const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Kept;
      return Object.fromEntries(Object.entries(all).filter(([id, a]) => ASKED.includes(id) && Date.now() - a.at < DAY_MS));
    } catch {
      return {};
    }
  }

  function loadAnswers() {
    for (const [id, a] of Object.entries(kept())) set(id, a.status, a.detail);
  }

  function answer(id: string, ok: boolean, why = '') {
    const detail =
      why || (id === 'speech' ? (englishVoice()?.name ?? 'iPhoneの声') : soundInfo.method === 'backup' ? '予備の方式' : '標準の方式');
    set(id, ok ? 'ok' : 'ng', detail);
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...kept(), [id]: { status: ok ? 'ok' : 'ng', detail, at: Date.now() } }));
    } catch {
      // kept for this visit only
    }
  }

  /** The notes' voice: a phone with no English voice is marked ✕ at once, with the reason. */
  async function tryVoice() {
    if ((await speak(SPEECH_TEST)) === 'failed') {
      answer('speech', false, speechInfo.lastProblem === NO_ENGLISH_VOICE ? '英語の声がありません' : '読み上げできませんでした');
    }
  }

  function tryBackup() {
    app.progress.settings.sound = 'backup';
    save();
    setSoundMethod('backup');
    for (const id of ASKED) if (rows.find((r) => r.id === id)!.status === 'ng') set(id, 'ask');
  }

  /** A save the app could not read (kept by loadProgress): sent as it is, so it can be rescued by hand. */
  const lost = unreadableCopy();
  async function sendLost() {
    const r = await shareText('【えいごフレンズ】読めなかった記録', lost ?? '');
    sent = r === 'failed' ? '送れませんでした。' : r === 'copied' ? 'コピーしました。LINEに貼り付けて送ってください。' : '送りました。';
  }

  async function checkAwake() {
    const r = await testWakeLock();
    set(
      'awake',
      r === 'ok' ? 'ok' : r === 'refused' ? 'ng' : 'info',
      r === 'ok'
        ? ''
        : r === 'refused'
          ? '「ためす」を押してください'
          : 'このiPhoneでは使えません。自動ロックを長めにしてください（iPhoneの「設定」→「画面表示と明るさ」→「自動ロック」）',
    );
  }

  onMount(async () => {
    loadAnswers();
    set('home', isStandalone ? 'ok' : 'ng', isStandalone ? '' : 'Safariで開いています');

    try {
      const key = `${KEY}/test`;
      localStorage.setItem(key, String(Date.now()));
      const ok = !!localStorage.getItem(key);
      localStorage.removeItem(key);
      const kept = await askToKeepData();
      const est = await navigator.storage?.estimate?.().catch(() => undefined);
      storageLine = `persisted ${kept ? 'yes' : 'no'}${est ? `, used ${((est.usage ?? 0) / 1e6).toFixed(1)} of ${((est.quota ?? 0) / 1e6).toFixed(0)} MB` : ''}`;
      set('save', ok ? 'ok' : 'ng', ok ? (kept ? '保存（保護あり）' : '保存（通常）') : '保存できません');
    } catch {
      set('save', 'ng', '保存できません');
    }

    void checkAwake();

    if (import.meta.env.DEV) set('offline', 'info', '開発用の画面なのでチェックなし');
    else {
      const s = await workerStatus();
      const names = await caches.keys().catch(() => [] as string[]);
      const online = await fetch('precache.json', { cache: 'no-store' })
        .then((r) => r.json() as Promise<{ version: string }>)
        .then((j) => j.version)
        .catch(() => 'unreachable');
      offlineLine = s
        ? `${s.cached}/${s.files} files, running ${s.version}, newest online ${online}, caches ${names.join(' ')}`
        : `no service worker, caches ${names.join(' ') || 'none'}`;
      const ok = !!s && s.cached >= s.files;
      set('offline', ok ? 'ok' : 'ng', s ? (ok ? '' : `準備中（${s.cached} / ${s.files}）`) : 'まだ準備ができていません');
    }

    const measured = Math.round(await stage.measureFps(3));
    fps = measured;
    if (stageInfo.kind === 'flat') set('stage', 'info', `2Dで表示中（${measured} fps）`);
    else set('stage', measured >= 45 ? 'ok' : measured >= 25 ? 'info' : 'ng', `${measured} fps`);
  });

  const MARKS: Record<Status, string> = { ok: '○', ng: '✕', ask: '？', wait: '…', info: '・' };

  function report(): string {
    const probes = featureProbes();
    // Safari gains these one by one, so the newest one present gives the iOS version (other browsers have them all).
    const newest = probes.filter((p) => p.has).at(-1);
    const guess = !isIOS ? 'not an iPhone' : newest ? `iOS ${newest.since} or later` : 'iOS older than 16.4';
    const time = (at: number) => new Date(at).toTimeString().slice(0, 8);
    return [
      '【えいごフレンズ】動作チェック',
      `バージョン: ${versionText()}`,
      `日時: ${new Date().toLocaleString('ja-JP')}`,
      `端末: ${deviceSummary()}`,
      ...rows.map((r) => `${MARKS[r.status]} ${r.label}${r.detail ? `（${r.detail}）` : ''}`),
      '',
      '--- details ---',
      `features: ${probes.map((p) => `${p.name} ${p.has ? 'yes' : 'no'}`).join(', ')} => ${guess}`,
      `screen: ${screenSummary()}`,
      `sound: ${soundDetails()}`,
      `speech: ${speechDetails()}`,
      `stage: ${stageInfo.kind}, ${fps === null ? 'still measuring' : `${fps} fps`}${stageInfo.problem ? `, problem: ${stageInfo.problem.slice(0, 200)}` : ''}`,
      `storage: ${storageLine}${lost ? `; an unreadable save of ${lost.length} chars is kept` : ''}`,
      `offline: ${offlineLine || 'n/a'}`,
      `wake lock: ${wakeInfo.supported ? 'supported' : 'missing'}, granted ${wakeInfo.granted}${wakeInfo.lastProblem ? `, last problem: ${wakeInfo.lastProblem}` : ''}`,
      `errors: ${errorLog.length ? '' : 'none'}`,
      ...errorLog.slice(-5).map((e) => `  ${time(e.at)} ${e.text.split('\n').slice(0, 3).join(' | ').slice(0, 300)}`),
      `UA: ${navigator.userAgent}`,
    ].join('\n');
  }

  async function send() {
    reportText = '';
    const text = report();
    const r = await shareText('【えいごフレンズ】動作チェック', text);
    if (r === 'failed') {
      reportText = text;
      sent = '送れなかったときは、下の文章をすべて選んでコピーしてください。';
    } else sent = r === 'copied' ? 'コピーしました。LINEに貼り付けて送ってください。' : '送りました。ありがとうございます！';
  }
</script>

<div class="page">
  <SheetHead title="動作チェック" onClose={() => go('settings')} />
  <div class="scroll">
    {#each rows as r (r.id)}
      <div class="card soft row-card">
        <span class="mark {r.status}" aria-hidden="true">{MARKS[r.status]}</span>
        <div class="text">
          <strong>{r.label}</strong>
          {#if r.detail}<span class="detail">{r.detail}</span>{/if}
          {#if r.how && r.status === 'ask'}<span class="detail">{r.how}</span>{/if}
          {#if ASKED.includes(r.id)}
            <div class="ask">
              <button
                class="btn soft"
                onclick={() => (r.id === 'speech' ? tryVoice() : play(audioPath('Hi!'), 'other'))}
                aria-label="鳴らす">▶</button
              >
              <button class="btn soft good" onclick={() => answer(r.id, true)} aria-label="聞こえた">○</button>
              <button class="btn soft oops" onclick={() => answer(r.id, false)} aria-label="聞こえない">✕</button>
            </div>
            {#if r.status === 'ng' && r.id !== 'speech' && app.progress.settings.sound === 'standard'}
              <button class="btn soft" onclick={tryBackup}>「予備」の方式でためす</button>
            {/if}
          {:else if r.id === 'awake' && r.status === 'ng'}
            <button class="btn soft" onclick={checkAwake}>ためす</button>
          {/if}
        </div>
      </div>
    {/each}
    {#if lost}
      <div class="card soft row-card">
        <span class="mark ng" aria-hidden="true">✕</span>
        <div class="text">
          <strong>読めなかった記録があります</strong>
          <span class="detail">保存された記録が壊れていて読めませんでした。送ってもらえれば、直せるかもしれません。</span>
          <button class="btn soft" onclick={sendLost}>読めなかった記録を送る</button>
        </div>
      </div>
    {/if}
    {#if sent}<p class="note">{sent}</p>{/if}
    {#if reportText}<textarea class="text-out" readonly rows="6" value={reportText}></textarea>{/if}
  </div>
  <div class="actions">
    <button class="btn primary" onclick={send}>結果を送る</button>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
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
    padding: 8px 4px 12px;
  }
  .row-card {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px;
  }
  .mark {
    flex: none;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: var(--line) solid var(--ink);
    border-image: var(--frame-ring);
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: 18px;
    background: var(--paper-2);
  }
  .mark.ok {
    background: var(--mint);
  }
  .mark.ng {
    background: var(--alert);
  }
  .text {
    flex: 1;
    display: grid;
    gap: 6px;
  }
  .detail {
    font-size: 13px;
    color: var(--ink-2);
    font-weight: 700;
    line-height: 1.5;
  }
  .ask {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 2px;
  }
  .ask .btn {
    min-height: 44px;
    font-size: 20px;
  }
  .note {
    margin: 0;
    text-align: center;
    font-weight: 700;
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
  .actions {
    padding-top: 10px;
  }
</style>
