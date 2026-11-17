import { STEP_KINDS, type Step } from './session.ts';
import { isPartner, type PartnerId } from './partners.ts';
import { TOP_BOX, type SkillState } from './schedule.ts';

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
  /** When she last went through each conversation (ms since 1970), so they come round in turn. */
  talked: Record<string, number>;
  /** Today's lesson while it is in progress, so ✕, a reload or a phone call never loses her place. */
  session: SavedSession | null;
  /** Day number of the last backup she made (or restored from); null = never. The Today screen reminds her. */
  backedUp: number | null;
  /** Her own notes, newest first (src/learn/notes.ts). */
  notes: Note[];
  /** Her study partner on stage today, chosen once a day (src/learn/partners.ts); `first`: their first day. */
  partner: { id: PartnerId; day: number; first: boolean } | null;
  /** The partners she has had so far, in the order they first came. */
  partnered: PartnerId[];
  settings: Settings;
}

/** One of her notes (REVIEW section 7): English she wants to keep, and her own Japanese about it. */
export interface Note {
  id: string;
  /** English, usually pasted from a LINE message; '' for a Japanese-only "how do I say…?" note. */
  en: string;
  /** Her own Japanese: the meaning, when to use it, or her question. */
  ja: string;
  /** Other meanings of the same English, each written on its own (2026-11-17): a word can mean several things. */
  more?: string[];
  /** When it was written and last changed (ms since 1970). */
  created: number;
  updated: number;
  /** The notebook phrase it was added from, if any. */
  from?: string;
}

export const NOTE_EN_MAX = 300;
export const NOTE_JA_MAX = 500;
export const NOTES_MAX = 500;
/** How many other meanings one note may have. */
export const NOTE_MORE_MAX = 5;

/** A note's other meanings, tidy: trimmed, none empty, within the limits. */
export const tidyMore = (more: unknown): string[] =>
  (Array.isArray(more) ? more : [])
    .filter((m): m is string => typeof m === 'string')
    .map((m) => m.trim().slice(0, NOTE_JA_MAX))
    .filter(Boolean)
    .slice(0, NOTE_MORE_MAX);

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
  /** A quiz answered right the first time goes on to the next step by itself (2026-11-17). On unless she turns it off. */
  autoNext: boolean;
}

export function emptyProgress(): Progress {
  return {
    v: 1,
    started: null,
    days: [],
    ex: {},
    missedLines: {},
    practiced: {},
    talked: {},
    session: null,
    backedUp: null,
    notes: [],
    partner: null,
    partnered: [],
    settings: {
      allJapanese: false,
      keepReadings: false,
      newPerDay: 2,
      toured: false,
      sound: 'standard',
      autoNext: true,
    },
  };
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);

/** A whole number, or the fallback: what a hand-edited save or backup may hold instead (2.5, Infinity, a string). */
const whole = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x) : fallback);
/** Day numbers that make sense (about 1970 to 2240), so the schedule's sums never leave the numbers it can save. */
const isDay = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < 100_000;
/** How many entries a saved table may have, and how long its names: far more than the app ever writes. */
const MOST_ENTRIES = 3000;
const LONGEST_KEY = 320;
/** A table of numbers by name, without anything else a restored backup may have put there. */
function numbers(raw: unknown): Record<string, number> {
  if (!isObj(raw)) return {};
  const out: Record<string, number> = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || k.length > LONGEST_KEY) continue;
    if (++n > MOST_ENTRIES) break;
    out[k] = v;
  }
  return out;
}

function normalizeSkill(s: unknown): SkillState | undefined {
  if (!isObj(s) || !isDay(s.due) || typeof s.box !== 'number' || !Number.isFinite(s.box)) return undefined;
  const box = Math.min(TOP_BOX, Math.max(1, Math.round(s.box)));
  return {
    box,
    best: Math.min(TOP_BOX, Math.max(whole(s.best, box), box)),
    due: Math.round(s.due),
    last: isDay(s.last) ? Math.round(s.last) : Math.round(s.due),
    reviews: Math.max(0, whole(s.reviews)),
    misses: Math.max(0, whole(s.misses)),
  };
}

/** Far more steps than a lesson ever has (about 60 with its retries, a few hundred at the very most): a saved lesson
 * with more is not one (2026-11-18: a restored backup could hold one of any length). */
const MOST_STEPS = 1000;

/** A saved step: a known shape, with a name of a sensible length. */
const isStep = (x: unknown): x is Step =>
  isObj(x) &&
  typeof x.kind === 'string' &&
  (x.kind === 'talk'
    ? typeof x.talkId === 'string' && x.talkId.length <= LONGEST_KEY
    : typeof x.exId === 'string' && x.exId.length <= LONGEST_KEY);

