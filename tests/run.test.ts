// The lesson's bookkeeping (src/learn/run.ts): the paths the second review found broken in the lesson screen.
import { describe, expect, it } from 'vitest';
import { ORDERED, exchangeById } from '../src/content/index.ts';
import { emptyProgress } from '../src/learn/progress.ts';
import { finishStep, fromSaved, leaveRun, move, practiceRun, skipKnown } from '../src/learn/run.ts';
import { buildSession, newSaved, resumable, stepTarget, type Step } from '../src/learn/session.ts';

const find = (id: string) => exchangeById(id);
const exists = (s: Step) => !!exchangeById(stepTarget(s));

function startDay(p = emptyProgress(), day = 10) {
  const r = fromSaved(newSaved(buildSession(p, ORDERED, day), day));
  p.session = null;
  return { p, r, day };
}

/** Answers or skips every step: 'answer' = good grade on checks, 'skip' = move on without a result. */
function playAll(p: ReturnType<typeof emptyProgress>, r: ReturnType<typeof practiceRun>, how: (i: number) => 'answer' | 'skip') {
  for (let i = 0; r.index < r.steps.length && i < 200; i++) {
    const s = r.steps[r.index];
    if (how(r.index) === 'answer' && (s.kind === 'catch' || s.kind === 'answer')) finishStep(r, p, find, { grade: 'good' }, 1000 + i);
    move(r, p, 1);
  }
}

describe('lesson bookkeeping', () => {
  it('もう知ってる on a new phrase: known at once, first checked in four days, and its steps today dropped', () => {
    const { p, r, day } = startDay();
    expect(r.steps[0]).toMatchObject({ kind: 'meet', exId: 'hi' });
    const before = r.steps.length;
    const later = r.steps.filter((s, i) => i > 0 && stepTarget(s) === 'hi').length;
    const practice = r.counts.practice;
    skipKnown(r, p, find('hi')!);
    move(r, p, 1);
    expect(p.ex['hi']).toMatchObject({ met: day, hear: { box: 3, due: day + 4 }, say: { box: 3, due: day + 4 } });
    // Only the Meet she was on is left of it; its own two checks and its practice are gone.
    expect(r.steps.filter((s) => stepTarget(s) === 'hi')).toHaveLength(1);
    expect(r.steps).toHaveLength(before - later);
    expect(r.counts.practice).toBe(practice - (later - 2));
    expect(r.steps[r.index]).toMatchObject({ kind: 'meet', exId: 'sorry-what' });
    // The rest of the lesson goes on as usual, and earns the day's stamp.
    playAll(p, r, () => 'answer');
    expect(p.days).toEqual([day]);
    // No review of it until its first check, four days on.
    expect(buildSession(p, ORDERED, day + 3).steps.some((s) => stepTarget(s) === 'hi' && 'review' in s && s.review)).toBe(false);
    expect(buildSession(p, ORDERED, day + 4).steps.some((s) => stepTarget(s) === 'hi' && 'review' in s && s.review)).toBe(true);
  });

  it('practice ignores もう知ってる', () => {
    const p = emptyProgress();
    const run = practiceRun([{ kind: 'meet', exId: 'hi' }, { kind: 'catch', exId: 'hi', review: false }], 10);
    skipKnown(run, p, find('hi')!);
    expect(p.ex).toEqual({});
    expect(run.steps).toHaveLength(2);
  });

  it('a new phrase whose listening check was skipped comes back the next day (and is not lost)', () => {
    const { p, r } = startDay();
    // Skip every listening check of "Sorry, what?" (the first one and the extra practice ones).
    playAll(p, r, (i) => (r.steps[i].kind === 'catch' && r.steps[i].exId === 'sorry-what' ? 'skip' : 'answer'));
    expect(p.ex['sorry-what'].hear).toBeUndefined();
    expect(p.ex['sorry-what'].say).toBeDefined();
    const next = buildSession(p, ORDERED, 11);
    expect(next.steps).toContainEqual({ kind: 'catch', exId: 'sorry-what', review: false });
  });

  it('practice never changes the schedule, even for a half-learned phrase, but notes the practice', () => {
    const p = emptyProgress();
    const run = practiceRun([{ kind: 'answer', exId: 'are-you-ok', review: false }, { kind: 'catch', exId: 'hi', review: false }], 10);
    finishStep(run, p, find, { grade: 'again', missedLine: 'Are you OK?' }, 5000);
    move(run, p, 1);
    finishStep(run, p, find, { grade: 'good' }, 6000);
    move(run, p, 1);
    expect(p.ex).toEqual({});
    expect(p.days).toEqual([]);
    expect(p.practiced).toEqual({ 'are-you-ok': 5000, 'hi': 6000 });
    expect(p.missedLines).toEqual({ 'Are you OK?': 1 });
    expect(run.steps).toHaveLength(3); // one retry of the missed step
  });

  it('going back and redoing a step never records it twice', () => {
    const { p, r } = startDay();
    while (r.steps[r.index].kind !== 'catch') move(r, p, 1);
    finishStep(r, p, find, { grade: 'good' }, 1);
    move(r, p, 1);
    move(r, p, -1);
    finishStep(r, p, find, { grade: 'again' }, 2);
    expect(r.recorded).toHaveLength(1);
    expect(r.retried).toHaveLength(0);
  });

  it('skipping every step earns no stamp; answering earns one and clears the saved lesson', () => {
    const a = startDay();
    playAll(a.p, a.r, () => 'skip');
    expect(a.p.days).toEqual([]);
    expect(a.p.session).toBeNull();
    const b = startDay();
    playAll(b.p, b.r, () => 'answer');
    expect(b.p.days).toEqual([10]);
    expect(b.p.session).toBeNull();
  });

  it('leaving part-way saves her place, and she resumes exactly there the same day', () => {
    const { p, r } = startDay();
    move(r, p, 1);
    move(r, p, 1);
    leaveRun(r, p);
    expect(resumable(p, 10, exists)?.index).toBe(2);
    expect(resumable(p, 11, exists)).toBeNull();
  });

  it('a missed check gets exactly one retry at the end', () => {
    const { p, r } = startDay();
    while (r.steps[r.index].kind !== 'catch') move(r, p, 1);
    const length = r.steps.length;
    finishStep(r, p, find, { grade: 'again' }, 1);
    expect(r.steps).toHaveLength(length + 1);
    expect(r.steps.at(-1)).toMatchObject({ kind: 'catch', review: false });
  });
});
