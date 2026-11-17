import manifest from '../content/audio-manifest.json';

/**
 * Plays the English clips, one at a time.
 *
 * Two kinds of request: 'script' clips are the lesson's own sequence; 'manual' clips are ones she taps. A manual clip
 * always wins: it stops a script clip, and the script (see script.svelte.ts) waits until hers has finished, then
 * plays its own again from the start. Every request takes a number, so a request that was overtaken while its clip
 * was still loading never starts late (REVIEW 5.1).
 *
 * Two ways of playing, chosen in Settings as 「音の再生方式」 (REVIEW 4.3):
 * - 'standard': Web Audio, with exact timing. Silent mode would mute it, so the audio session is set to 'playback'
 *   where Safari supports that.
 * - 'backup': one shared <audio> element fed from blob URLs (which keep the service worker out of media requests,
 *   something Safari handles badly). Media elements are a separate part of iOS: they play in silent mode on any
 *   iOS, and they keep working when Web Audio breaks.
 *
 * Nothing waits forever (REVIEW 4.1): resuming, loading and decoding have time limits, and a watchdog checks that each
 * clip really plays (the clock moves, the clip ends in time). When sound gets stuck, a lesson pauses itself and the
 * next tap (「続ける」) rebuilds the sound system. The first tap after the app comes back from the background rebuilds
 * it too, because iOS sometimes leaves it silent then. Two failures in a row switch to the backup way for the rest
 * of the session.
 *
 * Voice rule: this voice is never a friend's voice. `channel` says which card it plays from: 'other' (the people
 * she will meet) or 'model' (the model answer). Nothing here moves a friend's mouth.
 */
export type Channel = 'other' | 'model';
export type Owner = 'script' | 'manual';
export type PlayResult = 'ended' | 'stopped' | 'failed';
export type SoundMethod = 'standard' | 'backup';

export interface NowPlaying {
  channel: Channel;
  path: string;
  owner: Owner;
  /** performance.now() when it started, and how long it lasts: for the karaoke sweep. */
  startedAt: number;
  durationMs: number;
}

export const audioState = $state<{
  playing: NowPlaying | null;
  manual: boolean;
  unlocked: boolean;
  failed: string | null;
  /** Sound stopped responding: the next tap rebuilds it. */
  stuck: boolean;
}>({ playing: null, manual: false, unlocked: false, failed: null, stuck: false });

/** What happened to sound in this session, for the self-check. */
export const soundInfo = $state({
  /** Her setting. */
  chosen: 'standard' as SoundMethod,
  /** The way in use now: the backup way after an automatic switch. */
  method: 'standard' as SoundMethod,
  ended: 0,
  troubles: 0,
  rebuilds: 0,
  lastProblem: '',
});

const RESUME_MS = 800;
const LOAD_MS = 10_000;
const DECODE_MS = 6_000;
/** By then the Web Audio clock must have moved. */
const CLOCK_CHECK_MS = 700;
/** By then the backup player must have started. */
const START_CHECK_MS = 1_500;
/** A clip must end within its length plus this. */
const GRACE_MS = 1_500;

const CLIPS = (manifest as { clips: Record<string, { ms: number }> }).clips;
/** The clip's length from the audio list (the files themselves are not trusted for it, REVIEW 4.11). */
const knownMs = (path: string): number => CLIPS[/^audio\/(.+)\.mp3$/.exec(path)?.[1] ?? '']?.ms ?? 3000;

function within<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what}: no answer in ${ms} ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

let gen = 0;
let manualGen = 0;
let manualCount = 0;
/** How many clips she has started herself so far (her taps; the lesson's own clips are not counted): a step compares
 * two counts to tell whether she tapped one in between (2026-11-18). */
export const manualPlays = (): number => manualCount;
/** The clip playing now. Stopping it settles its play() as 'stopped'. */
let current: { stop: () => void } | null = null;
const interruptions = new Set<() => void>();
/** Failures since the last clip that played to the end. */
let troubleRun = 0;
/** The app was in the background: rebuild sound on the next tap. */
let stale = false;

/** Called when sound stops by itself while the app stays on screen (a call, Siri, an alarm, headphones, or a stuck
 * clip): a lesson pauses itself instead of carrying on unheard. */
export function onInterruption(cb: () => void): () => void {
  interruptions.add(cb);
  return () => interruptions.delete(cb);
}