/** A step with only what a step has, whatever else a restored backup put on it. */
function cleanStep(x: Step): Step {
  switch (x.kind) {
    case 'talk':
      return { kind: 'talk', talkId: x.talkId };
    case 'meet':
      return { kind: 'meet', exId: x.exId };
    case 'answer':
      return { kind: 'answer', exId: x.exId, review: x.review === true };
    case 'catch':
      return {
        kind: 'catch',
        exId: x.exId,
        review: x.review === true,
        ...(x.ask === 'meaning' || x.ask === 'reply' ? { ask: x.ask } : {}),
      };
  }
}

function normalizeSession(s: unknown): SavedSession | null {
  if (!isObj(s) || !isDay(s.day) || typeof s.index !== 'number' || !Array.isArray(s.steps)) return null;
  if (s.steps.length > MOST_STEPS || !s.steps.every(isStep)) return null;
  const all: Step[] = s.steps;
  // A lesson saved by an older version can hold steps the app no longer has (the repeat-after-me step, removed
  // 2026-11-17): they are dropped, and her place and the recorded steps move with the steps that stay. `before[i]`
  // is where step i moves to: the steps kept before it (counted once, 2026-11-18: counting again for every recorded
  // step took seconds with a hand-made one).
  const keep = all.map((x) => STEP_KINDS.includes(x.kind));
  const before: number[] = [];
  let kept = 0;
  for (const k of keep) {
    before.push(kept);
    if (k) kept++;
  }
  before.push(kept);
  const counts = isObj(s.counts) ? s.counts : {};
  const count = (x: unknown) => Math.min(MOST_STEPS, Math.max(0, whole(x)));
  return {
    day: Math.round(s.day),
    steps: all.filter((_, i) => keep[i]).map(cleanStep),
    index: before[Math.max(0, Math.min(whole(s.index), all.length))],
    recorded: Array.isArray(s.recorded)
      ? [...new Set(s.recorded.filter((x): x is number => typeof x === 'number' && keep[x] === true).map((x) => before[x]))]
      : [],
    retried: Array.isArray(s.retried)
      ? [...new Set(s.retried.filter((x): x is string => typeof x === 'string' && x.length <= LONGEST_KEY))].slice(0, MOST_STEPS)
      : [],
    counts: { fresh: count(counts.fresh), reviews: count(counts.reviews), practice: count(counts.practice) },
  };
}

function normalizeNote(n: unknown): Note | null {
  if (!isObj(n) || typeof n.id !== 'string' || !n.id || n.id.length > 60) return null;
  const en = typeof n.en === 'string' ? n.en.slice(0, NOTE_EN_MAX) : '';
  const ja = typeof n.ja === 'string' ? n.ja.slice(0, NOTE_JA_MAX) : '';
  if (!en.trim() && !ja.trim()) return null;
  const created = num(n.created);
  const more = tidyMore(n.more);
  return {
    id: n.id,
    en,
    ja,
    ...(more.length ? { more } : {}),
    created,
    updated: num(n.updated, created),
    ...(typeof n.from === 'string' && n.from.length <= 80 ? { from: n.from } : {}),
  };
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
    for (const [id, e] of Object.entries(raw.ex).slice(0, MOST_ENTRIES)) {
      if (!isObj(e) || !isDay(e.met) || id.length > 80) continue;
      ex[id] = { met: Math.round(e.met), hear: normalizeSkill(e.hear), say: normalizeSkill(e.say) };
    }
  }
  const st = isObj(raw.settings) ? raw.settings : {};
  return {
    v: 1,
    started: isDay(raw.started) ? Math.round(raw.started) : null,
    days: Array.isArray(raw.days) ? [...new Set(raw.days.filter(isDay).map(Math.round))].sort((a, b) => a - b) : [],
    ex,
    missedLines: numbers(raw.missedLines),
    practiced: numbers(raw.practiced),
    talked: numbers(raw.talked),
    session: normalizeSession(raw.session),
    backedUp: isDay(raw.backedUp) ? Math.round(raw.backedUp) : null,
    notes: normalizeNotes(raw.notes),
    partner:
      isObj(raw.partner) && isPartner(raw.partner.id) && isDay(raw.partner.day)
        ? { id: raw.partner.id, day: raw.partner.day, first: raw.partner.first === true }
        : null,
    partnered: Array.isArray(raw.partnered) ? [...new Set(raw.partnered.filter(isPartner))] : [],
    settings: {
      allJapanese: st.allJapanese === true,
      keepReadings: st.keepReadings === true,
      newPerDay: Math.max(1, Math.min(3, Math.round(num(st.newPerDay, base.settings.newPerDay)))),
      toured: st.toured === true,
      sound: st.sound === 'backup' ? 'backup' : 'standard',
      autoNext: st.autoNext !== false,
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
    if (!text) return emptyProgress();
    const raw: unknown = JSON.parse(text);
    // A save this version does not know (a newer format, after a step back to an older version): kept aside like an
    // unreadable one, before the next save writes over it (2026-11-17).
    if (!isObj(raw) || raw.v !== 1) throw new Error('unknown save format');
    return normalize(raw);
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
