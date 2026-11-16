import type { Exchange } from '../content/types.ts';
import type { Progress, SavedSession } from './progress.ts';
import { isDue, known, learned, reviewed, type Grade } from './schedule.ts';

/**
 * One step of a lesson. A new exchange goes Meet → Catch → Answer (an 'understand' exchange only Meet → Catch);
 * Meet also introduces the reply, which she repeats out loud in her own time (there is no timed repeat-after-me step
 * since 2026-11-17). A review or practice item is one Catch (understanding) or Answer (saying the reply).
 * `review` steps move the schedule; practice steps never do. A Catch asks either what the line means, or (for an
 * exchange with a reply) which reply fits.
 */
export type Step =
  | { kind: 'meet'; exId: string }
  | { kind: 'catch'; exId: string; review: boolean; ask?: 'meaning' | 'reply' }
  | { kind: 'answer'; exId: string; review: boolean };

export interface Plan {
  steps: Step[];
  reviews: number;
  fresh: number;
  practice: number;
}

/** Seconds per step for her: each step's own script (from the clip lengths) plus her listening, thinking and
 * speaking. Calibrated in the second review (Meet then grew by the reply's introduction); the minutes on the Today
 * screen come from these. */
export const STEP_SECONDS: Record<Step['kind'], number> = { meet: 40, catch: 12, answer: 16 };

/** Every kind of step there is: a saved lesson can hold kinds that no longer exist (progress.ts drops them). */
export const STEP_KINDS: readonly Step['kind'][] = ['meet', 'catch', 'answer'];
/** A daily lesson aims at about ten minutes (PLAN.md section 4), topped up with practice (REVIEW 2.1). */
export const TARGET_SECONDS = 9 * 60;
export const MAX_REVIEWS = 30;
export const MAX_PRACTICE = 40;

export const estimateSeconds = (steps: readonly Step[]) => steps.reduce((t, s) => t + STEP_SECONDS[s.kind], 0);
export const estimateMinutes = (steps: readonly Step[]) => Math.max(1, Math.round(estimateSeconds(steps) / 60));


/** Exchanges first met on this day: the new-phrase limit is per day, however often the lesson restarts. */
export const metOn = (p: Progress, day: number) => Object.values(p.ex).filter((e) => e.met === day).length;

export function newAllowance(p: Progress, today: number, reviews: number): number {
  const left = Math.max(0, p.settings.newPerDay - metOn(p, today));
  if (reviews >= 24) return 0;
  if (reviews >= 14) return Math.min(left, 1);
  return left;
}

export const unmet = (p: Progress, ordered: readonly Exchange[]) => ordered.filter((e) => !p.ex[e.id]);

/** New exchanges, interleaved so each is checked a little after it was taught rather than at once (REVIEW 2.4):
 * every Meet first, then the Catches, then the Answers. */
export function stepsForNew(es: readonly Exchange[]): Step[] {
  const teach: Step[] = [];
  const check: Step[] = [];
  const say: Step[] = [];
  for (const e of es) {
    teach.push({ kind: 'meet', exId: e.id });
    check.push({ kind: 'catch', exId: e.id, review: false });
    if (e.kind !== 'understand') say.push({ kind: 'answer', exId: e.id, review: false });
  }
  return [...teach, ...check, ...say];
}

const catchAsk = (e: Exchange, n: number): 'meaning' | 'reply' => (e.kind === 'reply' && n % 2 === 1 ? 'reply' : 'meaning');

function reviewSteps(p: Progress, ordered: readonly Exchange[], today: number): Step[] {
  const due: { step: Step; due: number }[] = [];
  for (const e of ordered) {
    const ep = p.ex[e.id];
    if (!ep) continue;
    if (ep.hear && isDue(ep.hear, today)) {
      due.push({ step: { kind: 'catch', exId: e.id, review: true, ask: catchAsk(e, ep.hear.reviews) }, due: ep.hear.due });
    }
    if (e.kind !== 'understand' && ep.say && isDue(ep.say, today)) {
      due.push({ step: { kind: 'answer', exId: e.id, review: true }, due: ep.say.due });
    }
  }
  due.sort((a, b) => a.due - b.due || (a.step.kind === 'catch' ? -1 : 1));
  return due.slice(0, MAX_REVIEWS).map((d) => d.step);
}

/** Learned exchanges, weakest first (lowest boxes, most misses), then least recently practised. */
export function byWeakness(p: Progress, ordered: readonly Exchange[]): Exchange[] {
  const ep = (e: Exchange) => p.ex[e.id];
  const score = (e: Exchange) =>
    (ep(e).hear?.box ?? 0) + (e.kind === 'understand' ? (ep(e).hear?.box ?? 0) : (ep(e).say?.box ?? 0));
  const misses = (e: Exchange) => (ep(e).hear?.misses ?? 0) + (ep(e).say?.misses ?? 0);
  return ordered
    .filter((e) => ep(e)?.hear)
    .sort((a, b) => score(a) - score(b) || misses(b) - misses(a) || (p.practiced[a.id] ?? 0) - (p.practiced[b.id] ?? 0));
}

/** A practice step for an exchange: alternately saying and understanding (`flip` gives the other one). */
const practiceStep = (e: Exchange, n: number, flip = false): Step =>
  e.kind === 'understand' || (n % 2 === 1) !== flip
    ? { kind: 'catch', exId: e.id, review: false, ask: catchAsk(e, n >> 1) }
    : { kind: 'answer', exId: e.id, review: false };

