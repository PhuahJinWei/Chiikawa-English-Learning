import { allLines } from '../content/index.ts';
import type { Line } from '../content/types.ts';
import { looseEnglish } from '../learn/notes.ts';
import { clauses, joinClauses, kanaFromPhonemes, markAfter } from '../learn/reading.ts';

/**
 * Katakana readings for her notes. English that is a lesson line keeps its hand-made reading; any other English gets
 * one made on the phone: the pronunciation engine (espeak-ng, about 1.3 MB) writes its sounds, and
 * src/learn/reading.ts turns them into katakana. The engine is loaded the first time a note needs it, and is kept
 * offline with the rest of the app.
 */

type Phonemize = (text: string, language?: string) => Promise<string[]>;

let lessons: Map<string, Line> | null = null;

/** The lesson line with this English, however it is written ("thank you" finds "Thank you!"). */
function lessonLine(en: string): Line | undefined {
  if (!lessons) {
    lessons = new Map();
    for (const l of allLines()) {
      const key = looseEnglish(l.en);
      if (key && !lessons.has(key)) lessons.set(key, l);
    }
  }
  return lessons.get(looseEnglish(en));
}

/** The hand-made reading when her English is a lesson line, with her own punctuation at the end. */
function lessonReading(en: string): string | null {
  const line = lessonLine(en);
  if (!line) return null;
  const last = line.parts.length - 1;
  return joinClauses(line.parts.map((p, i) => ({ kana: p.kana, mark: i < last ? markAfter(p.text) : markAfter(en, true) })));
}

/** True when the reading is the hand-made one of a lesson line, not one made on the phone. */
export const handMade = (en: string): boolean => !!en.trim() && !!lessonLine(en.trim());

let engine: Promise<Phonemize> | null = null;
function load(): Promise<Phonemize> {
  engine ??= import('phonemizer').then(
    (m) => m.phonemize,
    (e: unknown) => {
      engine = null; // offline before the app was kept: the next note tries again
      throw e;
    },
  );
  return engine;
}

const made = new Map<string, string>();
const making = new Map<string, Promise<string>>();

async function make(text: string): Promise<string> {
  const lesson = lessonReading(text);
  if (lesson !== null) return lesson;
  const parts = clauses(text);
  if (!parts.length) return '';
  const phonemize = await load();
  const out: { kana: string; mark: string }[] = [];
  for (const c of parts) out.push({ kana: kanaFromPhonemes((await phonemize(c.text, 'en-us')).join(' ')), mark: c.mark });
  return joinClauses(out);
}

/** The reading if it is ready, without waiting, so a list shows the readings it has already made at once. */
export function readyReading(en: string): string | undefined {
  const text = en.trim();
  return made.get(text) ?? lessonReading(text) ?? (text ? undefined : '');
}

/** The katakana reading of her English, with [ ] around strong beats; '' when there is none to give. */
export function readingOf(en: string): Promise<string> {
  const text = en.trim();
  const ready = readyReading(text);
  if (ready !== undefined) return Promise.resolve(ready);
  let p = making.get(text);
  if (!p) {
    p = make(text).then(
      (kana) => {
        made.set(text, kana);
        making.delete(text);
        return kana;
      },
      () => {
        making.delete(text);
        return '';
      },
    );
    making.set(text, p);
  }
  return p;
}
