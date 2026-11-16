import type { Exchange } from '../content/types.ts';
import type { Progress, SavedSession } from './progress.ts';
import type { Grade } from './schedule.ts';
import {
  recordDayDone,
  recordKnown,
  recordMissedLine,
  recordPracticed,
  recordResult,
  recordTalked,
  type Step,
} from './session.ts';

/**
 * The bookkeeping of a running lesson, kept apart from the screen so it can be tested: moving between steps,
 * recording results, retries, saving, and the day's stamp.
 *
 * Rules (REVIEW section 1, and the second review of step A):
 * - A step's result is recorded once, however often she goes back and redoes it.
 * - Practice (mode 'practice') never changes the schedule: it only notes when a phrase was practised and what she
 *   missed. Only today's lesson records results.
 * - A missed Catch or Answer gets one practice retry at the end of the lesson.
 * - The day is stamped only when the lesson reached its end AND recorded at least one answer: skipping every step
 *   earns nothing.
 */
export interface Run {
  daily: boolean;
  day: number;
  steps: Step[];
  index: number;
  recorded: number[];
  retried: string[];
  counts: SavedSession['counts'];
}

export interface StepResult {
  grade?: Grade;
  missedLine?: string;
}

export const toSaved = (r: Run): SavedSession => ({
  day: r.day,
  steps: r.steps.map((s) => ({ ...s })),
  index: r.index,
  recorded: [...r.recorded],
  retried: [...r.retried],
  counts: { ...r.counts },
});

export const fromSaved = (s: SavedSession): Run => ({
  daily: true,
  day: s.day,
  steps: s.steps.map((x) => ({ ...x })),
  index: s.index,
  recorded: [...s.recorded],
  retried: [...s.retried],
  counts: { ...s.counts },
});

export const practiceRun = (steps: Step[], day: number): Run => ({
  daily: false,
  day,
  steps: steps.map((x) => ({ ...x })),
  index: 0,
  recorded: [],
  retried: [],
  counts: { fresh: 0, reviews: 0, practice: steps.length },
});

/**
 * Records what she did on the current step: a Catch or Answer with a grade (once), or a conversation she went
 * through (it only notes when, so the next one comes round first).
 */
export function finishStep(r: Run, p: Progress, find: (id: string) => Exchange | undefined, res: StepResult, now: number): void {
  const s = r.steps[r.index];
  if (s?.kind === 'talk') {
    recordTalked(p, s.talkId, now);
    return;
  }
  const e = s && find(s.exId);
  if (!s || !e || (s.kind !== 'catch' && s.kind !== 'answer') || !res.grade || r.recorded.includes(r.index)) return;
  r.recorded.push(r.index);
  if (r.daily) recordResult(p, e, s.kind === 'catch' ? 'hear' : 'say', res.grade, s.review, r.day);
  if (res.missedLine) recordMissedLine(p, res.missedLine);
  if (!(r.daily && s.review)) recordPracticed(p, e.id, now);
  const key = `${s.kind}:${s.exId}`;
  if (res.grade === 'again' && !r.retried.includes(key)) {
    r.retried.push(key);
    r.steps.push({ ...s, review: false });
  }
}

/**
 * She already knows the new phrase on this step (もう知ってる on its Meet step, today's lesson only): it is recorded
 * as known, and today's later steps for it (its checks and its practice) are dropped. The caller then moves on.
 */
export function skipKnown(r: Run, p: Progress, e: Exchange): void {
  if (!r.daily) return;
  recordKnown(p, e, r.day);
  // A conversation stays: she knows the phrase, and the conversation is about using it.
  const keep = r.steps.map((s, i) => i <= r.index || s.kind === 'talk' || s.exId !== e.id);
  const dropped = keep.filter((k) => !k).length;
  const moved = (i: number) => keep.slice(0, i).filter(Boolean).length;
  r.recorded = r.recorded.filter((i) => keep[i]).map(moved);
  r.steps = r.steps.filter((_, i) => keep[i]);
  // Its own checks (a Catch, and an Answer unless it is only understood) were part of the new phrase; the rest
  // were practice, which the end of the lesson counts.
  const own = e.kind === 'understand' ? 1 : 2;
  r.counts.practice = Math.max(0, r.counts.practice - Math.max(0, dropped - own));
}

/** Moves by `by` steps (0 = restart this step). Returns true when the lesson has reached its end. */
export function move(r: Run, p: Progress, by: number): boolean {
  r.index = Math.max(0, Math.min(r.steps.length, r.index + by));
  if (r.index < r.steps.length) {
    if (r.daily) p.session = toSaved(r);
    return false;
  }
  if (r.daily) {
    if (r.recorded.length > 0) recordDayDone(p, r.day);
    p.session = null;
  }
  return true;
}

/** Saves her place when she leaves part-way (✕ or the pause sheet). */
export function leaveRun(r: Run, p: Progress): void {
  if (r.daily && r.index < r.steps.length) p.session = toSaved(r);
}
