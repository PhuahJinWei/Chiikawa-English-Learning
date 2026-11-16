import type { UiText } from '../content/ui.ts';
import type { Progress } from './progress.ts';
import { everLearned } from './schedule.ts';

/**
 * The Japanese → English shift (PLAN.md section 3). Each of the app's own words moves through four stages as the
 * exchanges it needs are learned. Only checked answers count: the 'hear' skill (Catch), never the self-rated 'say'.
 * Stages follow the BEST box ever reached, so one missed review never switches a word back (REVIEW 2.8).
 *
 *   1  Japanese only                                  from the start
 *   2  English, reading above, small Japanese below   learned (first next-day review passed)
 *   3  English, reading above                         passed the 7-day review
 *   4  English only                                   passed the 10-day review
 */
export type ShiftStage = 1 | 2 | 3 | 4;

export function shiftStage(t: UiText, p: Progress): ShiftStage {
  if (p.settings.allJapanese) return 1;
  const lowest = Math.min(...t.needs.map((id) => p.ex[id]?.hear?.best ?? 0));
  const stage: ShiftStage = lowest >= 6 ? 4 : lowest >= 5 ? 3 : lowest >= 2 ? 2 : 1;
  return stage === 4 && p.settings.keepReadings ? 3 : stage;
}

/** Phrases learned per level of the 英語レベル meter. */
export const LEVEL_SIZE = 10;

export interface EnglishLevel {
  level: number;
  /** Phrases learned (understanding checked the next day or later). */
  learned: number;
  /** Phrases still to learn for the next level. */
  toNext: number;
  /** How far the bar is filled towards the next level, 0 to 1. */
  fill: number;
}

/**
 * The 英語レベル meter on the Today screen: one level for every ten phrases learned. The course has no end and no
 * deadline (2026-11-16), so the meter never fills up, never drops, and does not depend on how big the course is
 * (before, it was a share of a planned 108-phrase course). Only checked understanding counts, never the self-rated
 * speaking (REVIEW 2.8).
 */
export function englishLevel(p: Progress): EnglishLevel {
  const learned = Object.values(p.ex).filter((e) => everLearned(e.hear)).length;
  const into = learned % LEVEL_SIZE;
  return { level: Math.floor(learned / LEVEL_SIZE) + 1, learned, toNext: LEVEL_SIZE - into, fill: into / LEVEL_SIZE };
}
