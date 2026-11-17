import { stop as stopSound } from './audio.svelte.ts';

/**
 * Her own voice, to compare with the model (2026-11-17): in 答えてみよう she may record her answer, and after the
 * model has played, hear herself beside it. The phone still does not judge her speech; her own ears do.
 *
 * Only if she taps 録音する: the iPhone then asks to use the microphone. The recording lives in memory for that one
 * step and is never saved or sent anywhere. The microphone is released the moment recording stops, before the model
 * plays, because an open microphone makes an iPhone play sound quietly through the earpiece; playing a clip then puts
 * the audio session back to playback (audio.svelte.ts). Not tried on a real iPhone yet.
 */
export type RecorderState = 'idle' | 'asking' | 'recording' | 'ready' | 'denied' | 'failed';

export const recorder = $state({ state: 'idle' as RecorderState, playing: false });

/** Whether this phone can record at all (the button is not shown otherwise). */
export const canRecord = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

/** A recording stops by itself after this long: an answer is a sentence. */
const LONGEST_MS = 20_000;

let media: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let chunks: Blob[] = [];
let url = '';
let player: HTMLAudioElement | null = null;
let timer = 0;
let done: (() => void) | null = null;

type Session = { type: string };
const session = (): Session | undefined => (navigator as Navigator & { audioSession?: Session }).audioSession;

function release(): void {
  clearTimeout(timer);
  for (const t of stream?.getTracks() ?? []) t.stop();
  stream = null;
  media = null;
}

/** Starts recording (asks for the microphone the first time). */
export async function startRecording(): Promise<void> {
  if (!canRecord() || recorder.state === 'asking' || recorder.state === 'recording') return;
  forget();
  recorder.state = 'asking';
  stopSound();
  try {
    // An iPhone records only while its audio session allows it.
    const s = session();
    if (s) s.type = 'play-and-record';
  } catch {
    // Not supported: recording may still work.
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    recorder.state = 'denied';
    release();
    return;
  }
  try {
    chunks = [];
    media = new MediaRecorder(stream);
    const mine = media;
    mine.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    mine.onstop = () => {
      const type = mine.mimeType || chunks[0]?.type || 'audio/mp4';
      release();
      if (chunks.length) {
        url = URL.createObjectURL(new Blob(chunks, { type }));
        recorder.state = 'ready';
      } else recorder.state = 'failed';
      chunks = [];
      done?.();
      done = null;
    };
    mine.onerror = () => {
      release();
      recorder.state = 'failed';
      done?.();
      done = null;
    };
    mine.start();
    recorder.state = 'recording';
    timer = window.setTimeout(() => void stopRecording(), LONGEST_MS);
  } catch {
    release();
    recorder.state = 'failed';
  }
}

/** Stops recording and frees the microphone. Resolves once her recording can be played (or there is none). */
export function stopRecording(): Promise<void> {
  if (recorder.state !== 'recording' || !media) return Promise.resolve();
  return new Promise((resolve) => {
    done = resolve;
    try {
      media!.stop();
    } catch {
      release();
      recorder.state = 'failed';
      done = null;
      resolve();
    }
  });
}

/** Plays her recording (tap again to stop it). */
export function playMine(): void {
  if (recorder.state !== 'ready' || !url) return;
  if (player) {
    quiet();
    return;
  }
  stopSound();
  const a = new Audio(url);
  player = a;
  recorder.playing = true;
  const end = () => {
    if (player === a) quiet();
  };
  a.onended = end;
  a.onerror = end;
  a.play().catch(end);
}

function quiet(): void {
  player?.pause();
  player = null;
  recorder.playing = false;
}

/** Forgets the recording (the step is over, or she records again). */
export function forget(): void {
  quiet();
  if (recorder.state === 'recording') {
    try {
      media?.stop();
    } catch {
      // already stopped
    }
  }
  release();
  if (url) URL.revokeObjectURL(url);
  url = '';
  chunks = [];
  recorder.state = 'idle';
}
