// Fixes from the code audit of 2026-11-17 (REVIEW.md): each defect found has a test here.
import { describe, expect, it } from 'vitest';
import { ORDERED, TALKS, exchangeById } from '../src/content/index.ts';
import { BACKUP_MAX_BYTES, makeBackup, readBackup } from '../src/learn/backup.ts';
import { emptyProgress, normalize } from '../src/learn/progress.ts';
import { finishStep, fromSaved, move, skipKnown } from '../src/learn/run.ts';
import { learned } from '../src/learn/schedule.ts';
import { buildSession, MAX_REVIEWS, newSaved, stepTarget, type Step } from '../src/learn/session.ts';

describe('reviews due on the same day', () => {
  it('come in path order, a phrase’s two steps together, so the cut to one lesson keeps both kinds', () => {
    const p = emptyProgress();
    const replies = ORDERED.filter((e) => e.kind === 'reply').slice(0, 25);
    for (const e of replies) p.ex[e.id] = { met: 1, hear: learned(1), say: learned(1) };
    const plan = buildSession(p, ORDERED, 30);
    const reviews = plan.steps.filter((s) => s.kind !== 'meet' && s.kind !== 'talk' && s.review);
    expect(reviews).toHaveLength(MAX_REVIEWS);
    // 50 are due and 30 fit: the first 15 phrases of the path, each with its listening and its speaking step.
    const kept = new Set(reviews.map(stepTarget));
    expect([...kept].sort()).toEqual(replies.slice(0, 15).map((e) => e.id).sort());
    expect(reviews.filter((s) => s.kind === 'catch')).toHaveLength(15);
    expect(reviews.filter((s) => s.kind === 'answer')).toHaveLength(15);
  });
});

describe('a running lesson', () => {
  it('earns its stamp when every new phrase was one she already knew', () => {
    const p = emptyProgress();
    const run = fromSaved(newSaved(buildSession(p, ORDERED, 10), 10));
    while (run.index < run.steps.length) {
      const s = run.steps[run.index];
      if (s.kind === 'meet') skipKnown(run, p, exchangeById(s.exId)!);
      move(run, p, 1);
    }
    expect(p.days).toEqual([10]);
    expect(p.ex['hi'].hear?.box).toBe(3);
  });

  it('retries a missed step before the closing conversation, which stays last', () => {
    const p = emptyProgress();
    const steps: Step[] = [
      { kind: 'catch', exId: 'hi', review: true },
      { kind: 'answer', exId: 'hi', review: true },
      { kind: 'talk', talkId: TALKS[0].id },
    ];
    p.ex['hi'] = { met: 1, hear: learned(1), say: learned(1) };
    const run = fromSaved({ day: 10, steps, index: 0, recorded: [], retried: [], counts: { fresh: 0, reviews: 2, practice: 1 } });
    finishStep(run, p, exchangeById, { grade: 'again' }, 1);
    expect(run.steps.map((s) => s.kind)).toEqual(['catch', 'answer', 'catch', 'talk']);
    // On the conversation itself there is nothing left to put a retry before: a late miss goes to the end.
    run.index = 3;
    run.steps.push({ kind: 'answer', exId: 'hi', review: false });
    run.index = 4;
    finishStep(run, p, exchangeById, { grade: 'again' }, 2);
    expect(run.steps.at(-1)).toMatchObject({ kind: 'answer', exId: 'hi' });
  });
});

describe('saved progress from a hand-edited save or backup', () => {
  it('keeps only numbers the schedule can work with', () => {
    const p = normalize({
      v: 1,
      started: 1e999,
      days: [5, 5, 6.4, 'x', -3, 1e999],
      ex: {
        hi: { met: 3, hear: { box: 2.5, due: 9 }, say: { box: 99, due: 1e400 } },
        bye: { met: 'yesterday' },
        ['x'.repeat(200)]: { met: 1 },
      },
      missedLines: { 'Hi!': '2', 'Bye!': 3 },
      practiced: { hi: {}, bye: 12 },
      talked: { a: 1, b: null },
      notes: [{ id: 'n'.repeat(100), en: 'Hi', ja: '' }, { id: 'ok', en: 'Hi', ja: '', from: 'f'.repeat(500) }],
    });
    expect(p.started).toBeNull();
    expect(p.days).toEqual([5, 6]);
    // A box between two boxes is rounded and kept within 1 to 7; a due day that is not a day drops the skill.
    expect(p.ex['hi']).toEqual({ met: 3, hear: { box: 3, best: 3, due: 9, last: 9, reviews: 0, misses: 0 }, say: undefined });
    expect(Object.keys(p.ex)).toEqual(['hi']);
    expect(p.missedLines).toEqual({ 'Bye!': 3 });
    expect(p.practiced).toEqual({ bye: 12 });
    expect(p.talked).toEqual({ a: 1 });
    expect(p.notes.map((n) => n.id)).toEqual(['ok']);
    expect('from' in p.notes[0]).toBe(false);
    // What it keeps survives a save and a load unchanged.
    expect(normalize(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('a backup that unpacks to more than a backup can hold is refused, not unpacked whole', async () => {
    const big = emptyProgress();
    big.notes = Array.from({ length: 500 }, (_, i) => ({ id: `n${i}`, en: 'a'.repeat(300), ja: 'あ'.repeat(500), created: i, updated: i }));
    // 500 full notes: a real backup, well under the limit.
    const real = await readBackup(await makeBackup(big, 10));
    expect(real.ok).toBe(true);
    const zeros = new Uint8Array(BACKUP_MAX_BYTES + 1024);
    const packed = new Uint8Array(await new Response(new Blob([zeros]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
    let s = '';
    for (const b of packed) s += String.fromCharCode(b);
    const text = (await makeBackup(emptyProgress(), 10)).replace(/:[^~]*~/, `:${btoa(s)}~`);
    expect(await readBackup(text)).toMatchObject({ ok: false, why: 'broken' });
  });
});