function trouble(problem: string): void {
  soundInfo.troubles++;
  soundInfo.lastProblem = problem;
  audioState.stuck = true;
  troubleRun++;
  if (troubleRun >= 2 && soundInfo.method === 'standard') soundInfo.method = 'backup';
  for (const cb of interruptions) cb();
}

/** Her setting. Call untracked: an automatic switch must not be undone by an effect re-running. */
export function setSoundMethod(m: SoundMethod): void {
  if (soundInfo.chosen === m && soundInfo.method === m) return;
  stop();
  soundInfo.chosen = m;
  soundInfo.method = m;
  troubleRun = 0;
}

// ── Loading (shared by both ways). Clips come from the service worker's cache, so this works offline.
const blobs = new Map<string, Promise<Blob>>();

function clipBlob(path: string): Promise<Blob> {
  let p = blobs.get(path);
  if (!p) {
    p = within(
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      }),
      LOAD_MS,
      'load',
    ).then((b) => new Blob([b], { type: 'audio/mpeg' }));
    p.catch(() => blobs.delete(path));
    blobs.set(path, p);
  }
  return p;
}

function setPlaybackSession(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
  } catch {
    // Not supported: silent mode may mute Web Audio (the backup way is not affected).
  }
}

// ── The standard way: Web Audio.
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

function context(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) throw new Error('this browser has no Web Audio');
    const c = new AC();
    c.onstatechange = () => {
      if (c === ctx && c.state !== 'running' && audioState.unlocked && soundInfo.method === 'standard') {
        for (const cb of interruptions) cb();
      }
    };
    out = c.createGain();
    out.connect(c.destination);
    ctx = c;
    setPlaybackSession();
  }
  return ctx;
}

/** The Web Audio context, or null where there is none or it will not start: the backup way then takes over. */
function tryContext(): AudioContext | null {
  try {
    return context();
  } catch (e) {
    if (soundInfo.method === 'standard') {
      soundInfo.method = 'backup';
      soundInfo.lastProblem = `no Web Audio: ${e instanceof Error ? e.message : e}`;
    }
    return null;
  }
}

/** Throws the sound system away and makes a new one. Decoded clips are kept: they work in any context. */
function rebuild(): AudioContext | null {
  const old = ctx;
  ctx = null;
  out = null;
  if (old) {
    old.onstatechange = null;
    void old.close().catch(() => {});
    soundInfo.rebuilds++;
  }
  return tryContext();
}

export const audioContext = (): AudioContext | null => ctx;

export function output(): GainNode {
  context();
  return out!;
}

async function running(c: AudioContext): Promise<boolean> {
  if (c.state === 'running') return true;
  await within(c.resume(), RESUME_MS, 'resume').catch(() => {});
  // Read again: resume() changes it (TypeScript cannot know that).
  return (c.state as AudioContextState) === 'running';
}

function decoded(path: string): Promise<AudioBuffer> {
  let p = buffers.get(path);
  if (!p) {
    p = clipBlob(path).then(async (b) => {
      const first = context();
      try {
        return await within(first.decodeAudioData(await b.arrayBuffer()), DECODE_MS, 'decode');
      } catch (e) {
        // A tap rebuilt the sound system during the decode: decode again on the new one.
        if (ctx && ctx !== first) return within(ctx.decodeAudioData(await b.arrayBuffer()), DECODE_MS, 'decode');
        throw e;
      }
    });
    p.catch(() => buffers.delete(path));
    buffers.set(path, p);
  }
  return p;
}

function playOnContext(c: AudioContext, buffer: AudioBuffer, begin: (ms: number) => void): Promise<PlayResult> {
  return new Promise<PlayResult>((resolve) => {
    const node = c.createBufferSource();
    node.buffer = buffer;
    node.connect(output());
    const timers: ReturnType<typeof setTimeout>[] = [];
    let settled = false;
    const finish = (r: PlayResult) => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      node.onended = null;
      if (current === me) current = null;
      resolve(r);
    };
    const halt = () => {
      try {
        node.stop();
      } catch {
        // never started, or already stopped
      }
      finish('stopped');
    };
    const stall = (problem: string) => {
      halt();
      trouble(problem);
    };
    const me = { stop: halt };
    current = me;
    node.onended = () => finish('ended');
    const t0 = c.currentTime;
    const ms = buffer.duration * 1000;
    node.start();
    begin(ms);
    timers.push(setTimeout(() => !settled && c.currentTime - t0 < 0.2 && stall(`clock stopped (${c.state})`), CLOCK_CHECK_MS));
    timers.push(setTimeout(() => !settled && stall('clip did not end'), ms + GRACE_MS));
  });
}

