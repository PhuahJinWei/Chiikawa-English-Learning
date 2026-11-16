import type { Step } from '../learn/session.ts';
import { loadProgress, saveProgress, type Progress } from '../learn/progress.ts';
import { dayNumber } from '../learn/schedule.ts';

/** The four places in the menu bar, and the pages and lesson reached from them. */
export type Tab = 'today' | 'notebook' | 'practice' | 'settings';
export type Screen = Tab | 'lesson' | 'selfcheck' | 'install' | 'backup';

export interface LessonConfig {
  /** 'daily' is today's lesson (saved, resumable, moves the schedule); 'practice' never moves the schedule. */
  mode: 'daily' | 'practice';
  steps: Step[];
  title: string;
  /** Where ✕ and the end of the lesson go back to. */
  returnTo: Tab;
}

export const app = $state({
  progress: loadProgress() as Progress,
  screen: 'today' as Screen,
  lesson: { mode: 'daily', steps: [], title: '', returnTo: 'today' } as LessonConfig,
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
});

/** The version as shown to her and in reports: '0.1.0' plus the build, when known. */
export const versionText = (): string => `${__APP_VERSION__}${app.build ? ` (${app.build.slice(0, 7)})` : ''}`;

export function save(): void {
  app.saved = saveProgress($state.snapshot(app.progress) as Progress);
}

export function go(screen: Screen): void {
  app.screen = screen;
}

export function startDaily(): void {
  // The app may have stayed open past 4 a.m.: plan for the real today.
  app.today = dayNumber();
  app.lesson = { mode: 'daily', steps: [], title: '今日のレッスン', returnTo: 'today' };
  app.screen = 'lesson';
}

export function startPractice(steps: Step[], title: string, returnTo: Tab): void {
  if (!steps.length) return;
  app.lesson = { mode: 'practice', steps, title, returnTo };
  app.screen = 'lesson';
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) app.today = dayNumber();
  });
}
