import type { Step } from '../learn/session.ts';
import { loadProgress, saveProgress, type Progress } from '../learn/progress.ts';
import { dayNumber } from '../learn/schedule.ts';

/** The four places in the menu bar, and the pages and lesson reached from them. */
export type Tab = 'today' | 'notebook' | 'practice' | 'settings';
export type Screen = Tab | 'lesson' | 'selfcheck' | 'install' | 'backup';

export interface LessonConfig {
  /**
   * 'daily' is today's lesson (saved, resumable, moves the schedule); 'more' is more new phrases once it is done
   * (もっと覚える), recorded and saved the same way; 'practice' never moves the schedule.
   */
  mode: 'daily' | 'more' | 'practice';
  steps: Step[];
  title: string;
  /** Where ✕ and the end of the lesson go back to. */
  returnTo: Tab;
}

export const app = $state({
  progress: loadProgress() as Progress,
  screen: 'today' as Screen,
  lesson: { mode: 'daily', steps: [], title: '', returnTo: 'today' } as LessonConfig,
  /** Counts the lessons started, so one can start from the end of another (もっと覚える) on a fresh lesson screen. */
  lessonKey: 0,
  /** Today's day number (changes at 4 a.m.). */
  today: dayNumber(),
  /** Whether the last save worked. */
  saved: true,
  /** A newer version is downloading at start-up (updates.ts). */
  updating: false,
  /** The first-run tour is open. */
  touring: false,
  /** Something went wrong after start-up that did not stop the app (main.ts): a small notice says so. */
  glitch: false,
  /** The day she said 「あとで」 to the backup reminder (it comes back the next day). */
  backupLater: -1,
  /** Whether the whole app is kept on the phone for use without a connection (updates.ts). */
  offline: 'unknown' as 'unknown' | 'preparing' | 'ready',
  /** The running build's content version, from the service worker ('' in development). */
  build: '',
  /** The end of a lesson is showing: the friends' stage grows for the celebration (App.svelte). */
  celebrating: false,
});

/** The version as shown to her and in reports: '0.1.0' plus the build, when known. */
export const versionText = (): string => `${__APP_VERSION__}${app.build ? ` (${app.build.slice(0, 7)})` : ''}`;

export function save(): void {
  app.saved = saveProgress($state.snapshot(app.progress) as Progress);
}

/**
 * Puts a whole other record in place (a restore, or starting over), written first (2026-11-18): when the phone is too
 * full to save it, the record in use and the one on the phone both stay as they were, and it says false.
 */
export function replaceProgress(next: Progress): boolean {
  if (!saveProgress(next)) return false;
  app.progress = next;
  app.saved = true;
  return true;
}

export function go(screen: Screen): void {
  app.screen = screen;
}

export function startDaily(): void {
  // The app may have stayed open past 4 a.m.: plan for the real today.
  app.today = dayNumber();
  app.lesson = { mode: 'daily', steps: [], title: '今日のレッスン', returnTo: 'today' };
  app.lessonKey++;
  app.screen = 'lesson';
}

/** The next new phrases once today's lesson is done (もっと覚える): from the Today screen, or the end of a round. */
export function startMore(): void {
  app.today = dayNumber();
  // Past 4 a.m. it is a new day: its own lesson (with its reviews) comes first, or the round would take the day's
  // stamp and its reviews could not be reached until tomorrow.
  if (!app.progress.days.includes(app.today)) {
    startDaily();
    return;
  }
  app.lesson = { mode: 'more', steps: [], title: 'もっと覚える', returnTo: 'today' };
  app.lessonKey++;
  app.screen = 'lesson';
}

export function startPractice(steps: Step[], title: string, returnTo: Tab): void {
  if (!steps.length) return;
  app.lesson = { mode: 'practice', steps, title, returnTo };
  app.lessonKey++;
  app.screen = 'lesson';
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) app.today = dayNumber();
  });
}