// ── The backup way: one shared <audio> element. One element, because iOS lets an element play by itself only after
// it has played inside a tap once.
let el: HTMLAudioElement | null = null;
let elReady = false;
let silentUrl: string | null = null;
const urls = new Map<string, Promise<string>>();

function element(): HTMLAudioElement {
  el ??= new Audio();
  el.preload = 'auto';
  return el;
}

function clipUrl(path: string): Promise<string> {
  let p = urls.get(path);
  if (!p) {
    p = clipBlob(path).then((b) => URL.createObjectURL(b));
    p.catch(() => urls.delete(path));
    urls.set(path, p);
  }
  return p;
}

/** 50 ms of silence as a WAV file, for unlocking the element inside a tap. */
function silence(): string {
  const n = 400;
  const v = new DataView(new ArrayBuffer(44 + n));
  const text = (at: number, s: string) => [...s].forEach((ch, i) => v.setUint8(at + i, ch.charCodeAt(0)));
  text(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  text(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, 8000, true);
  v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  text(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); // silence in 8-bit PCM
  return URL.createObjectURL(new Blob([v.buffer], { type: 'audio/wav' }));
}

function unlockElement(fresh: boolean): void {
  if (current) return; // never cut a clip she is hearing
  if (fresh && el) {
    el.pause();
    el = null;
    elReady = false;
  }
  if (elReady) return;
  const a = element();
  a.src = silentUrl ??= silence();
  a.play().then(
    () => a === el && (elReady = true),
    () => {},
  );
}

function playOnElement(url: string, known: number, begin: (ms: number) => void): Promise<PlayResult> {
  const a = element();
  return new Promise<PlayResult>((resolve) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let settled = false;
    const finish = (r: PlayResult) => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      a.onended = null;
      a.onerror = null;
      if (current === me) current = null;
      resolve(r);
    };
    const halt = () => {
      a.pause();
      finish('stopped');
    };
    const stall = (problem: string) => {
      halt();
      trouble(problem);
    };
    const me = { stop: halt };
    current = me;
    a.onended = () => finish('ended');
    a.onerror = () => {
      soundInfo.lastProblem = `backup: media error ${a.error?.code ?? '?'}`;
      finish('failed');
    };
    a.src = url;
    begin(known);
    a.play().then(
      () => {
        if (a === el) elReady = true;
        if (!settled) begin(Number.isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : known);
      },
      (e: DOMException) => {
        if (settled) return;
        if (e?.name === 'NotAllowedError') stall('backup: not allowed to play');
        else if (e?.name === 'AbortError') finish('stopped');
        else {
          soundInfo.lastProblem = `backup: ${e?.name ?? e}`;
          finish('failed');
        }
      },
    );
    timers.push(setTimeout(() => !settled && a.currentTime < 0.05 && stall('backup: did not start'), START_CHECK_MS));
    timers.push(setTimeout(() => !settled && stall('backup: did not end'), known + GRACE_MS + START_CHECK_MS));
  });
}

/** Plays one clip. Never rejects, never hangs: resolves 'ended', 'stopped' (cut by another clip, a pause, leaving, or
 * stuck sound, which pauses a lesson) or 'failed' (could not load; noted in audioState.failed). */
