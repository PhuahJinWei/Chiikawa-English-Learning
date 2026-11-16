// Contrast pairs (REVIEW 2.4): Catch offers, as one wrong meaning, a line that sounds like the one she heard.
import { describe, expect, it } from 'vitest';
import { EXCHANGES, catchLines, exchangeById } from '../src/content/index.ts';
import type { Line } from '../src/content/types.ts';
import { alike, closest, wordsOf } from '../src/learn/contrast.ts';

const line = (en: string): Line => ({ en, ja: en, parts: [], role: 'heard' });
const pool = (...ens: string[]) => ens.map((en) => ({ line: line(en) }));

describe('lines that sound alike', () => {
  it('are compared word by word, ignoring case and punctuation', () => {
    expect(wordsOf('Sorry, what?')).toEqual(['sorry', 'what']);
    expect(wordsOf("Let's eat!")).toEqual(["let's", 'eat']);
    expect(alike(line('Sorry!'), line('Sorry, what?'))).toBe(1);
    expect(alike(line('Are you OK?'), line('Are you tired?'))).toBe(2);
    expect(alike(line('Hi!'), line('Bye!'))).toBe(0);
  });

  it('the closest shares the most words, and there is none when nothing is shared', () => {
    expect(closest(line('Are you OK?'), pool('Thank you!', 'Are you tired?', 'Hi!'))?.line.en).toBe('Are you tired?');
    expect(closest(line('Hi!'), pool('Bye!', 'Good night!'))).toBeNull();
  });

  it('picks at random among equally close lines', () => {
    const ties = pool("Let's go!", "Let's eat!");
    expect(closest(line("Let's see!"), ties, () => 0)?.line.en).toBe("Let's go!");
    expect(closest(line("Let's see!"), ties, () => 0.99)?.line.en).toBe("Let's eat!");
  });

  it('in the course, an apology is set against the repair phrase, and calls to eat against calls to go', () => {
    const others = (id: string) =>
      EXCHANGES.filter((e) => e.id !== id).flatMap((e) => catchLines(e).map((l) => ({ line: l, id: e.id })));
    const sorry = exchangeById('its-ok')!.heard.find((l) => l.en === 'Sorry!')!;
    expect(closest(sorry, others('its-ok'))?.id).toBe('sorry-what');
    const timeToEat = exchangeById('lets-eat')!.heard.find((l) => l.en === 'Time to eat!')!;
    expect(closest(timeToEat, others('lets-eat'))?.line.en).toBe('Time to go!');
  });
});
