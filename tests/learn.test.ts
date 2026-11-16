import { describe, expect, it } from 'vitest';
import { EXCHANGES, ORDERED, UI, exchangeById } from '../src/content/index.ts';
import type { Exchange } from '../src/content/types.ts';
import { emptyProgress, normalize, type Progress } from '../src/learn/progress.ts';
import { dayNumber, learned, reviewed } from '../src/learn/schedule.ts';
import {
  buildPractice,
  buildSession,
  estimateSeconds,
  MAX_REVIEWS,
  newSaved,
  recordResult,
  resumable,
  TARGET_SECONDS,
  stepTarget,
  type Step,
} from '../src/learn/session.ts';
import { LEVEL_SIZE, englishLevel, shiftStage } from '../src/learn/shift.ts';

/** Plays a whole lesson perfectly, as the app would record it. */
function playLesson(p: Progress, steps: Step[], today: number) {
  for (const s of steps) {
    if (s.kind === 'talk') continue;
    const e = exchangeById(s.exId)!;
    if (s.kind === 'catch') recordResult(p, e, 'hear', 'good', s.review, today);
    if (s.kind === 'answer') recordResult(p, e, 'say', 'good', s.review, today);
  }
}

describe('schedule', () => {
  it('gaps grow 1, 2, 4, 7, 10, 20 days, then stay at 40 (no deadline, so no cap at 10)', () => {
    let s = learned(100);
    expect(s.due).toBe(101);
    const gaps: number[] = [];
    for (let i = 0; i < 7; i++) {
      const before = s.due;
      s = reviewed(s, 'good', before);
      gaps.push(s.due - before);
    }
    expect(gaps).toEqual([2, 4, 7, 10, 20, 40, 40]);
  });

  it('a miss goes back to box 1; "hard" keeps the box; the best box is kept', () => {
    let s = learned(0);
    s = reviewed(s, 'good', 1); // box 2
    s = reviewed(s, 'good', 3); // box 3
    expect(reviewed(s, 'hard', 7)).toMatchObject({ box: 3, due: 11, misses: 0 });
    s = reviewed(s, 'again', 7);
    expect(s).toMatchObject({ box: 1, best: 3, due: 8, misses: 1 });
  });

  it('the day changes at 4 a.m. local time', () => {
    expect(dayNumber(new Date(2026, 10, 23, 1, 30))).toBe(dayNumber(new Date(2026, 10, 22, 21, 0)));
    expect(dayNumber(new Date(2026, 10, 23, 7, 0))).toBe(dayNumber(new Date(2026, 10, 22, 21, 0)) + 1);
  });
});

