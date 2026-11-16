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

/** The candidate whose line sounds most like `heard` (a random one among equals), or null if none shares a word. */
export function closest<T extends { line: Line }>(heard: Line, candidates: readonly T[], rand = Math.random): T | null {
  let top = 0;
  let best: T[] = [];
  for (const c of candidates) {
    const score = alike(heard, c.line);
    if (score > top) {
      top = score;
      best = [c];
    } else if (score > 0 && score === top) {
      best.push(c);
    }
  }
  return best.length ? best[Math.floor(rand() * best.length)] : null;
}
