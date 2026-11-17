import { NOTE_EN_MAX, NOTE_JA_MAX, NOTES_MAX, tidyMore, type Note, type Progress } from './progress.ts';

/**
 * Her notes (REVIEW section 7), the second shelf of the notebook. She cannot spell English, so the English in a note
 * is usually pasted from a LINE message you sent her; a note may also be Japanese only: a "how do I say…?" question
 * to ask you. A note may hold other meanings of the same English, each written on its own. English you want read
 * in the lessons' voice goes in src/content/notes.ts.
 */

/** Quote marks that may wrap a pasted line, and their closing partners. */
const WRAPS: Record<string, string> = { '"': '"', "'": "'", '「': '」', '『': '』' };

/**
 * Pasted English made tidy: one line, single spaces, straight quotes, and no quote marks around the whole thing
 * (only a real pair: in `"Hi," she said, "bye"` the marks belong to the text).
 */
export function tidyEnglish(text: string): string {
  let t = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  const close = WRAPS[t[0]];
  const inner = t.slice(1, -1);
  if (close && t.length > 1 && t.endsWith(close) && !inner.includes(t[0]) && !inner.includes(close)) t = inner.trim();
  return t.slice(0, NOTE_EN_MAX);
}

/** The same English however it was written: "thank you" and "Thank you!" are one note. */
export const looseEnglish = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function newNote(en: string, ja: string, now: number, from?: string): Note {
  const id = `n${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  return { id, en: tidyEnglish(en), ja: ja.trim().slice(0, NOTE_JA_MAX), created: now, updated: now, ...(from ? { from } : {}) };
}

/** Adds a note (newest first) or replaces the one with its id. False when there is nothing in it, or no room. */
export function putNote(p: Progress, note: Note): boolean {
  const { more: _more, ...rest } = note;
  const more = tidyMore(note.more);
  const clean: Note = { ...rest, en: tidyEnglish(note.en), ja: note.ja.trim().slice(0, NOTE_JA_MAX), ...(more.length ? { more } : {}) };
  if (!clean.en && !clean.ja) return false;
  const at = p.notes.findIndex((n) => n.id === clean.id);
  if (at >= 0) p.notes[at] = clean;
  else if (p.notes.length >= NOTES_MAX) return false;
  else p.notes.unshift(clean);
  return true;
}

export function removeNote(p: Progress, id: string): void {
  p.notes = p.notes.filter((n) => n.id !== id);
}

/**
 * Notes after a restore: the backup's and the phone's together, so restoring an older backup never loses a note
 * written since (the later change of a note wins). Newest first, within the limit.
 */
export function mergeNotes(kept: readonly Note[], restored: readonly Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const n of [...restored, ...kept]) {
    const had = byId.get(n.id);
    if (!had || n.updated > had.updated) byId.set(n.id, n);
  }
  return [...byId.values()].sort((a, b) => b.created - a.created).slice(0, NOTES_MAX);
}

/** The note that already holds this English, if any. */
export function noteFor(p: Progress, en: string): Note | undefined {
  const key = looseEnglish(en);
  return key ? p.notes.find((n) => looseEnglish(n.en) === key) : undefined;
}

