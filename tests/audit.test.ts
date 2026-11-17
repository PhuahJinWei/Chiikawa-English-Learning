// Fixes from the code audit of 2026-11-17 (REVIEW.md), and from the review of those fixes (2026-11-18): each defect
// found has a test here, or in the test file of the code it was in (run, boot, service worker, audio).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ORDERED, TALKS, exchangeById } from '../src/content/index.ts';
import { BACKUP_MAX_BYTES, makeBackup, readBackup } from '../src/learn/backup.ts';
import { newNote, putNote } from '../src/learn/notes.ts';
import { emptyProgress, normalize, NOTE_EN_MAX, NOTE_JA_MAX, NOTE_MORE_MAX, NOTES_MAX } from '../src/learn/progress.ts';
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

  it('retries a missed step before the closing conversation, which stays last, or at the end without one', () => {
    const p = emptyProgress();
    p.ex['hi'] = { met: 1, hear: learned(1), say: learned(1) };
    const steps: Step[] = [
      { kind: 'catch', exId: 'hi', review: true },
      { kind: 'answer', exId: 'hi', review: true },
    ];
    const counts = { fresh: 0, reviews: 2, practice: 0 };
    const talk = fromSaved({ day: 10, steps: [...steps, { kind: 'talk', talkId: TALKS[0].id }], index: 0, recorded: [], retried: [], counts });
    finishStep(talk, p, exchangeById, { grade: 'again' }, 1);
    expect(talk.steps.map((s) => s.kind)).toEqual(['catch', 'answer', 'catch', 'talk']);
    // A round of もっと覚える has no conversation: the retry is its last step.
    const round = fromSaved({ day: 10, steps, index: 1, recorded: [], retried: [], counts });
    finishStep(round, p, exchangeById, { grade: 'again' }, 2);
    expect(round.steps).toEqual([...steps, { kind: 'answer', exId: 'hi', review: false }]);
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

  it('keeps a saved lesson only within what a lesson can be (2026-11-18)', () => {
    const endless = Array.from({ length: 30_000 }, (): Step => ({ kind: 'catch', exId: 'hi', review: false }));
    const session = (s: Record<string, unknown>) => normalize({ v: 1, session: { day: 10, index: 0, recorded: [], retried: [], ...s } }).session;
    expect(session({ steps: endless, recorded: endless.map((_, i) => i) })).toBeNull();
    expect(
      session({
        index: 1.4,
        steps: [
          { kind: 'meet', exId: 'hi', extra: 'x'.repeat(100) },
          { kind: 'catch', exId: 'hi', review: 'yes', ask: 'loud' },
          { kind: 'talk', talkId: TALKS[0].id },
        ],
        recorded: [0, 0, 1, 1.5, 7],
        retried: ['catch:hi', 'catch:hi', 3],
        counts: { fresh: 1.5, reviews: 1e300, practice: -2 },
      }),
    ).toEqual({
      day: 10,
      index: 1,
      steps: [
        { kind: 'meet', exId: 'hi' },
        { kind: 'catch', exId: 'hi', review: false },
        { kind: 'talk', talkId: TALKS[0].id },
      ],
      recorded: [0, 1],
      retried: ['catch:hi'],
      counts: { fresh: 2, reviews: 1000, practice: 0 },
    });
  });
});

describe('backups at the limits', () => {
  it('her own backup comes back even with every note full (2026-11-18: the 4 MB limit refused it)', async () => {
    // 500 notes at every limit, in Japanese (3 bytes a character) in every box: about 5 MB unpacked.
    const full = emptyProgress();
    const ja = 'あ'.repeat(NOTE_JA_MAX);
    for (let i = 0; i < NOTES_MAX; i++) {
      const note = { ...newNote('あ'.repeat(NOTE_EN_MAX), ja, i, 'how-are-you'), id: `n${i}`, more: Array<string>(NOTE_MORE_MAX).fill(ja) };
      expect(putNote(full, note)).toBe(true);
    }
    const size = new TextEncoder().encode(JSON.stringify(full)).length;
    expect(size).toBeGreaterThan(4.5e6);
    expect(size).toBeLessThan(BACKUP_MAX_BYTES);
    const r = await readBackup(await makeBackup(full, 10));
    expect(r.ok && r.progress.notes).toEqual(full.notes);
  });

  it('a backup that unpacks to more than any record can be is refused, not unpacked whole', async () => {
    // A save padded past the limit: it would be read (the padding cut off) if only its size did not stop it.
    // (2026-11-18: the test packed zero bytes, which are refused as not being a save at all, limit or not.)
    const padded = emptyProgress();
    padded.notes = [{ id: 'n1', en: 'Hi', ja: ' '.repeat(BACKUP_MAX_BYTES), created: 1, updated: 1 }];
    expect(await readBackup(await makeBackup(padded, 10))).toEqual({ ok: false, why: 'broken' });
  });
});

describe('a restore or a fresh start (2026-11-18)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('is written before it is used: on a phone too full to save it, nothing changes', async () => {
    const stored = new Map<string, string>();
    let full = true;
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => stored.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (full) throw new DOMException('full', 'QuotaExceededError');
        stored.set(k, v);
      },
    });
    vi.resetModules();
    const { app, replaceProgress } = await import('../src/app/state.svelte.ts');
    const restored = { ...emptyProgress(), days: [1, 2, 3] };
    expect(replaceProgress(restored)).toBe(false);
    expect(app.progress.days).toEqual([]);
    expect(stored.size).toBe(0);
    full = false;
    expect(replaceProgress(restored)).toBe(true);
    expect(app.progress.days).toEqual([1, 2, 3]);
    expect(app.saved).toBe(true);
    expect(JSON.parse([...stored.values()][0]).days).toEqual([1, 2, 3]);
  });
});
