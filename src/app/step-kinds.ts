import type { Step } from '../learn/session.ts';

/**
 * The kinds of lesson step, named and drawn the same way wherever they appear: the lesson's top bar and the first-run
 * tour. Naming the step is what tells her what to do now (the Focus design, 2026-11-16). Three teach and check a
 * phrase; the fourth, a short conversation, puts learned phrases together (2026-11-17).
 */
export const STEP_NAMES: Record<Step['kind'], string> = {
  meet: '新しいフレーズ',
  catch: '聞き取りクイズ',
  answer: '答えてみよう',
  talk: '会話してみよう',
};

/** What she does in each, for the tour. */
export const STEP_HINTS: Record<Step['kind'], string> = {
  meet: '聞いて意味を知り、声に出してまねする',
  catch: '聞いて、意味や答えを選ぶ',
  answer: '聞かれたら、声に出して答える',
  talk: '覚えたフレーズで、短い会話をする',
};

/** Icon strokes (24 × 24, drawn as lines). */
export const STEP_ICONS: Record<Step['kind'], string[]> = {
  // A sparkle: something new.
  meet: ['M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z', 'M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z'],
  // An ear: listen and choose.
  catch: ['M7 10a5 5 0 0 1 10 0c0 3-2.5 3.6-3 6a3 3 0 0 1-5.6 1.4', 'M10 10a2 2 0 0 1 4 0'],
  // A speech bubble: say it out loud.
  answer: ['M4.5 12c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5-3.4 7.5-7.5 7.5H4.5l2-2.4A7.4 7.4 0 0 1 4.5 12z', 'M9 12h.01M12 12h.01M15 12h.01'],
  // Two speech bubbles: a conversation.
  talk: [
    'M3 9.5C3 6.5 5.7 4 9 4s6 2.5 6 5.5S12.3 15 9 15c-.9 0-1.7-.2-2.5-.5L3.5 16l.8-2.6A5.2 5.2 0 0 1 3 9.5z',
    'M17.4 8.6c2.1.7 3.6 2.6 3.6 4.7 0 1.2-.4 2.2-1.2 3.1l.7 2.6-2.8-1.3c-.7.2-1.4.3-2.2.3-2.1 0-3.9-.9-4.9-2.3',
  ],
};
