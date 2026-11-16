import { STEP_KINDS, type Step } from './session.ts';
import type { SkillState } from './schedule.ts';

/** Everything saved on the phone. Nothing is sent anywhere. */
export interface Progress {
  v: 1;
  /** Day number of the first lesson (null before it). */
  started: number | null;
  /** Day numbers on which she finished the daily lesson. */
  days: number[];
  ex: Record<string, ExchangeProgress>;
  /** Heard lines she missed in Catch, by English text: shown in the progress summary she shares. */
  missedLines: Record<string, number>;
  /** When each exchange was last practised outside the schedule (ms since 1970), so practice rotates fairly. */
  practiced: Record<string, number>;
  /** Today's lesson while it is in progress, so ✕, a reload or a phone call never loses her place. */
  session: SavedSession | null;
  /** Day number of the last backup she made (or restored from); null = never. The Today screen reminds her. */
  backedUp: number | null;
  /** Her own notes, newest first (src/learn/notes.ts). */
  notes: Note[];
  settings: Settings;
}

/** One of her notes (REVIEW section 7): English she wants to keep, and her own Japanese about it. */
export interface Note {
  id: string;
  /** English, usually pasted from a LINE message; '' for a Japanese-only "how do I say…?" note. */
  en: string;
  /** Her own Japanese: the meaning, when to use it, or her question. */
  ja: string;
  /** When it was written and last changed (ms since 1970). */
  created: number;
  updated: number;
  /** The notebook phrase it was added from, if any. */
  from?: string;
}

export const NOTE_EN_MAX = 300;
export const NOTE_JA_MAX = 500;
export const NOTES_MAX = 500;

export interface ExchangeProgress {
  /** Day number she met it. */
  met: number;
  hear?: SkillState;
  say?: SkillState;
}

export interface SavedSession {
  /** The day the lesson was planned for. A lesson from an earlier day is never resumed (REVIEW 2.11). */
  day: number;
  steps: Step[];
  index: number;
  /** Indexes of steps whose result is recorded: going back and redoing a step never records it twice. */
  recorded: number[];
  /** "catch:are-you-ok" keys already given their one retry at the end. */
  retried: string[];
  counts: { fresh: number; reviews: number; practice: number };
}

export interface Settings {
  /** Brings all the Japanese back (PLAN.md section 3, safety nets). */
  allJapanese: boolean;
  /** Keeps the katakana readings on for good. */
  keepReadings: boolean;
  /** New exchanges per day (counted per day, not per lesson). 1 to 3. */
  newPerDay: number;
  /** The first-run tour has been seen. */
  toured: boolean;
  /** How sound is played (src/app/audio.svelte.ts): 'backup' is for phones where the standard way stays silent. */
  sound: 'standard' | 'backup';
}

