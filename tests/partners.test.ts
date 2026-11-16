// Her study partner on stage (src/learn/partners.ts): Chiikawa first, others joining as her level goes up, one
// partner a day, and ちいかわ's part in a scene played by whoever is her partner.
import { describe, expect, it } from 'vitest';
import { castWith, joinedAt, joinedBetween, nextToJoin, partnerOfDay } from '../src/learn/partners.ts';
import { emptyProgress, normalize, type Progress } from '../src/learn/progress.ts';

/** Progress with `n` phrases learned (understanding checked a day after meeting them). */
function learned(n: number): Progress {
  const p = emptyProgress();
  for (let i = 0; i < n; i++) p.ex[`x${i}`] = { met: 1, hear: { box: 2, best: 2, due: 9, last: 2, reviews: 1, misses: 0 } };
  return p;
}

/** The partners of `days` days in a row, from day 10. */
const run = (p: Progress, days: number) => Array.from({ length: days }, (_, i) => partnerOfDay(p, 10 + i).id);

describe('partners', () => {
  it('join at levels 2 and 3, after Chiikawa', () => {
    expect(joinedAt(1)).toEqual(['chiikawa']);
    expect(joinedAt(2)).toEqual(['chiikawa', 'usagi']);
    expect(joinedAt(5)).toEqual(['chiikawa', 'usagi', 'momonga']);
    expect(nextToJoin(1)).toEqual({ id: 'usagi', level: 2 });
    expect(nextToJoin(3)).toBeNull();
    expect(joinedBetween(1, 2)).toEqual(['usagi']);
    expect(joinedBetween(2, 2)).toEqual([]);
  });

  it('is Chiikawa every day until someone else joins', () => {
    const p = learned(9);
    expect(run(p, 4)).toEqual(['chiikawa', 'chiikawa', 'chiikawa', 'chiikawa']);
    expect(partnerOfDay(p, 13).first).toBe(false);
  });

  it('is chosen once a day: asking again the same day gives the same partner', () => {
    const p = learned(10);
    p.partnered = ['chiikawa'];
    p.partner = { id: 'chiikawa', day: 9, first: false };
    const a = partnerOfDay(p, 10);
    expect(a).toEqual({ id: 'usagi', first: true });
    expect(partnerOfDay(p, 10)).toEqual(a);
    expect(p.partner).toEqual({ id: 'usagi', day: 10, first: true });
  });

  it('starts with a new friend on their first day, then takes turns', () => {
    const p = learned(10);
    expect(run(p, 1)).toEqual(['chiikawa']);
    // Level 2 reached: うさぎ comes first, then they take turns.
    p.partner = { id: 'chiikawa', day: 10, first: false };
    expect(Array.from({ length: 4 }, (_, i) => partnerOfDay(p, 11 + i))).toEqual([
      { id: 'usagi', first: true },
      { id: 'chiikawa', first: false },
      { id: 'usagi', first: false },
      { id: 'chiikawa', first: false },
    ]);
    // Level 3: モモンガ first, then all three in turn.
    for (let i = 10; i < 20; i++) p.ex[`x${i}`] = { met: 1, hear: { box: 2, best: 2, due: 9, last: 2, reviews: 1, misses: 0 } };
    expect(Array.from({ length: 4 }, (_, i) => partnerOfDay(p, 15 + i).id)).toEqual(['momonga', 'chiikawa', 'usagi', 'momonga']);
    expect(p.partnered).toEqual(['chiikawa', 'usagi', 'momonga']);
  });

  it('is chosen again when a restored backup lowers her level', () => {
    const p = learned(5);
    p.partnered = ['chiikawa', 'usagi'];
    p.partner = { id: 'usagi', day: 10, first: false };
    expect(partnerOfDay(p, 10).id).toBe('chiikawa');
  });

  it('plays ちいかわ’s part, unless they already have a part of their own', () => {
    expect(castWith(['hachiware', 'chiikawa'], 'usagi')).toEqual({ cast: ['hachiware', 'usagi'], buddy: 'usagi' });
    expect(castWith(['hachiware', 'kurimanju', 'chiikawa'], 'momonga')).toEqual({
      cast: ['hachiware', 'kurimanju', 'momonga'],
      buddy: 'momonga',
    });
    // A phrase from うさぎ's own topic: うさぎ is the person she meets, and Chiikawa stays her partner.
    expect(castWith(['hachiware', 'usagi', 'chiikawa'], 'usagi')).toEqual({
      cast: ['hachiware', 'usagi', 'chiikawa'],
      buddy: 'chiikawa',
    });
    expect(castWith(['hachiware', 'chiikawa'], 'chiikawa').buddy).toBe('chiikawa');
  });

  it('are kept in her saved progress, and anything else is dropped', () => {
    const p = learned(10);
    partnerOfDay(p, 10);
    partnerOfDay(p, 11);
    const back = normalize(JSON.parse(JSON.stringify(p)));
    expect(back.partner).toEqual(p.partner);
    expect(back.partnered).toEqual(['chiikawa', 'usagi']);
    const junk = normalize({ ...JSON.parse(JSON.stringify(p)), partner: { id: 'rakko', day: 3 }, partnered: ['usagi', 'nobody', 'usagi'] });
    expect(junk.partner).toBeNull();
    expect(junk.partnered).toEqual(['usagi']);
    // Saved by an older version: no partner yet.
    const old = normalize({ v: 1 });
    expect(old.partner).toBeNull();
    expect(old.partnered).toEqual([]);
  });
});
