/**
 * Keeps the screen on during a lesson (REVIEW 4.2): iPhone auto-lock is often 30 seconds, and a Meet step can run
 * that long without a touch. The lock is let go while the lesson is paused and when it ends. iOS drops it whenever
 * the app leaves the screen, so it is asked for again on return (and again on her next tap, if iOS wants one).
 */
interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', cb: () => void): void;
}
type WakeLockNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } };

export const wakeInfo = $state({
  supported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
  /** The screen is being kept on right now. */
  held: false,
  /** Times the lock was granted in this session (the self-check shows whether it ever worked). */
  granted: 0,
  lastProblem: '',
});

let want = false;
let sentinel: Sentinel | null = null;
let asking = false;

async function acquire(): Promise<void> {
  const api = (navigator as WakeLockNavigator).wakeLock;
  if (!want || sentinel || asking || document.hidden || !api) return;
  asking = true;
  try {
    const s = await api.request('screen');
    if (!want) {
      void s.release().catch(() => {});
      return;
    }
    sentinel = s;
    wakeInfo.held = true;
    wakeInfo.granted++;
    s.addEventListener('release', () => {
      if (sentinel !== s) return;
      sentinel = null;
      wakeInfo.held = false;
    });
  } catch (e) {
    wakeInfo.lastProblem = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  } finally {
    asking = false;
  }
}

/** For the self-check: asks once and lets go at once. */
export async function testWakeLock(): Promise<'ok' | 'refused' | 'missing'> {
  const api = (navigator as WakeLockNavigator).wakeLock;
  if (!api) return 'missing';
  try {
    const s = await api.request('screen');
    wakeInfo.granted++;
    await s.release();
    return 'ok';
  } catch (e) {
    wakeInfo.lastProblem = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return 'refused';
  }
}

export function keepAwake(on: boolean): void {
  want = on;
  if (on) {
    void acquire();
    return;
  }
  const s = sentinel;
  sentinel = null;
  wakeInfo.held = false;
  void s?.release().catch(() => {});
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => void acquire());
  // Some versions only grant it during a tap.
  window.addEventListener('pointerup', () => void acquire(), { capture: true });
}