export async function play(path: string, channel: Channel, owner: Owner = 'manual'): Promise<PlayResult> {
  const my = ++gen;
  current?.stop();
  current = null;
  // What was playing has stopped, even if this request never gets to start.
  audioState.playing = null;
  if (owner === 'manual') {
    manualCount++;
    manualGen = my;
    audioState.manual = true;
  }
  const settle = (r: PlayResult): PlayResult => {
    if (owner === 'manual' && manualGen === my) {
      manualGen = 0;
      audioState.manual = false;
    }
    if (r === 'ended') {
      troubleRun = 0;
      soundInfo.ended++;
    }
    if (audioState.playing?.path === path && my === gen) audioState.playing = null;
    return r;
  };
  const begin = (durationMs: number) => {
    if (my === gen) audioState.playing = { channel, path, owner, startedAt: performance.now(), durationMs };
  };
  try {
    const c = soundInfo.method === 'standard' ? tryContext() : null;
    if (c) {
      const ok = await running(c);
      if (my !== gen) return settle('stopped');
      if (!ok) {
        trouble(`resume failed (${c.state})`);
        return settle('stopped');
      }
      const buffer = await decoded(path);
      if (my !== gen) return settle('stopped');
      return settle(await playOnContext(context(), buffer, begin));
    }
    // The backup way: chosen, switched to after trouble, or the only one this browser has.
    const url = await clipUrl(path);
    if (my !== gen) return settle('stopped');
    return settle(await playOnElement(url, knownMs(path), begin));
  } catch (e) {
    // Stopped or overtaken while it loaded: that is not a broken clip (the lesson replays it on 「続ける」).
    if (my !== gen) return settle('stopped');
    audioState.failed = `${path}: ${e instanceof Error ? e.message : e}`;
    soundInfo.lastProblem = audioState.failed;
    return settle('failed');
  }
}

// ── Her notes: free text has no Heart clip, so the phone's own English voice reads it (REVIEW section 7). Like a
// clip it is one sound at a time, never a friend's voice, at natural speed, and it never hangs.

/** What happened to the phone's voice in this session, for the self-check. */
export const speechInfo = $state({ spoken: 0, lastProblem: '' });

const SPEECH_GRACE_MS = 4000;
/** A better voice can take a while to start the first time: this long to start, then its length plus the grace. */
const SPEECH_START_MS = 8000;
export const NO_ENGLISH_VOICE = 'no English voice on this phone';
/** Joke and character voices that phones list among the English ones. */
const NOVELTY =
  /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Eddy|Flo|Fred|Good News|Grandma|Grandpa|Hysterical|Jester|Junior|Kathy|Organ|Ralph|Reed|Rocko|Sandy|Shelley|Superstar|Trinoids|Whisper|Wobble|Zarvox/i;

function synth(): SpeechSynthesis | null {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined' ? speechSynthesis : null;
}

/** The phone's best plain English voice: American first, then one on the phone itself, then a good one. */
export function englishVoice(voices: readonly SpeechSynthesisVoice[] = synth()?.getVoices() ?? []): SpeechSynthesisVoice | null {
  const score = (v: SpeechSynthesisVoice) =>
    (/^en[-_]US/i.test(v.lang) ? 4 : 0) + (v.localService ? 2 : 0) + (/Samantha|Enhanced|Premium/i.test(v.name) ? 1 : 0);
  return [...voices].filter((v) => /^en[-_]/i.test(v.lang) && !NOVELTY.test(v.name)).sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** Reads English aloud in the phone's own voice. Resolves like play(): 'ended', 'stopped' or 'failed'. */
export function speak(text: string, channel: Channel = 'model'): Promise<PlayResult> {
  const my = ++gen;
  current?.stop();
  current = null;
  audioState.playing = null;
  manualCount++;
  manualGen = my;
  audioState.manual = true;
  const key = `speech:${text}`;
  const settle = (r: PlayResult): PlayResult => {
    if (manualGen === my) {
      manualGen = 0;
      audioState.manual = false;
    }
    if (r === 'ended') speechInfo.spoken++;
    if (audioState.playing?.path === key && my === gen) audioState.playing = null;
    return r;
  };
  const s = synth();
  if (!s || !text.trim()) {
    speechInfo.lastProblem = s ? 'nothing to read' : 'this browser cannot read text aloud';
    return Promise.resolve(settle('failed'));
  }
  // A phone whose voices are all Japanese would read the English as katakana: worse than nothing. (An empty list
  // only means the voices are still loading: the phone then picks its own English voice for 'en-US'.)
  const voices = s.getVoices();
  const voice = englishVoice(voices);
  if (voices.length && !voice) {
    speechInfo.lastProblem = NO_ENGLISH_VOICE;
    return Promise.resolve(settle('failed'));
  }
  return new Promise<PlayResult>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = 1; // natural speed, like every clip (the user, 2026-11-16)
    const ms = 1200 + text.length * 85;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const finish = (r: PlayResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      u.onend = null;
      u.onstart = null;
      u.onerror = null;
      if (current === me) current = null;
      resolve(settle(r));
    };
    // The result is settled before cancelling: cancel() fires a "canceled" error of its own, at once.
    const me = {
      stop: () => {
        finish('stopped');
        s.cancel();
      },
    };
    current = me;
    u.onend = () => finish('ended');
    // The time limit counts from when it starts speaking, not from when it was asked to.
    u.onstart = () => {
      clearTimeout(timer);
      timer = setTimeout(giveUp, ms + SPEECH_GRACE_MS);
    };
    u.onerror = (e) => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') speechInfo.lastProblem = `speech: ${e.error}`;
      finish(e.error === 'canceled' || e.error === 'interrupted' ? 'stopped' : 'failed');
    };
    // Spoken inside her tap (no waiting first): iOS only lets a page start speaking from a tap. After the app was in
    // the background, iOS can leave speech paused: every later request would wait for ever.
    if (s.speaking || s.pending) s.cancel();
    if (s.paused) s.resume();
    s.speak(u);
    audioState.playing = { channel, path: key, owner: 'manual', startedAt: performance.now(), durationMs: ms };
    const giveUp = () => {
      speechInfo.lastProblem = 'speech did not end';
      finish('failed');
      s.cancel();
    };
    timer = setTimeout(giveUp, Math.max(SPEECH_START_MS, ms + SPEECH_GRACE_MS));
  });
}

