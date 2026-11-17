import type { Exchange, Talk } from '../content/types.ts';
import type { Progress, SavedSession } from './progress.ts';
import { everLearned, isDue, known, learned, reviewed, type Grade } from './schedule.ts';

/**
 * One step of a lesson. A new exchange goes Meet → Catch → Answer (an 'understand' exchange only Meet → Catch);
 * Meet also introduces the reply, which she repeats out loud in her own time (there is no timed repeat-after-me step
 * since 2026-11-17). A review or practice item is one Catch (understanding) or Answer (saying the reply).
 * `review` steps move the schedule; practice steps never do. A Catch asks either what the line means, or (for an
 * exchange with a reply) which reply fits. A Talk is a short conversation made of learned phrases
 * (src/content/talks.ts): practice that never moves the schedule.
 */
export type Step =
  | { kind: 'meet'; exId: string }
  | { kind: 'catch'; exId: string; review: boolean; ask?: 'meaning' | 'reply' }
  | { kind: 'answer'; exId: string; review: boolean }
  | { kind: 'talk'; talkId: string };

/** A step about one exchange (every kind but a conversation). */
export type ExchangeStep = Exclude<Step, { kind: 'talk' }>;
export const isExchangeStep = (s: Step): s is ExchangeStep => s.kind !== 'talk';
/** What a step is about: its exchange, or its conversation. */
export const stepTarget = (s: Step): string => (s.kind === 'talk' ? s.talkId : s.exId);

export interface Plan {
  steps: Step[];
  reviews: number;
  fresh: number;
  practice: number;
}

/** Seconds per step for her: each step's own script (from the clip lengths) plus her listening, thinking and
 * speaking. Calibrated in the second review (Meet then grew by the reply's introduction); the minutes on the Today
 * screen come from these. */
export const STEP_SECONDS: Record<Step['kind'], number> = { meet: 40, catch: 12, answer: 16, talk: 60 };

/** Every kind of step there is: a saved lesson can hold kinds that no longer exist (progress.ts drops them). */
export const STEP_KINDS: readonly Step['kind'][] = ['meet', 'catch', 'answer', 'talk'];

/**
 * A conversation is ready once she has learned every step it is made of (understood the day after meeting it, or
 * known already) and said each of her own lines at least once.
 */
export const talkReady = (p: Progress, t: Talk): boolean =>
  t.steps.every((id) => everLearned(p.ex[id]?.hear)) && t.saySteps.every((id) => !!p.ex[id]?.say);

/** Ready conversations, the one done longest ago (or never) first; in the order they are written otherwise. */
export function readyTalks(p: Progress, talks: readonly Talk[]): Talk[] {
  const done = (t: Talk) => p.talked[t.id] ?? 0;
  return talks.filter((t) => talkReady(p, t)).sort((a, b) => done(a) - done(b));
}
/** A daily lesson aims at about ten minutes (PLAN.md section 4), topped up with practice (REVIEW 2.1). */
export const TARGET_SECONDS = 9 * 60;
/** New phrases are taught while the lesson's own steps (reviews, anything left part-way, a conversation and the new
 * phrases) take at most this long. */
export const LESSON_SECONDS = 10 * 60;
export const MAX_REVIEWS = 30;
export const MAX_PRACTICE = 40;

export const estimateSeconds = (steps: readonly Step[]) => steps.reduce((t, s) => t + STEP_SECONDS[s.kind], 0);
export const estimateMinutes = (steps: readonly Step[]) => Math.max(1, Math.round(estimateSeconds(steps) / 60));


/** Exchanges first met on this day: the new-phrase limit is per day, however often the lesson restarts. */
export const metOn = (p: Progress, day: number) => Object.values(p.ex).filter((e) => e.met === day).length;

export const unmet = (p: Progress, ordered: readonly Exchange[]) => ordered.filter((e) => !p.ex[e.id]);

/**
 * How many of the `waiting` phrases today's lesson teaches (2026-11-17): as many as her setting allows (counted per
 * day, so restarting the lesson gives no more), while the lesson's own steps (`core`: reviews, anything left
 * part-way, a conversation) and the new phrases take about ten minutes at most (LESSON_SECONDS). None while more
 * reviews are due than one lesson holds (`backlog`): those come first.
 *
 * Until 2026-11-17 it went by the number of reviews (one new phrase from 14 reviews, none from 24). That halved the
 * pace from about day 9, and the minutes it saved went to practice that does not move the schedule: a learner doing
 * every lesson met all 128 phrases on day 105 instead of about day 70.
 */
