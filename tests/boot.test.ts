// The start-up panel's もう一度読み込む (index.html), run against a fake service worker. It is what lets a broken
// release be replaced by a fixed one on her phone, and nothing else would show it failing until a release broke there.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAKE_OVER } from '../src/worker-message.ts';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
/** The panel's own script (the inline one; the app is the module after it). */
const panelScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('__bootReload'));

class Worker extends EventTarget {
  state: string;
  messages: unknown[] = [];
  constructor(state: string) {
    super();
    this.state = state;
  }
  postMessage(message: unknown) {
    this.messages.push(message);
  }
  /** Moves on to another state, as a real worker announces it. */
  becomes(state: string) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class Registration extends EventTarget {
  installing: Worker | null = null;
  waiting: Worker | null = null;
  /** What the server says when asked for a newer version: by default, there is none. */
  check: () => Promise<void> = () => Promise.resolve();
  update() {
    return this.check();
  }
  /** A newer version starts downloading. */
  found(worker: Worker) {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
  }
  /** The downloading version has finished, and waits to be told to take over. */
  downloaded() {
    const w = this.installing!;
    this.installing = null;
    this.waiting = w;
    w.becomes('installed');
  }
}

/** A phone showing the panel: the app did not start, and `registration` is what its service worker has. */
function phone(o: { registration?: Registration; noWorker?: boolean; notControlled?: boolean; stuck?: boolean } = {}) {
  const container = Object.assign(new EventTarget(), {
    controller: o.notControlled ? null : {},
    getRegistration: () => (o.stuck ? new Promise(() => {}) : Promise.resolve(o.registration ?? null)),
  });
  const reload = vi.fn();
  const window: Record<string, unknown> = { addEventListener() {} };
  runInNewContext(panelScript!, {
    window,
    navigator: { userAgent: 'test', ...(o.noWorker ? {} : { serviceWorker: container }) },
    location: { reload },
    document: { getElementById: () => null },
    setTimeout,
  });
  const button = { disabled: false, textContent: 'もう一度読み込む' };
  return {
    button,
    reload,
    window,
    tap: () => (window.__bootReload as (b: typeof button) => void)(button),
    /** The new version has taken over the page. */
    takenOver: () => container.dispatchEvent(new Event('controllerchange')),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the start-up panel: もう一度読み込む', () => {
  it('tells a version that is already waiting to take over, and reloads once it has', async () => {
    const reg = new Registration();
    reg.waiting = new Worker('installed');
    const p = phone({ registration: reg });
    p.tap();
    await vi.advanceTimersByTimeAsync(1000);
    expect(reg.waiting.messages).toEqual([TAKE_OVER]);
    expect(p.reload).not.toHaveBeenCalled();
    p.takenOver();
    expect(p.reload).toHaveBeenCalledTimes(1);
  });

  it('a version the phone was already downloading is told to take over once it has, however long that takes', async () => {
    // The phone's own check at start-up found the fix: her tap comes while it downloads (2026-11-18: it was missed,
    // and the page reloaded into the broken version after 4 seconds).
    const reg = new Registration();
    const fix = new Worker('installing');
    reg.installing = fix;
    const p = phone({ registration: reg });
    p.tap();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(p.reload).not.toHaveBeenCalled();
    reg.downloaded();
    expect(fix.messages).toEqual([TAKE_OVER]);
    p.takenOver();
    expect(p.reload).toHaveBeenCalledTimes(1);
  });

  it('a version found by her tap is told to take over once downloaded, even on a slow line', async () => {
    const reg = new Registration();
    const fix = new Worker('installing');
    reg.check = () => {
      reg.found(fix);
      return Promise.resolve();
    };
    const p = phone({ registration: reg });
    p.tap();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(p.reload).not.toHaveBeenCalled();
    reg.downloaded();
    expect(fix.messages).toEqual([TAKE_OVER]);
    p.takenOver();
    expect(p.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once when there is nothing newer, online or offline, or the download fails', async () => {
    const online = new Registration();
    const offline = new Registration();
    offline.check = () => Promise.reject(new Error('offline'));
    for (const reg of [online, offline]) {
      const p = phone({ registration: reg });
      p.tap();
      await vi.advanceTimersByTimeAsync(400);
      expect(p.reload).toHaveBeenCalledTimes(1);
    }
    const failing = new Registration();
    const broken = new Worker('installing');
    failing.check = () => {
      failing.found(broken);
      return Promise.resolve();
    };
    const p = phone({ registration: failing });
    p.tap();
    await vi.advanceTimersByTimeAsync(3000);
    expect(p.reload).not.toHaveBeenCalled();
    failing.installing = null;
    broken.becomes('redundant');
    await vi.advanceTimersByTimeAsync(400);
    expect(p.reload).toHaveBeenCalledTimes(1);
  });

  it('reloads at once with no service worker in charge', () => {
    for (const o of [{ noWorker: true }, { notControlled: true }]) {
      const p = phone(o);
      p.tap();
      expect(p.reload).toHaveBeenCalledTimes(1);
    }
  });

  it('says it is working, and never takes longer than 20 seconds', async () => {
    const p = phone({ stuck: true });
    p.tap();
    expect(p.button).toEqual({ disabled: true, textContent: '読み込み中…' });
    await vi.advanceTimersByTimeAsync(19_900);
    expect(p.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(p.reload).toHaveBeenCalledTimes(1);
  });

  it('leaves the app alone when it has started in the meantime', async () => {
    const p = phone({ stuck: true });
    p.tap();
    p.window.__booted = true;
    await vi.advanceTimersByTimeAsync(25_000);
    p.takenOver();
    expect(p.reload).not.toHaveBeenCalled();
  });
});