/** Today's lesson: due reviews (oldest first), anything left part-way, new exchanges, then practice (today's new
 * phrases first, then the weakest learned ones) until it is about ten minutes long. */
export function buildSession(p: Progress, ordered: readonly Exchange[], today: number): Plan {
  const reviews = reviewSteps(p, ordered, today);
  // Left part-way: understood but never answered (the Answer shows the reply once she has tried), or (after a
  // skipped Catch) answered but never checked.
  const unfinished: Step[] = ordered.flatMap((e): Step[] => {
    const ep = p.ex[e.id];
    if (!ep) return [];
    if (!ep.hear) return [{ kind: 'catch', exId: e.id, review: false }];
    if (e.kind !== 'understand' && !ep.say) return [{ kind: 'answer', exId: e.id, review: false }];
    return [];
  });
  const fresh = unmet(p, ordered).slice(0, newAllowance(p, today, reviews.length));
  const steps = [...reviews, ...unfinished, ...stepsForNew(fresh)];
  const inLesson = new Set(steps.map((s) => s.exId));
  const pool = [...fresh, ...byWeakness(p, ordered).filter((e) => !inLesson.has(e.id))];
  // Up to three passes over the pool, alternating saying and understanding, until about ten minutes.
  let practice = 0;
  fill: for (const flip of [false, true, false]) {
    for (const [i, e] of pool.entries()) {
      if (estimateSeconds(steps) >= TARGET_SECONDS || practice >= MAX_PRACTICE) break fill;
      if (flip && e.kind === 'understand') continue;
      steps.push(practiceStep(e, i, flip));
      practice++;
    }
  }
  return { steps, reviews: reviews.length, fresh: fresh.length, practice };
}

export type PracticeKind = 'weak' | 'mixed' | 'listen' | 'speak';

/** Practice she chooses herself (the 練習 tab). Never moves the schedule; rotates by least recently practised. */
export function buildPractice(p: Progress, ordered: readonly Exchange[], kind: PracticeKind, count = 8): Step[] {
  const learnedEx = ordered.filter((e) => p.ex[e.id]?.hear);
  const stale = [...learnedEx].sort((a, b) => (p.practiced[a.id] ?? 0) - (p.practiced[b.id] ?? 0));
  if (kind === 'weak') {
    const pick = byWeakness(p, ordered).slice(0, Math.ceil(count / 2));
    const catches: Step[] = pick.map((e, i) => ({ kind: 'catch', exId: e.id, review: false, ask: catchAsk(e, i) }));
    const answers: Step[] = pick.filter((e) => e.kind !== 'understand').map((e) => ({ kind: 'answer', exId: e.id, review: false }));
    return [...catches, ...answers].slice(0, count);
  }
  if (kind === 'listen') {
    return stale.slice(0, count).map((e, i): Step => ({ kind: 'catch', exId: e.id, review: false, ask: catchAsk(e, i) }));
  }
  if (kind === 'speak') {
    return stale
      .filter((e) => e.kind !== 'understand')
      .slice(0, count)
      .map((e): Step => ({ kind: 'answer', exId: e.id, review: false }));
  }
  return stale.slice(0, count).map((e, i) => practiceStep(e, i));
}

/** Records a Catch or Answer result. A first result starts the schedule; a review moves it; practice never does. */
export function recordResult(
  p: Progress,
  e: Exchange,
  skill: 'hear' | 'say',
  grade: Grade,
  review: boolean,
  today: number,
): void {
  p.started ??= today;
  const ep = (p.ex[e.id] ??= { met: today });
  const s = ep[skill];
  if (review && s) ep[skill] = reviewed(s, grade, today);
  else if (!s) ep[skill] = learned(today);
}

/**
 * A new exchange she already knows (もう知ってる on its Meet step): learned at once, but further along the schedule,
 * so its first check comes in a few days instead of tomorrow (src/learn/schedule.ts).
 */
export function recordKnown(p: Progress, e: Exchange, today: number): void {
  p.started ??= today;
  const ep = (p.ex[e.id] ??= { met: today });
  ep.hear = known(today);
  if (e.kind !== 'understand') ep.say = known(today);
}

export function recordPracticed(p: Progress, exId: string, now: number): void {
  p.practiced[exId] = now;
}

export function recordMissedLine(p: Progress, en: string): void {
  p.missedLines[en] = (p.missedLines[en] ?? 0) + 1;
}

export function recordDayDone(p: Progress, today: number): void {
  if (!p.days.includes(today)) p.days.push(today);
}

/** The saved lesson for today, if there is one to continue. A lesson from an earlier day is dropped (REVIEW 2.11). */
export function resumable(p: Progress, today: number, exists: (id: string) => boolean): SavedSession | null {
  const s = p.session;
  if (!s || s.day !== today || s.index >= s.steps.length) return null;
  return s.steps.every((st) => exists(st.exId)) ? s : null;
}

export const newSaved = (plan: Plan, today: number): SavedSession => ({
  day: today,
  steps: plan.steps,
  index: 0,
  recorded: [],
  retried: [],
  counts: { fresh: plan.fresh, reviews: plan.reviews, practice: plan.practice },
});
