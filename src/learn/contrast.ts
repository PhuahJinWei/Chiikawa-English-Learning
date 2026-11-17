import type { Line } from '../content/types.ts';

/**
 * Contrast pairs (REVIEW 2.4): in "what does it mean?", one wrong choice is the meaning of a line that sounds like the
 * one she heard ("Sorry!" for "Sorry, what?", "Are you tired?" for "Are you OK?", "Let's go!" for "Let's eat!"), so
 * the choice cannot be made from one familiar word: she has to catch the part that differs.
 */

/** The words of an English line, lower case, without punctuation: "Sorry, what?" → sorry, what. */
export const wordsOf = (en: string): string[] =>
  en
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** How alike two lines sound to a beginner: the number of words they share. */
export function alike(a: Line, b: Line): number {
  const mine = new Set(wordsOf(a.en));
  return new Set(wordsOf(b.en).filter((w) => mine.has(w))).size;
}

/**
 * The candidate whose line sounds most like `heard`, or null if none shares a word: the one sharing the most words,
 * then the one nearest in length ("Sorry!" is closer to "Sorry, what?" than to "Sorry, I don't understand.", and
 * "Time to eat!" to "Time to go!" than to "What do you want to eat?"), then a random one among equals.
 */
export function closest<T extends { line: Line }>(heard: Line, candidates: readonly T[], rand = Math.random): T | null {
  const length = wordsOf(heard.en).length;
  let top = 0;
  let gap = Infinity;
  let best: T[] = [];
  for (const c of candidates) {
    const score = alike(heard, c.line);
    if (score === 0) continue;
    const g = Math.abs(wordsOf(c.line.en).length - length);
    if (score > top || (score === top && g < gap)) {
      top = score;
      gap = g;
      best = [c];
    } else if (score === top && g === gap) {
      best.push(c);
    }
  }
  return best.length ? best[Math.floor(rand() * best.length)] : null;
}

/** How many of the phrases coming up next in her path may be a quiz's wrong answers, once those she knows run out. */
export const COMING_SOON = 8;

/**
 * Where a quiz's wrong answers come from, best first: phrases she has learned (in any order), then the next few
 * coming up in her path (in any order), then the rest of the path in its order. So they are at her level: early on, a
 * wrong reply to "This is for you." is "Nice to meet you!", not "I have two younger brothers." (2026-11-17, once all
 * 128 phrases were in the app). `path` is in the order she learns it.
 */
export function quizCandidates<T>(path: readonly T[], learned: (t: T) => boolean, rand = Math.random): T[] {
  const mix = (xs: T[]) => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  };
  const known = path.filter(learned);
  const coming = path.filter((t) => !learned(t));
  return [...mix(known), ...mix(coming.slice(0, COMING_SOON)), ...coming.slice(COMING_SOON)];
}