/** One line for the self-check report. */
export function speechDetails(): string {
  const s = synth();
  if (!s) return 'not available';
  const voices = s.getVoices();
  const v = englishVoice(voices);
  const english = voices.filter((x) => /^en[-_]/i.test(x.lang)).length;
  return [
    `${english} English voices of ${voices.length}`,
    `using ${v ? `${v.name} (${v.lang}${v.localService ? ', on the phone' : ''})` : 'the default'}`,
    `spoken ${speechInfo.spoken}`,
    speechInfo.lastProblem && `last problem: ${speechInfo.lastProblem}`,
  ]
    .filter(Boolean)
    .join('; ');
}

/** Stops whatever is playing or about to play. */
export function stop(): void {
  gen++;
  const c = current;
  current = null;
  c?.stop();
  audioState.playing = null;
  manualGen = 0;
  audioState.manual = false;
}

/** Runs inside every tap (the listeners below). Safe to call many times. */
export function unlock(): void {
  setPlaybackSession();
  const fix = (stale || audioState.stuck) && !current;
  if (fix) {
    stale = false;
    audioState.stuck = false;
  }
  // Web Audio first: finding none switches to the backup way, which then needs its own unlock.
  const c = fix && ctx ? rebuild() : tryContext();
  if (soundInfo.method === 'backup') unlockElement(fix);
  if (c) {
    if (c.state !== 'running') void c.resume().catch(() => {});
    // A tiny silent buffer, played inside the tap, is what finally wakes audio on older iPhones.
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    } catch {
      // closed meanwhile
    }
  }
  audioState.unlocked = true;
}

/** One line for the self-check report. */
export function soundDetails(): string {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  return [
    `way ${soundInfo.method}${soundInfo.method === soundInfo.chosen ? '' : ` (chosen ${soundInfo.chosen}, switched)`}`,
    `webaudio ${ctx ? `${ctx.state} ${ctx.sampleRate} Hz` : 'not made'}`,
    `audioSession ${session ? session.type : 'none'}`,
    `ended ${soundInfo.ended}, troubles ${soundInfo.troubles}, rebuilds ${soundInfo.rebuilds}`,
    soundInfo.lastProblem && `last problem: ${soundInfo.lastProblem}`,
  ]
    .filter(Boolean)
    .join('; ');
}

if (typeof window !== 'undefined') {
  // iOS counts touchend (not pointerdown) as the tap that may start sound; pointerdown covers a mouse.
  const wake = () => unlock();
  window.addEventListener('pointerdown', wake, { capture: true });
  window.addEventListener('touchend', wake, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      stale = true;
    } else if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
  });
  // Browsers load their list of voices only when first asked, and an empty list at the moment she taps ▶ on a note
  // would hide a phone that has no English voice. Asking at start-up has it ready long before.
  const s = synth();
  s?.getVoices();
  s?.addEventListener?.('voiceschanged', () => s.getVoices());
}