export function newAllowance(
  p: Progress,
  today: number,
  waiting: readonly Exchange[],
  core: readonly Step[],
  backlog: boolean,
): number {
  if (backlog) return 0;
  let n = Math.min(Math.max(0, p.settings.newPerDay - metOn(p, today)), waiting.length);
  while (n > 0 && estimateSeconds([...core, ...stepsForNew(waiting.slice(0, n))]) > LESSON_SECONDS) n--;
  return n;
}

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

/** Every review due today, the longest overdue first (a lesson holds MAX_REVIEWS of them). */
function dueSteps(p: Progress, ordered: readonly Exchange[], today: number): Step[] {
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
  return due.map((d) => d.step);
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

/** How many reviews warm her up before today's new phrases are taught. */
export const WARM_UP = 5;

/**
 * Due reviews in a varied order (2026-11-17; they were every listening quiz, then every speaking step: thirteen of one
 * and twelve of the other on a usual day). Phrase by phrase, oldest first, the first pass takes one step of each
 * phrase, listening and speaking in turn; the second pass takes each phrase's other step. So the two kinds alternate,
 * and a phrase's two steps stay a whole pass apart: the quiz's answer is not fresh in her ear when she is asked to say
 * it, nor the other way round.
 */
export function mixReviews(due: readonly Step[]): Step[] {
  const byPhrase = new Map<string, ExchangeStep[]>();
  for (const s of due) if (isExchangeStep(s)) byPhrase.set(s.exId, [...(byPhrase.get(s.exId) ?? []), s]);
  const first: ExchangeStep[] = [];
  const second: ExchangeStep[] = [];
  const count = { catch: 0, answer: 0 };
  let i = 0;
  for (const steps of byPhrase.values()) {
    // A phrase with both steps due leads with the kind the first pass has fewer of (listening on a tie, then speaking).
    const want = count.catch === count.answer ? (i % 2 === 0 ? 'catch' : 'answer') : count.catch < count.answer ? 'catch' : 'answer';
    const lead = steps.find((s) => s.kind === want) ?? steps[0];
    if (lead.kind !== 'meet') count[lead.kind]++;
    first.push(lead);
    second.push(...steps.filter((s) => s !== lead));
    i++;
  }
  return [...inTurn(first), ...inTurn(second)];
}

/** Listening and speaking steps in turn, each kind keeping its order, starting with the kind of the first step. */
function inTurn(steps: readonly ExchangeStep[]): Step[] {
  if (!steps.length) return [];
  const lead = steps.filter((s) => s.kind === steps[0].kind);
  const other = steps.filter((s) => s.kind !== steps[0].kind);
  const out: Step[] = [];
  for (let i = 0; i < Math.max(lead.length, other.length); i++) {
    if (i < lead.length) out.push(lead[i]);
    if (i < other.length) out.push(other[i]);
  }
  return out;
}

/**
 * The lesson's own steps in order (2026-11-17): a few reviews to warm up, anything left part-way, then today's new
 * phrases are taught while she is fresh (they used to come after every review, about six minutes in). The rest of
 * the reviews follow, with the new phrases' quizzes a third of the way through them and their speaking steps two
 * thirds through: each new phrase is checked a while after it was taught, not at once.
 */
function arrange(reviews: readonly Step[], unfinished: readonly Step[], fresh: readonly Exchange[]): Step[] {
  const mixed = mixReviews(reviews);
  const warm = mixed.slice(0, WARM_UP);
  const rest = mixed.slice(WARM_UP);
  const teach = stepsForNew(fresh);
  const meets = teach.filter((s) => s.kind === 'meet');
  const quizzes = teach.filter((s) => s.kind === 'catch');
  const says = teach.filter((s) => s.kind === 'answer');
  const a = Math.ceil(rest.length / 3);
  const b = Math.ceil((2 * rest.length) / 3);
  return [...warm, ...unfinished, ...meets, ...rest.slice(0, a), ...quizzes, ...rest.slice(a, b), ...says, ...rest.slice(b)];
}

/** Today's lesson: a few due reviews, anything left part-way, new exchanges (as many as fit: newAllowance), the rest
 * of the reviews with the new phrases' checks among them (arrange), practice (today's new phrases first, then the
 * weakest learned ones) until it is about ten minutes long, and last, as its finish, one conversation once any is
 * ready (the one done longest ago). */
export function buildSession(p: Progress, ordered: readonly Exchange[], today: number, talks: readonly Talk[] = []): Plan {
  const due = dueSteps(p, ordered, today);
  const reviews = due.slice(0, MAX_REVIEWS);
  // Left part-way: understood but never answered (the Answer shows the reply once she has tried), or (after a
  // skipped Catch) answered but never checked.
  const unfinished: Step[] = ordered.flatMap((e): Step[] => {
    const ep = p.ex[e.id];
    if (!ep) return [];
    if (!ep.hear) return [{ kind: 'catch', exId: e.id, review: false }];
    if (e.kind !== 'understand' && !ep.say) return [{ kind: 'answer', exId: e.id, review: false }];
    return [];
  });
  const talk = readyTalks(p, talks)[0];
  const talkSteps: Step[] = talk ? [{ kind: 'talk', talkId: talk.id }] : [];
  const waiting = unmet(p, ordered);
  const allowed = newAllowance(p, today, waiting, [...reviews, ...unfinished, ...talkSteps], due.length > MAX_REVIEWS);
  const fresh = waiting.slice(0, allowed);
  const steps: Step[] = arrange(reviews, unfinished, fresh);
  const inLesson = new Set(steps.filter(isExchangeStep).map((s) => s.exId));
  const pool = [...fresh, ...byWeakness(p, ordered).filter((e) => !inLesson.has(e.id))];
  // Up to three passes over the pool, alternating saying and understanding, until about ten minutes.
  let practice = talk ? 1 : 0;
  fill: for (const flip of [false, true, false]) {
    for (const [i, e] of pool.entries()) {
      if (estimateSeconds([...steps, ...talkSteps]) >= TARGET_SECONDS || practice >= MAX_PRACTICE) break fill;
      if (flip && e.kind === 'understand') continue;
      steps.push(practiceStep(e, i, flip));
      practice++;
    }
  }
  // The conversation closes the lesson: using what she knows is its finish, not a stop on the way to more drills.
  steps.push(...talkSteps);
  return { steps, reviews: reviews.length, fresh: fresh.length, practice };
}

/**
 * More new phrases once today's lesson is done (もっと覚える, 2026-11-17): the next ones in the path, as many as a day's
 * lesson teaches, learned the same way (Meet, Catch, Answer) and recorded like today's lesson. There is no daily
 * limit: she can take one round after another. Each phrase comes back for review on the following days, and a lesson
 * teaches new phrases only while it stays about ten minutes long (newAllowance), so the reviews of a big day come
 * first.
 */
export function buildMore(p: Progress, ordered: readonly Exchange[]): Plan {
  const fresh = unmet(p, ordered).slice(0, p.settings.newPerDay);
  return { steps: stepsForNew(fresh), reviews: 0, fresh: fresh.length, practice: 0 };
}

export type PracticeKind = 'weak' | 'mixed' | 'listen' | 'speak' | 'talk';

/** Conversations in one 会話 practice. */
export const TALKS_PER_PRACTICE = 3;

/** Practice she chooses herself (the 練習 tab). Never moves the schedule; rotates by least recently practised. */
export function buildPractice(
  p: Progress,
  ordered: readonly Exchange[],
  kind: PracticeKind,
  count = 8,
  talks: readonly Talk[] = [],
): Step[] {
  if (kind === 'talk') {
    return readyTalks(p, talks)
      .slice(0, TALKS_PER_PRACTICE)
      .map((t): Step => ({ kind: 'talk', talkId: t.id }));
  }
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

/** A conversation she went through, so the next one comes round first. */
export function recordTalked(p: Progress, talkId: string, now: number): void {
  p.talked[talkId] = now;
}

export function recordMissedLine(p: Progress, en: string): void {
  p.missedLines[en] = (p.missedLines[en] ?? 0) + 1;
}

export function recordDayDone(p: Progress, today: number): void {
  if (!p.days.includes(today)) p.days.push(today);
}

/** The saved lesson for today, if there is one to continue. A lesson from an earlier day is dropped (REVIEW 2.11). */
export function resumable(p: Progress, today: number, exists: (step: Step) => boolean): SavedSession | null {
  const s = p.session;
  if (!s || s.day !== today || s.index >= s.steps.length) return null;
  return s.steps.every(exists) ? s : null;
}

export const newSaved = (plan: Plan, today: number): SavedSession => ({
  day: today,
  steps: plan.steps,
  index: 0,
  recorded: [],
  retried: [],
  counts: { fresh: plan.fresh, reviews: plan.reviews, practice: plan.practice },
});
