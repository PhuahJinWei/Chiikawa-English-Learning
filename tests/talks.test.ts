// Short conversations (src/content/talks.ts): made of lines she has learned, ready once she has learned their steps,
// one in each day's lesson, more in 練習, and never moving the review schedule.
import { describe, expect, it } from 'vitest';
import { ORDERED, TALKS, TALKS_WRITTEN, stepById, talkById } from '../src/content/index.ts';
import { TOPICS } from '../src/content/topics.ts';
import type { Talk } from '../src/content/types.ts';
import { emptyProgress, normalize, type Progress } from '../src/learn/progress.ts';
import { finishStep, practiceRun } from '../src/learn/run.ts';
import { buildPractice, buildSession, readyTalks, talkReady, TALKS_PER_PRACTICE } from '../src/learn/session.ts';

/** Progress where these steps are learned (understood the day after) and, unless told otherwise, said once. */
function learnedSteps(ids: readonly string[], said = true): Progress {
  const p = emptyProgress();
  for (const id of ids) {
    p.ex[id] = {
      met: 1,
      hear: { box: 2, best: 2, due: 99, last: 2, reviews: 1, misses: 0 },
      ...(said ? { say: { box: 1, best: 1, due: 99, last: 1, reviews: 0, misses: 0 } } : {}),
    };
  }
  return p;
}

const first = TALKS[0];
const second = TALKS[1];

describe('conversations as written', () => {
  it('use lines that are in their steps, said by the right person', () => {
    for (const { def } of TALKS_WRITTEN) {
      for (const [i, t] of def.turns.entries()) {
        const e = stepById(t.step);
        expect(e, `${def.id} line ${i + 1}: no step "${t.step}"`).toBeTruthy();
        const pool = t.who === 'me' ? e!.short : [...e!.heard, ...e!.then, ...(e!.kind === 'say' ? e!.short : [])];
        const where = t.who === 'me' ? 'she says' : 'she hears';
        expect(
          pool.map((l) => l.en),
          `${def.id} line ${i + 1}: "${t.en}" is not a line ${where} in "${t.step}"`,
        ).toContain(t.en);
      }
    }
  });

  it('have their own id, a title, a situation, at least three lines and at least one of hers', () => {
    expect(new Set(TALKS_WRITTEN.map((w) => w.def.id)).size).toBe(TALKS_WRITTEN.length);
    for (const { def } of TALKS_WRITTEN) {
      expect(def.id, def.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(TOPICS[def.topic], `${def.id}: topic`).toBeTruthy();
      expect(def.title && def.cue, `${def.id}: title and situation`).toBeTruthy();
      expect(def.turns.length, `${def.id}: lines`).toBeGreaterThanOrEqual(3);
      expect(def.turns.some((t) => t.who === 'me'), `${def.id}: she says something`).toBe(true);
    }
  });

  it('are written as adults write Japanese', () => {
    const SPACED = /[぀-ヿ一-鿿][ 　]+[぀-ヿ一-鿿]/;
    for (const { def } of TALKS_WRITTEN) for (const text of [def.title, def.cue]) expect(text, def.id).not.toMatch(SPACED);
  });

  it('are all in the app unless they are drafts: every line has its audio and every step is taught', () => {
    expect(TALKS.map((t) => t.id)).toEqual(TALKS_WRITTEN.filter((w) => w.def.status !== 'draft').map((w) => w.def.id));
    expect(TALKS.some((t) => t.status === 'draft')).toBe(false);
  });

  it('are written in the order they become ready, drafts too', () => {
    const at = new Map(ORDERED.map((e, i) => [e.id, i] as const));
    const ready = (t: Talk) => Math.max(...t.steps.map((id) => at.get(id)!));
    const order = TALKS_WRITTEN.map(({ def, talk }) => {
      expect(talk, `${def.id}: a line is not in its step`).toBeTruthy();
      return ready(talk!);
    });
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('play the other person’s lines on the topic’s friend, and hers on her partner', () => {
    const arriving = talkById('arriving')!;
    expect(arriving.cast).toEqual(TOPICS.family.cast);
    for (const t of arriving.turns) {
      const who = new Set(t.acts.map((a) => a.who));
      if (t.who === 'me') expect([...who].every((w) => w === 'chiikawa'), t.line.en).toBe(true);
      else expect([...who].every((w) => w === 'shisa' || w === 'chiikawa'), t.line.en).toBe(true);
    }
  });
});

describe('conversations in lessons', () => {
  it('are ready once every step is learned and each of her lines was said', () => {
    expect(talkReady(learnedSteps(first.steps), first)).toBe(true);
    expect(talkReady(learnedSteps(first.steps.slice(1)), first)).toBe(false);
    expect(talkReady(learnedSteps(first.steps, false), first)).toBe(false);
    // Met but not yet checked the next day: not learned.
    const p = learnedSteps(first.steps);
    p.ex[first.steps[0]].hear = { box: 1, best: 1, due: 2, last: 1, reviews: 0, misses: 0 };
    expect(talkReady(p, first)).toBe(false);
  });

  it('come one a day in the lesson, the one done longest ago first', () => {
    expect(buildSession(emptyProgress(), ORDERED, 10, TALKS).steps.some((s) => s.kind === 'talk')).toBe(false);
    const p = learnedSteps([...new Set([...first.steps, ...second.steps])]);
    const talksIn = (q: Progress) => buildSession(q, ORDERED, 10, TALKS).steps.filter((s) => s.kind === 'talk');
    expect(talksIn(p)).toEqual([{ kind: 'talk', talkId: first.id }]);
    p.talked[first.id] = 1000;
    expect(talksIn(p)).toEqual([{ kind: 'talk', talkId: second.id }]);
    expect(buildSession(p, ORDERED, 10, TALKS).practice).toBeGreaterThanOrEqual(1);
  });

  it('are what 会話 practice holds, up to three', () => {
    const p = learnedSteps(ORDERED.map((e) => e.id));
    const steps = buildPractice(p, ORDERED, 'talk', 8, TALKS);
    expect(steps).toHaveLength(Math.min(TALKS_PER_PRACTICE, TALKS.length));
    expect(steps.every((s) => s.kind === 'talk')).toBe(true);
    expect(buildPractice(emptyProgress(), ORDERED, 'talk', 8, TALKS)).toEqual([]);
    expect(readyTalks(p, TALKS)).toHaveLength(TALKS.length);
  });

  it('only note when she went through them, and are kept in a saved lesson', () => {
    const p = learnedSteps(first.steps);
    const before = JSON.stringify(p.ex);
    const run = practiceRun([{ kind: 'talk', talkId: first.id }], 10);
    finishStep(run, p, () => undefined, {}, 5000);
    expect(p.talked[first.id]).toBe(5000);
    expect(JSON.stringify(p.ex)).toBe(before);
    expect(run.recorded).toEqual([]);

    const plan = buildSession(p, ORDERED, 10, TALKS);
    p.session = { day: 10, steps: plan.steps, index: 0, recorded: [], retried: [], counts: { fresh: 0, reviews: 0, practice: 1 } };
    const back = normalize(JSON.parse(JSON.stringify(p)));
    expect(back.session?.steps).toEqual(plan.steps);
    expect(back.talked).toEqual({ [first.id]: 5000 });
    expect(normalize({ v: 1 }).talked).toEqual({});
  });
});