describe('daily lessons', () => {
  it('day 1 teaches "Hi!" and "Sorry, what?", each checked a little after it was taught', () => {
    const plan = buildSession(emptyProgress(), ORDERED, 10);
    expect(plan.fresh).toBe(2);
    expect(plan.steps.slice(0, 6).map((s) => `${s.kind}:${stepTarget(s)}`)).toEqual([
      'meet:hi', 'meet:sorry-what',
      'catch:hi', 'catch:sorry-what', 'answer:hi', 'answer:sorry-what',
    ]);
    // Then extra practice of the two new phrases, which never moves the schedule.
    const extra = plan.steps.slice(6);
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.every((s) => (s.kind === 'catch' || s.kind === 'answer') && !s.review && ['hi', 'sorry-what'].includes(s.exId))).toBe(true);
  });

  it('the new-phrase limit is per day: restarting the lesson does not give more', () => {
    const p = emptyProgress();
    playLesson(p, buildSession(p, ORDERED, 10).steps, 10);
    const again = buildSession(p, ORDERED, 10);
    expect(again.fresh).toBe(0);
    expect(buildSession(p, ORDERED, 11).fresh).toBe(2);
  });

  it('next day: reviews first, alternating "what does it mean?" and "what would you answer?"', () => {
    const p = emptyProgress();
    playLesson(p, buildSession(p, ORDERED, 10).steps, 10);
    const day2 = buildSession(p, ORDERED, 11);
    expect(day2.reviews).toBe(4);
    expect(day2.steps.slice(0, 4).every((s) => (s.kind === 'catch' || s.kind === 'answer') && s.review)).toBe(true);
    const meets = day2.steps.filter((s) => s.kind === 'meet').map((s) => s.exId);
    expect(meets).toEqual(['thank-you', 'are-you-ok']);
    // First review of a reply exchange asks the meaning; the next one asks for the reply.
    expect(day2.steps.find((s) => s.kind === 'catch' && s.exId === 'hi')).toMatchObject({ ask: 'meaning' });
    playLesson(p, day2.steps, 11);
    const later = buildSession(p, ORDERED, 13).steps.find((s) => s.kind === 'catch' && s.exId === 'hi');
    expect(later).toMatchObject({ review: true, ask: 'reply' });
  });

  it('lessons are topped up with practice to about ten minutes once there is something to practise', () => {
    const p = emptyProgress();
    for (let day = 10; day < 16; day++) playLesson(p, buildSession(p, ORDERED, day).steps, day);
    // A day with nothing due and no new phrases left in the day's allowance.
    p.settings.newPerDay = 1;
    for (const e of Object.values(p.ex)) {
      if (e.hear) e.hear.due = 30;
      if (e.say) e.say.due = 30;
    }
    p.ex['hi'].met = 20;
    const plan = buildSession(p, ORDERED, 20);
    expect(plan.reviews).toBe(0);
    expect(plan.practice).toBeGreaterThan(0);
    expect(estimateSeconds(plan.steps)).toBeGreaterThanOrEqual(Math.min(TARGET_SECONDS, 6 * 60));
    expect(plan.steps.every((s) => s.kind === 'meet' || s.kind === 'talk' || !s.review)).toBe(true);
  });

  it('a big backlog is capped and new phrases wait', () => {
    // Synthetic exchanges, so the cap is really exercised (more due reviews than MAX_REVIEWS).
    const many: Exchange[] = Array.from({ length: 40 }, (_, i) => ({ ...EXCHANGES.find((e) => e.kind === 'reply')!, id: `x${i}` }));
    const p = emptyProgress();
    for (const e of many) {
      p.ex[e.id] = { met: 1, hear: learned(1), say: learned(1) };
    }
    const plan = buildSession(p, [...many, ...ORDERED], 30);
    expect(plan.reviews).toBe(MAX_REVIEWS);
    expect(plan.fresh).toBe(0);
  });

  it('a lesson is resumed only on the day it was planned for', () => {
    const p = emptyProgress();
    const saved = newSaved(buildSession(p, ORDERED, 10), 10);
    saved.index = 3;
    p.session = saved;
    const exists = (s: Step) => !!exchangeById(stepTarget(s));
    expect(resumable(p, 10, exists)?.index).toBe(3);
    expect(resumable(p, 11, exists)).toBeNull();
    p.session = { ...saved, index: saved.steps.length };
    expect(resumable(p, 10, exists)).toBeNull();
  });

  it('practice never moves the schedule and rotates through everything learned', () => {
    const p = emptyProgress();
    for (let day = 10; day < 14; day++) playLesson(p, buildSession(p, ORDERED, day).steps, day);
    const before = structuredClone(p.ex);
    const first = buildPractice(p, ORDERED, 'mixed', 4);
    for (const s of first) if (s.kind !== 'talk') recordResult(p, exchangeById(s.exId)!, s.kind === 'catch' ? 'hear' : 'say', 'again', false, 14);
    expect(p.ex).toEqual(before);
    for (const s of first) p.practiced[stepTarget(s)] = Date.now();
    const second = buildPractice(p, ORDERED, 'mixed', 4);
    expect(second.some((s) => first.some((f) => stepTarget(f) === stepTarget(s)))).toBe(false);
    expect(buildPractice(p, ORDERED, 'speak').every((s) => s.kind === 'answer')).toBe(true);
    expect(buildPractice(p, ORDERED, 'listen').every((s) => s.kind === 'catch')).toBe(true);
  });
});

