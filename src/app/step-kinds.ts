import type { Step } from '../learn/session.ts';

/**
 * The three kinds of lesson step, named and drawn the same way wherever they appear: the lesson's top bar and the
 * first-run tour. Naming the step is what tells her what to do now (the Focus design, 2026-11-16).
 */
export const STEP_NAMES: Record<Step['kind'], string> = {
  meet: '新しいフレーズ',
  catch: '聞き取りクイズ',
  answer: '答えてみよう',
};

/** What she does in each, for the tour. */
export const STEP_HINTS: Record<Step['kind'], string> = {
  meet: '聞いて意味を知り、声に出してまねする',
  catch: '聞いて、意味や答えを選ぶ',
  answer: '聞かれたら、声に出して答える',
};

/** Icon strokes (24 × 24, drawn as lines). */
export const STEP_ICONS: Record<Step['kind'], string[]> = {
  // A sparkle: something new.
  meet: ['M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z', 'M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  // An ear: listen and choose.
  catch: ['M7 10a5 5 0 0 1 10 0c0 3-2.5 3.6-3 6a3 3 0 0 1-5.6 1.4', 'M10 10a2 2 0 0 1 4 0'],
  // A speech bubble: say it out loud.
  answer: ['M4.5 12c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5-3.4 7.5-7.5 7.5H4.5l2-2.4A7.4 7.4 0 0 1 4.5 12z', 'M9 12h.01M12 12h.01M15 12h.01'],
};
