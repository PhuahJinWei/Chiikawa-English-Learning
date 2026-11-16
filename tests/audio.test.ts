// Sound recovery (src/app/audio.svelte.ts, REVIEW 4.1 and 4.3), against a fake sound system that can freeze the way
// iOS does: resume() that never answers, a clock that stops, a player that refuses to start, a file that never loads.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = () => void;

class FakeContext {
  static made: FakeContext[] = [];
  state = 'suspended';
  sampleRate = 48000;
  onstatechange: Listener | null = null;
  destination = {};
  hangResume = false;
  private clock = true;
  private base = Date.now();
  private frozenAt = 0;
  constructor() {
    FakeContext.made.push(this);
  }
  get currentTime() {
    return this.clock ? (Date.now() - this.base) / 1000 : this.frozenAt;
  }
  freeze() {
    this.frozenAt = this.currentTime;
    this.clock = false;
  }
  resume() {
    if (this.hangResume) return new Promise<void>(() => {});
    if (this.state !== 'running') {
      this.state = 'running';
      this.onstatechange?.();
    }
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  createGain() {
    return { connect() {} };
  }
  createBuffer() {
    return {};
  }
  decodeAudioData() {
    return Promise.resolve({ duration: 0.5 });
  }
  createBufferSource() {
    const c = this;
    const node = {
      buffer: null as null | { duration?: number },
      onended: null as Listener | null,
      connect: () => node,
      start() {
        if (c.clock && c.state === 'running') setTimeout(() => node.onended?.(), (node.buffer?.duration ?? 0) * 1000);
      },
      stop() {},
    };
    return node;
  }
}

class FakeAudio {
  static made: FakeAudio[] = [];
  static refuse = false;
  src = '';
  preload = '';
  currentTime = 0;
  duration = NaN;
  paused = true;
  error = null;
  onended: Listener | null = null;
  onerror: Listener | null = null;
  constructor() {
    FakeAudio.made.push(this);
  }
  play() {
    if (FakeAudio.refuse) return Promise.reject(Object.assign(new Error('refused'), { name: 'NotAllowedError' }));
    this.paused = false;
    const src = this.src;
    setTimeout(() => (this.currentTime = 0.3), 300);
    setTimeout(() => this.src === src && !this.paused && this.onended?.(), 600);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const docListeners: Record<string, Listener[]> = {};
const fakeDocument = {
  hidden: false,
  addEventListener: (type: string, cb: Listener) => (docListeners[type] ??= []).push(cb),
};
let fetchHangs = false;

async function fresh() {
  vi.resetModules();
  return import('../src/app/audio.svelte.ts');
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeContext.made = [];
  FakeAudio.made = [];
  FakeAudio.refuse = false;
  fetchHangs = false;
  for (const k of Object.keys(docListeners)) delete docListeners[k];
  fakeDocument.hidden = false;
  vi.stubGlobal('window', { AudioContext: FakeContext, addEventListener() {} });
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('fetch', () =>
    fetchHangs ? new Promise(() => {}) : Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob([new Uint8Array(8)])) }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Lets fake time run, then returns the settled result. */
async function settle<T>(p: Promise<T>, ms = 15_000): Promise<T> {
  await vi.advanceTimersByTimeAsync(ms);
  return p;
}

describe('sound recovery', () => {
  it('plays a clip to the end', async () => {
    const a = await fresh();
    a.unlock();
    expect(await settle(a.play('audio/hi.mp3', 'other'))).toBe('ended');
    expect(a.soundInfo.ended).toBe(1);
  });

  it('a resume that never answers pauses the lesson instead of hanging; the next tap rebuilds sound', async () => {
    const a = await fresh();
    const paused = vi.fn();
    a.onInterruption(paused);
    a.unlock();
    const first = FakeContext.made[0];
    first.state = 'interrupted';
    first.hangResume = true;
    expect(await settle(a.play('audio/hi.mp3', 'other', 'script'), 2000)).toBe('stopped');
    expect(paused).toHaveBeenCalled();
    expect(a.audioState.stuck).toBe(true);
    a.unlock(); // her tap on 「続ける」
    expect(FakeContext.made).toHaveLength(2);
    expect(first.state).toBe('closed');
    expect(a.audioState.stuck).toBe(false);
    expect(await settle(a.play('audio/hi.mp3', 'other', 'script'))).toBe('ended');
  });

  it('a clock that stops mid-clip is caught by the watchdog', async () => {
    const a = await fresh();
    const paused = vi.fn();
    a.onInterruption(paused);
    a.unlock();
    FakeContext.made[0].freeze();
    expect(await settle(a.play('audio/hi.mp3', 'other', 'script'), 2000)).toBe('stopped');
    expect(paused).toHaveBeenCalledTimes(1);
    expect(a.soundInfo.lastProblem).toMatch(/clock/);
  });

  it('two failures in a row switch to the backup way; a clip that ends resets the count', async () => {
    const a = await fresh();
    a.unlock();
    FakeContext.made[0].freeze();
    await settle(a.play('audio/hi.mp3', 'other'), 2000);
    a.unlock(); // rebuilt and working again
    expect(await settle(a.play('audio/hi.mp3', 'other'))).toBe('ended');
    FakeContext.made.at(-1)!.freeze();
    await settle(a.play('audio/hi.mp3', 'other'), 2000);
    expect(a.soundInfo.method).toBe('standard');
    a.unlock();
    FakeContext.made.at(-1)!.freeze();
    await settle(a.play('audio/hi.mp3', 'other'), 2000);
    expect(a.soundInfo.method).toBe('backup');
    expect(a.soundInfo.chosen).toBe('standard');
    a.unlock();
    expect(await settle(a.play('audio/hi.mp3', 'other'))).toBe('ended');
    expect(FakeAudio.made.length).toBeGreaterThan(0);
  });

  it('a file that never loads fails after a time limit (and is not counted as stuck sound)', async () => {
    const a = await fresh();
    const paused = vi.fn();
    a.onInterruption(paused);
    a.unlock();
    fetchHangs = true;
    expect(await settle(a.play('audio/hi.mp3', 'other'), 12_000)).toBe('failed');
    expect(a.audioState.failed).toMatch(/audio\/hi\.mp3/);
    expect(paused).not.toHaveBeenCalled();
  });

  it('a clip stopped while it loads is "stopped", even if its loading fails later', async () => {
    const a = await fresh();
    a.unlock();
    fetchHangs = true;
    const p = a.play('audio/hi.mp3', 'other', 'script');
    await vi.advanceTimersByTimeAsync(1000);
    a.stop(); // ⏸, or the app went to the background
    expect(await settle(p, 12_000)).toBe('stopped');
    expect(a.audioState.failed).toBeNull();
  });

  it('the first tap after the app was in the background rebuilds sound', async () => {
    const a = await fresh();
    a.unlock();
    fakeDocument.hidden = true;
    for (const cb of docListeners.visibilitychange ?? []) cb();
    fakeDocument.hidden = false;
    for (const cb of docListeners.visibilitychange ?? []) cb();
    a.unlock();
    expect(FakeContext.made).toHaveLength(2);
    expect(a.soundInfo.rebuilds).toBe(1);
  });

  it('the backup way plays, and a refused start counts as stuck sound', async () => {
    const a = await fresh();
    a.setSoundMethod('backup');
    a.unlock();
    expect(await settle(a.play('audio/hi.mp3', 'other'))).toBe('ended');
    const paused = vi.fn();
    a.onInterruption(paused);
    FakeAudio.refuse = true;
    expect(await settle(a.play('audio/hi.mp3', 'other', 'script'), 2000)).toBe('stopped');
    expect(paused).toHaveBeenCalled();
  });

  it('a browser without Web Audio uses the backup way, and a tap never throws', async () => {
    vi.stubGlobal('window', { addEventListener() {} });
    const a = await fresh();
    expect(() => a.unlock()).not.toThrow();
    expect(a.soundInfo.method).toBe('backup');
    expect(await settle(a.play('audio/hi.mp3', 'other'))).toBe('ended');
  });

  it('a newer request wins: an older one that was still loading never starts', async () => {
    const a = await fresh();
    a.unlock();
    const older = a.play('audio/hi.mp3', 'other', 'script');
    const newer = a.play('audio/bye-x.mp3', 'other', 'manual');
    await vi.advanceTimersByTimeAsync(3000);
    expect(await older).toBe('stopped');
    expect(await newer).toBe('ended');
    expect(a.audioState.manual).toBe(false);
  });
});

describe("the phone's own voice, for notes without a Heart clip", () => {
  class FakeUtterance {
    voice: unknown = null;
    lang = '';
    rate = 0;
    onend: Listener | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    text: string;
    constructor(text: string) {
      this.text = text;
    }
  }
  const voice = (name: string, lang: string, localService = true) => ({ name, lang, localService, default: false, voiceURI: name });
  function fakeSpeech({ hang = false } = {}) {
    const synth = {
      speaking: false,
      pending: false,
      said: [] as FakeUtterance[],
      voices: [voice('Albert', 'en-US'), voice('Daniel', 'en-GB'), voice('Kyoko', 'ja-JP'), voice('Samantha', 'en-US'), voice('Aaron', 'en-US', false)],
      speak(u: FakeUtterance) {
        this.said.push(u);
        this.speaking = true;
        if (!hang) setTimeout(() => ((this.speaking = false), u.onend?.()), 500);
      },
      cancel() {
        const u = this.said.at(-1);
        if (this.speaking) u?.onerror?.({ error: 'canceled' });
        this.speaking = false;
      },
      getVoices() {
        return this.voices;
      },
    };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    return synth;
  }

  it('reads to the end, in a plain American voice at natural speed', async () => {
    const synth = fakeSpeech();
    const a = await fresh();
    expect(await settle(a.speak('Can I have some water?'), 2000)).toBe('ended');
    expect(synth.said[0]).toMatchObject({ text: 'Can I have some water?', lang: 'en-US', rate: 1 });
    expect((synth.said[0].voice as { name: string }).name).toBe('Samantha');
    expect(a.speechInfo.spoken).toBe(1);
    expect(a.audioState.playing).toBeNull();
  });

  it('never hangs: a voice that never finishes gives up after a time limit', async () => {
    fakeSpeech({ hang: true });
    const a = await fresh();
    expect(await settle(a.speak('Hello'), 10_000)).toBe('failed');
    expect(a.speechInfo.lastProblem).toMatch(/did not end/);
  });

  it('is one sound at a time: a clip cuts it short', async () => {
    const synth = fakeSpeech({ hang: true });
    const a = await fresh();
    a.unlock();
    const reading = a.speak('Hello there');
    const clip = a.play('audio/hi.mp3', 'other');
    expect(await settle(reading, 100)).toBe('stopped');
    expect(synth.speaking).toBe(false);
    expect(await settle(clip)).toBe('ended');
  });

  it('will not read English with a Japanese voice (it would come out as katakana)', async () => {
    const synth = fakeSpeech();
    synth.voices = [voice('Kyoko', 'ja-JP'), voice('Otoya', 'ja-JP')];
    const a = await fresh();
    expect(await a.speak('Hello')).toBe('failed');
    expect(synth.said).toHaveLength(0);
    expect(a.speechInfo.lastProblem).toBe(a.NO_ENGLISH_VOICE);
  });

  it('a clip cut short by speech that fails at once leaves nothing marked as playing', async () => {
    const synth = fakeSpeech();
    synth.voices = [voice('Kyoko', 'ja-JP')];
    const a = await fresh();
    a.unlock();
    const clip = a.play('audio/hi.mp3', 'other');
    await vi.advanceTimersByTimeAsync(50);
    expect(a.audioState.playing).not.toBeNull();
    expect(await a.speak('Hello')).toBe('failed');
    expect(a.audioState.playing).toBeNull();
    expect(await settle(clip)).toBe('stopped');
  });

  it('a voice that iOS left paused (after the background) is resumed before speaking', async () => {
    const synth = Object.assign(fakeSpeech(), { paused: true, resumed: 0, resume() { this.paused = false; this.resumed++; } });
    const a = await fresh();
    expect(await settle(a.speak('Hello'), 2000)).toBe('ended');
    expect(synth.resumed).toBe(1);
  });

  it('fails cleanly where there is no voice to read with', async () => {
    const a = await fresh();
    expect(await a.speak('Hello')).toBe('failed');
    expect(a.speechInfo.lastProblem).toMatch(/cannot read/);
    expect(a.audioState.manual).toBe(false);
  });
});