describe('Japanese → English shift', () => {
  it('switches as the needed exchange is learned, and never switches back after a miss', () => {
    const p = emptyProgress();
    const e = exchangeById('next')!;
    expect(shiftStage(UI.next, p)).toBe(1);
    recordResult(p, e, 'hear', 'good', false, 1); // box 1
    expect(shiftStage(UI.next, p)).toBe(1);
    recordResult(p, e, 'hear', 'good', true, 2); // box 2: learned
    expect(shiftStage(UI.next, p)).toBe(2);
    recordResult(p, e, 'hear', 'again', true, 4); // missed: back to box 1, but best stays 2
    expect(p.ex[e.id].hear!.box).toBe(1);
    expect(shiftStage(UI.next, p)).toBe(2);
    p.ex[e.id].hear!.best = 6;
    expect(shiftStage(UI.next, p)).toBe(4);
    p.settings.keepReadings = true;
    expect(shiftStage(UI.next, p)).toBe(3);
    p.settings.allJapanese = true;
    expect(shiftStage(UI.next, p)).toBe(1);
  });

  it('self-rated speaking never switches anything; the meter counts learned phrases in levels of ten', () => {
    const p = emptyProgress();
    p.ex['next'] = { met: 1, say: { box: 6, best: 6, due: 99, last: 1, reviews: 9, misses: 0 } };
    expect(shiftStage(UI.next, p)).toBe(1);
    expect(englishLevel(p)).toEqual({ level: 1, learned: 0, toNext: LEVEL_SIZE, fill: 0 });
    // The course has no end: the level just keeps counting, whatever its size.
    for (const e of EXCHANGES) p.ex[e.id] = { met: 1, hear: { box: 2, best: 2, due: 9, last: 1, reviews: 1, misses: 0 } };
    const n = EXCHANGES.length;
    expect(englishLevel(p)).toEqual({
      level: Math.floor(n / LEVEL_SIZE) + 1,
      learned: n,
      toNext: LEVEL_SIZE - (n % LEVEL_SIZE),
      fill: (n % LEVEL_SIZE) / LEVEL_SIZE,
    });
  });
});

describe('saved progress', () => {
  it('fills gaps in old or partial saves, and drops a malformed saved lesson', () => {
    const p = normalize({
      v: 1,
      days: [3],
      ex: { 'hi': { met: 2, hear: { box: 3, due: 9 } } },
      session: { day: 5, index: 1, steps: [{ kind: 'meet' }] },
      settings: { keepReadings: true, newPerDay: 9, tripDate: '2027-02-14' },
    });
    expect(p.settings).toMatchObject({ keepReadings: true, newPerDay: 3, toured: false });
    // The trip date of older saves is dropped: there is no deadline any more.
    expect('tripDate' in p.settings).toBe(false);
    expect(p.ex['hi'].hear).toMatchObject({ box: 3, best: 3, reviews: 0 });
    expect(p.session).toBeNull();
    expect(normalize('nonsense')).toEqual(emptyProgress());
  });

  it('a lesson saved with the old repeat-after-me steps resumes at the same place without them', () => {
    const steps = [
      { kind: 'meet', exId: 'hi' },
      { kind: 'shadow', exId: 'hi' },
      { kind: 'meet', exId: 'sorry-what' },
      { kind: 'shadow', exId: 'sorry-what' },
      { kind: 'catch', exId: 'hi', review: false },
      { kind: 'answer', exId: 'hi', review: false },
    ];
    // She had done both Meets and both repeat-after-mes, and was about to start the Catch.
    const p = normalize({ v: 1, session: { day: 5, index: 4, steps, recorded: [0, 2, 4], retried: [], counts: {} } });
    expect(p.session?.steps.map((s) => `${s.kind}:${stepTarget(s)}`)).toEqual(['meet:hi', 'meet:sorry-what', 'catch:hi', 'answer:hi']);
    expect(p.session?.index).toBe(2);
    expect(p.session?.recorded).toEqual([0, 1, 2]);
    // Standing on a removed step, she goes on with the next step that is left.
    const onShadow = normalize({ v: 1, session: { day: 5, index: 3, steps, recorded: [], retried: [], counts: {} } });
    expect(onShadow.session?.steps[onShadow.session.index]).toMatchObject({ kind: 'catch', exId: 'hi' });
  });
});
