// Contrast pairs (REVIEW 2.4): Catch offers, as one wrong meaning, a line that sounds like the one she heard.
import { describe, expect, it } from 'vitest';
import { EXCHANGES, catchLines, exchangeById, nearIds } from '../src/content/index.ts';
import type { Line } from '../src/content/types.ts';
import { COMING_SOON, alike, closest, quizCandidates, wordsOf } from '../src/learn/contrast.ts';

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

  it('among lines sharing as many words, the closest is the nearest in length', () => {
    expect(closest(line('Sorry!'), pool("Sorry, I don't understand.", 'Sorry, what?'))?.line.en).toBe('Sorry, what?');
    expect(closest(line('Time to eat!'), pool('What do you want to eat?', 'Time to go!'))?.line.en).toBe('Time to go!');
  });

  it('picks at random among equally close lines', () => {
    const ties = pool("Let's go!", "Let's eat!");
    expect(closest(line("Let's see!"), ties, () => 0)?.line.en).toBe("Let's go!");
    expect(closest(line("Let's see!"), ties, () => 0.99)?.line.en).toBe("Let's eat!");
  });

  it('in the course, an apology is set against the repair phrase, and calls to eat against calls to go', () => {
    // What Catch chooses from: every other step in the app, except those too close in meaning ("No problem!" also
    // answers "Sorry!", so it is never the wrong answer there).
    const others = (id: string) => {
      const near = nearIds(exchangeById(id)!);
      return EXCHANGES.filter((e) => !near.has(e.id)).flatMap((e) => catchLines(e).map((l) => ({ line: l, id: e.id })));
    };
    const sorry = exchangeById('its-ok')!.heard.find((l) => l.en === 'Sorry!')!;
    expect(closest(sorry, others('its-ok'))?.id).toBe('sorry-what');
    const timeToEat = exchangeById('lets-eat')!.heard.find((l) => l.en === 'Time to eat!')!;
    expect(closest(timeToEat, others('lets-eat'))?.line.en).toBe('Time to go!');
  });
});

describe('wrong answers in the quiz', () => {
  it('come from what she has learned, then the next phrases in her path, then the rest in order', () => {
    const path = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    const r = quizCandidates(path, (x) => x === 'c' || x === 'h', () => 0.5);
    expect(r.slice(0, 2).sort()).toEqual(['c', 'h']);
    expect(r.slice(2, 2 + COMING_SOON).sort()).toEqual(['a', 'b', 'd', 'e', 'f', 'g', 'i', 'j']);
    expect(r.slice(2 + COMING_SOON)).toEqual(['k', 'l']);
  });

  it('early on are the phrases coming up next, not sentences from far along the path', () => {
    // Day 2: "Hi!" and "Sorry, what?" learned, and the quiz asks what she answers to "This is for you.".
    const learned = new Set(['hi', 'sorry-what']);
    const near = nearIds(exchangeById('thank-you')!);
    const replies = EXCHANGES.filter((e) => !near.has(e.id) && e.kind === 'reply');
    const at = new Map(EXCHANGES.map((e, i) => [e.id, i] as const));
    for (const e of quizCandidates(replies, (e) => learned.has(e.id)).slice(0, COMING_SOON)) {
      expect(at.get(e.id)!, e.id).toBeLessThan(20);
    }
  });
});
