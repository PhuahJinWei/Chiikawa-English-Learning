/**
 * The review schedule (PLAN.md section 4): each skill of each exchange moves through boxes reviewed after 1, 2, 4,
 * 7, 10, 20 and then every 40 days; a miss goes back to box 1. Until 2026-11-16 the gaps stopped at 10 days and
 * shrank before the trip (REVIEW 2.9). With no deadline any more, phrases she keeps getting right come back less
 * often, so the daily review stays short however big the course grows. Boxes 1 to 6 are unchanged, so the app's
 * own words switch to English at the same points (src/learn/shift.ts).
 *
 * Understanding ('hear', checked in Catch) and saying ('say', self-rated in Answer) are tracked separately.
 */

/** Days until the next review while in each box. Box 1 = just learned. */
export const INTERVAL_DAYS = [0, 1, 2, 4, 7, 10, 20, 40] as const;
export const TOP_BOX = 7;

/** How a review went. 'hard' = right but slow (stays in its box); 'again' = missed (back to box 1). */
export type Grade = 'good' | 'hard' | 'again';

export interface SkillState {
  box: number;
  /** The highest box ever reached: the app's English never switches back to Japanese after one miss (REVIEW 2.8). */
  best: number;
  /** Day number when it is next due (see dayNumber). */
  due: number;
  /** Day number of the last review or of learning. */
  last: number;
  reviews: number;
  misses: number;
}

/** A day number: days since 1970 in local time, with the day changing at 4 a.m. so late-night practice counts
 * for the evening it started in. */
export function dayNumber(at: Date = new Date()): number {
  const shifted = new Date(at.getTime() - 4 * 3600 * 1000);
  return Math.round(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()) / 86400000);
}

const gap = (box: number) => Math.max(1, INTERVAL_DAYS[Math.min(Math.max(box, 1), TOP_BOX)]);

/** The state right after she learns something new. */
export function learned(today: number): SkillState {
  return { box: 1, best: 1, due: today + gap(1), last: today, reviews: 0, misses: 0 };
}

/** Where a new phrase starts when she says she already knows it (もう知ってる): box 3, first checked in 4 days. */
export const KNOWN_BOX = 3;

/** The state of a new phrase she already knew. A miss at its first check sends it back to box 1, learned as usual. */
export function known(today: number): SkillState {
  return { box: KNOWN_BOX, best: KNOWN_BOX, due: today + gap(KNOWN_BOX), last: today, reviews: 0, misses: 0 };
}

export function isDue(s: SkillState | undefined, today: number): boolean {
  return !!s && s.due <= today;
}

/** The state after a review. */
export function reviewed(s: SkillState, grade: Grade, today: number): SkillState {
  const box = grade === 'good' ? Math.min(s.box + 1, TOP_BOX) : grade === 'hard' ? s.box : 1;
  return {
    box,
    best: Math.max(s.best ?? s.box, box),
    due: today + gap(box),
    last: today,
    reviews: s.reviews + 1,
    misses: s.misses + (grade === 'again' ? 1 : 0),
  };
}

/** Passed its first next-day review at some point (the best box, so one later miss does not undo it). */
export const everLearned = (s: SkillState | undefined) => (s?.best ?? s?.box ?? 0) >= 2;
/** Passed the 7-day review at some point. */
export const everMastered = (s: SkillState | undefined) => (s?.best ?? s?.box ?? 0) >= 5;