export function emptyProgress(): Progress {
  return {
    v: 1,
    started: null,
    days: [],
    ex: {},
    missedLines: {},
    practiced: {},
    session: null,
    backedUp: null,
    notes: [],
    settings: {
      allJapanese: false,
      keepReadings: false,
      newPerDay: 2,
      toured: false,
      sound: 'standard',
    },
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);

function normalizeSkill(s: unknown): SkillState | undefined {
  if (!isObj(s) || typeof s.box !== 'number' || typeof s.due !== 'number') return undefined;
  return {
    box: s.box,
    best: Math.max(num(s.best, s.box), s.box),
    due: s.due,
    last: num(s.last, s.due),
    reviews: num(s.reviews),
    misses: num(s.misses),
  };
}

function normalizeSession(s: unknown): SavedSession | null {
  if (!isObj(s) || typeof s.day !== 'number' || typeof s.index !== 'number' || !Array.isArray(s.steps)) return null;
  const all = s.steps.filter((x): x is Step => isObj(x) && typeof x.kind === 'string' && typeof x.exId === 'string');
  if (all.length !== s.steps.length) return null;
  // A lesson saved by an older version can hold steps the app no longer has (the repeat-after-me step, removed
  // 2026-11-17): they are dropped, and her place and the recorded steps move with the steps that stay.
  const keep = all.map((x) => STEP_KINDS.includes(x.kind));
  const steps = all.filter((_, i) => keep[i]);
  const moved = (i: number) => keep.slice(0, i).filter(Boolean).length;
  const counts = isObj(s.counts) ? s.counts : {};
  return {
    day: s.day,
    steps,
    index: moved(Math.max(0, Math.min(s.index, all.length))),
    recorded: Array.isArray(s.recorded)
      ? s.recorded.filter((x): x is number => typeof x === 'number' && keep[x] === true).map(moved)
      : [],
    retried: Array.isArray(s.retried) ? s.retried.filter((x): x is string => typeof x === 'string') : [],
    counts: { fresh: num(counts.fresh), reviews: num(counts.reviews), practice: num(counts.practice) },
  };
}

function normalizeNote(n: unknown): Note | null {
  if (!isObj(n) || typeof n.id !== 'string' || !n.id) return null;
  const en = typeof n.en === 'string' ? n.en.slice(0, NOTE_EN_MAX) : '';
  const ja = typeof n.ja === 'string' ? n.ja.slice(0, NOTE_JA_MAX) : '';
  if (!en.trim() && !ja.trim()) return null;
  const created = num(n.created);
  return { id: n.id, en, ja, created, updated: num(n.updated, created), ...(typeof n.from === 'string' ? { from: n.from } : {}) };
}

function normalizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Note[] = [];
  for (const n of raw.map(normalizeNote)) {
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  return out.slice(0, NOTES_MAX);
}

/** Accepts anything that looks like saved progress, filling gaps with defaults (for old saves and restores). */
export function normalize(raw: unknown): Progress {
  const base = emptyProgress();
  if (!isObj(raw) || raw.v !== 1) return base;
  const ex: Record<string, ExchangeProgress> = {};
  if (isObj(raw.ex)) {
    for (const [id, e] of Object.entries(raw.ex)) {
      if (!isObj(e) || typeof e.met !== 'number') continue;
      ex[id] = { met: e.met, hear: normalizeSkill(e.hear), say: normalizeSkill(e.say) };
    }
  }
  const st = isObj(raw.settings) ? raw.settings : {};
  return {
    v: 1,
    started: typeof raw.started === 'number' ? raw.started : null,
    days: Array.isArray(raw.days) ? raw.days.filter((d): d is number => typeof d === 'number') : [],
    ex,
    missedLines: isObj(raw.missedLines) ? (raw.missedLines as Record<string, number>) : {},
    practiced: isObj(raw.practiced) ? (raw.practiced as Record<string, number>) : {},
    session: normalizeSession(raw.session),
    backedUp: typeof raw.backedUp === 'number' ? raw.backedUp : null,
    notes: normalizeNotes(raw.notes),
    settings: {
      allJapanese: st.allJapanese === true,
      keepReadings: st.keepReadings === true,
      newPerDay: Math.max(1, Math.min(3, Math.round(num(st.newPerDay, base.settings.newPerDay)))),
      toured: st.toured === true,
      sound: st.sound === 'backup' ? 'backup' : 'standard',
    },
  };
}

const KEY = 'eigo-friends/progress/v1';
const UNREADABLE = `${KEY}/unreadable`;

/** The copy of a save that could not be read, if there is one (the self-check can send it for rescue). */
export function unreadableCopy(): string | null {
  try {
    return localStorage.getItem(UNREADABLE);
  } catch {
    return null;
  }
}

/** Storage that may be missing or throw (private mode, blocked data): progress then lives for the session only. */
export function loadProgress(): Progress {
  let text: string | null = null;
  try {
    text = localStorage.getItem(KEY);
    return text ? normalize(JSON.parse(text)) : emptyProgress();
  } catch {
    // Unreadable: keep a copy before the next save overwrites it, so it can still be rescued by hand.
    try {
      if (text) localStorage.setItem(UNREADABLE, text);
    } catch {
      // nothing more to do
    }
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

/** Asks the browser not to clear saved data when space runs low. Home-screen apps on iPhone usually get it. */
export async function askToKeepData(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
