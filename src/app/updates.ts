import { TAKE_OVER } from '../worker-message.ts';
import { noteError } from './errors.ts';
import { app } from './state.svelte.ts';

/**
 * Offline use and updates. The service worker (built by tools/build/service-worker.ts) keeps every file on the
 * phone, so the app opens without a connection; the Today screen says once that is ready (REVIEW 4.6).
 *
 * Every time the app starts it asks the server straight away whether there is a newer version (the user,
 * 2026-11-16: no stuck, outdated versions). If there is, a short 「アップデート中」 note shows while it downloads, and the
 * app switches to it before she starts anything. With no connection, or if the download is slow, she carries on with
 * the version she has. A new version switches in only on the Today screen: never in a lesson, the self-check or a
 * restore (REVIEW 4.10); if it takes over anywhere else, the page reloads the next time she is on Today. Each new
 * version is told to take over once, and the note never stays up longer than its time limit. The app also checks
 * again whenever it comes back to the front (an iPhone keeps home-screen apps open in the background, so "starting"
 * may only be returning to it).
 */
const STARTUP_WAIT_MS = 25_000;
/** If a new version has not taken over this long after being told to, the note goes away (and is not shown again). */
const SWITCH_WAIT_MS = 10_000;

export interface WorkerStatus {
  version: string;
  files: number;
  cached: number;
}

/** Asks a service worker about its offline copy. Null if it does not answer. */
export function workerStatus(worker = navigator.serviceWorker?.controller): Promise<WorkerStatus | null> {
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const t = setTimeout(() => resolve(null), 3000);
    ch.port1.onmessage = (e) => {
      clearTimeout(t);
      resolve(e.data as WorkerStatus);
    };
    try {
      worker.postMessage({ type: 'status' }, [ch.port2]);
    } catch {
      clearTimeout(t);
      resolve(null);
    }
  });
}

async function refreshOffline(): Promise<void> {
  const s = await workerStatus();
  if (!s) return;
  app.build = s.version;
  app.offline = s.cached >= s.files ? 'ready' : 'preparing';
}

/** Where a new version may switch in: her home screen. */
const safe = () => app.screen === 'today';

let reloading = false;
/** A new version took over somewhere else: reload when she is next on Today. */
let reloadWhenSafe = false;

function reload(): void {
  if (reloading) return;
  reloading = true;
  location.reload();
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;

  // The very first install takes control of the page without a reload; every later change (an update, even in the
  // same session) needs one.
  let controlled = !!sw.controller;
  app.offline = 'preparing';
  sw.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      void refreshOffline();
      return;
    }
    if (safe()) reload();
    else reloadWhenSafe = true;
  });
  if (controlled) void refreshOffline();

  // updateViaCache 'none': the browser always asks the server for sw.js itself, never an HTTP-cached copy.
  sw.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => watchUpdates(reg))
    .catch((e) => noteError(e));
}

async function watchUpdates(reg: ServiceWorkerRegistration): Promise<void> {
  const sw = navigator.serviceWorker;
  /** The waiting version already told to take over: each one is told once. */
  let told: ServiceWorker | null = null;
  let noteTimer: ReturnType<typeof setTimeout> | undefined;

  const applyIfReady = () => {
    if (reloadWhenSafe && safe()) reload();
    const waiting = reg.waiting;
    if (!waiting || waiting === told || !sw.controller || !safe()) return;
    told = waiting;
    app.updating = true;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => (app.updating = false), SWITCH_WAIT_MS);
    waiting.postMessage(TAKE_OVER);
  };

  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!sw.controller || !worker) return; // the first install: nothing to update from
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') applyIfReady();
      if (worker.state === 'redundant' && worker !== told) app.updating = false;
    });
  });

  // Later checks: whenever the app comes back to the front. A new version switches in on the Today screen.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void reg.update().catch(() => {});
  });
  setInterval(applyIfReady, 3000);

  // The check at start-up, with one time limit for every path: after it, she carries on with this version.
  if (!sw.controller) return; // first visit: this already is the newest version
  let gaveUp = false;
  const giveUp = setTimeout(() => {
    gaveUp = true;
    if (told === null) app.updating = false;
  }, STARTUP_WAIT_MS);
  if (!reg.waiting) {
    try {
      await reg.update();
    } catch {
      clearTimeout(giveUp);
      return; // offline: carry on with this version
    }
    if (!reg.installing && !reg.waiting) {
      clearTimeout(giveUp);
      return; // already the newest
    }
  }
  // Still downloading: show the note while it does, unless the time limit has already passed.
  if (!gaveUp && told === null) app.updating = safe();
  applyIfReady();
}
