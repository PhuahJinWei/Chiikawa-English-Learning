/// <reference types="node" />
// The content checks (PLAN.md sections 4 and 5): how the steps of the path link up, the highlight rules, the quiz
// meanings, readings, the Japanese style, and audio. They run on every step, drafts included, except the audio
// checks, which only apply to finished steps (no audio is made until the content is decided).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLOCKS, keyOf } from '../src/content/blocks.ts';
import { kanaSegments } from '../src/content/kana.ts';
import {
  COURSE, ORDERED, STEPS, UI, VERSATILE, catchLines, exchangeById, kindOf, stepById, stepLines,
} from '../src/content/index.ts';
import { TOPICS } from '../src/content/topics.ts';
import { audioSlug } from '../src/content/audio.ts';
import manifest from '../src/content/audio-manifest.json';
import phonemes from '../src/content/phonemes.json';
import type { Exchange, Line } from '../src/content/types.ts';

/** Lines she hears, with their step: what she hears, and what she may hear back. */
const heardLines = (): { line: Line; exId: string }[] =>
  COURSE.flatMap((e) => [...e.heard, ...e.then].map((line) => ({ line, exId: e.id })));

const hiKeys = (l: Line) => l.parts.filter((p) => p.hi).map((p) => p.key).sort().join('+');
const POSITION = new Map(STEPS.map((s, i) => [s.id, i] as const));
const near = (a: Exchange, b: Exchange) => !!(a.near?.includes(b.id) || b.near?.includes(a.id));
const words = (en: string) => new Set(keyOf(en).replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean));

describe('the path', () => {
  it('has unique, readable step ids and known topics', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    for (const s of STEPS) {
      expect(s.id, s.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(TOPICS[s.topic], `${s.id}: topic ${s.topic}`).toBeTruthy();
    }
  });

  it('every step has what its kind needs', () => {
    for (const s of STEPS) {
      expect((s.hear?.length ?? 0) + (s.say?.length ?? 0), `${s.id} has nothing to hear or say`).toBeGreaterThan(0);
      expect(s.hear?.length ?? 0, `${s.id}: 1 to 3 phrasings`).toBeLessThanOrEqual(3);
      if (kindOf(s) === 'say') expect(s.cue, `${s.id} says something first, so it needs a cue`).toBeTruthy();
      if (s.then?.length) expect(kindOf(s), `${s.id}: what she hears back follows something she says first`).toBe('say');
      expect(s.title.trim().length, s.id).toBeGreaterThan(0);
      expect(s.when.trim().length, s.id).toBeGreaterThan(0);
      for (const l of stepLines(s)) expect(l.ja.trim().length, `${s.id}: "${l.en}"`).toBeGreaterThan(0);
    }
  });

  it('a step is built from an earlier step', () => {
    for (const s of STEPS.filter((s) => s.from)) {
      expect(POSITION.get(s.from!), `${s.id} is built from unknown "${s.from}"`).toBeDefined();
      expect(POSITION.get(s.from!)!, `${s.id} comes before ${s.from}`).toBeLessThan(POSITION.get(s.id)!);
    }
  });

  it('a step built from another reuses its words and adds at most two new word blocks', () => {
    const known = new Set<string>();
    for (const s of STEPS) {
      const blocks = new Set(stepLines(s).flatMap((l) => l.parts.map((p) => keyOf(p.key.split('@')[0]))));
      if (s.from) {
        const base = STEPS[POSITION.get(s.from)!];
        const baseWords = new Set(stepLines(base).flatMap((l) => [...words(l.en)]));
        const shared = stepLines(s).flatMap((l) => [...words(l.en)]).filter((w) => baseWords.has(w));
        expect(shared.length, `${s.id} shares no word with ${s.from}`).toBeGreaterThan(0);
        const fresh = [...blocks].filter((b) => !known.has(b));
        expect(fresh.length, `${s.id} brings ${fresh.length} new blocks: ${fresh.join(', ')}`).toBeLessThanOrEqual(2);
      }
      for (const b of blocks) known.add(b);
    }
  });

  it('"near" names real steps, and replies listed as also fitting are real replies', () => {
    const replies = new Set(STEPS.flatMap((s) => (s.say ?? []).map((l) => l.en)));
    for (const s of STEPS) {
      for (const id of s.near ?? []) expect(stepById(id), `${s.id} near ${id}`).toBeTruthy();
      for (const en of s.fits ?? []) expect(replies.has(en), `${s.id} fits "${en}"`).toBe(true);
    }
  });

  it('the same sentence said by the same person always has the same meaning (except replies like "OK!")', () => {
    const seen = new Map<string, { ja: string; id: string }>();
    for (const s of STEPS) {
      const lines = [
        ...[...(s.hear ?? []), ...(s.then ?? [])].map((l) => ({ l, who: 'they' })),
        ...(s.say ?? []).map((l) => ({ l, who: 'she' })),
      ];
      for (const { l, who } of lines) {
        // "OK!" is 大丈夫です after "Are you OK?" but いいよ after "Ready?": these depend on the question.
        if (VERSATILE.has(l.en)) continue;
        const k = `${who}:${keyOf(l.en)}`;
        const prev = seen.get(k);
        if (prev && prev.ja !== l.ja) throw new Error(`"${l.en}" (${who}) means "${prev.ja}" in ${prev.id} but "${l.ja}" in ${s.id}`);
        seen.set(k, { ja: l.ja, id: s.id });
      }
    }
  });

  it('every finished step is taught in the app, and no draft is', () => {
    const taught = new Set(ORDERED.map((e) => e.id));
    for (const e of COURSE) {
      if (!e.status) expect(taught.has(e.id), `${e.id} is finished but not in the app (missing audio?)`).toBe(true);
      if (e.status === 'draft') expect(taught.has(e.id), `${e.id} is a draft`).toBe(false);
    }
  });
});

describe('highlights', () => {
  it('every line she hears has 1 to 3 highlights, and only 3 when a "not" or a choice is involved', () => {
    for (const { line } of heardLines()) {
      const hi = line.parts.filter((p) => p.hi);
      const topics = line.parts.filter((p) => p.topic).length;
      const hasNot = line.parts.some((p) => BLOCKS.get(p.key)!.kind === 'not');
      const max = hasNot || topics >= 2 ? 3 : 2;
      expect(hi.length, `"${line.en}" has ${hi.length} highlights`).toBeGreaterThanOrEqual(1);
      expect(hi.length, `"${line.en}" has too many highlights`).toBeLessThanOrEqual(max);
    }
  });

  it('openers and tags are never highlighted', () => {
    for (const { line } of heardLines()) {
      for (const p of line.parts) {
        const kind = BLOCKS.get(p.key)!.kind;
        if (kind === 'opener' || kind === 'tag') expect(p.hi, `"${p.text}" in "${line.en}" is a ${kind}`).toBe(false);
      }
    }
  });

  it('lines she says are never highlighted', () => {
    for (const e of COURSE) for (const l of e.short) expect(l.parts.some((p) => p.hi), `"${l.en}"`).toBe(false);
    for (const u of Object.values(UI)) expect(u.line.parts.some((p) => p.hi), `"${u.line.en}"`).toBe(false);
  });

  it('two different sentences never share the same highlighted blocks (unless heard as one question)', () => {
    // Phrasings heard together in a step are one question ("This is for you." / "For you!"), wherever it comes up.
    const group = new Map<string, string>();
    const root = (k: string): string => (group.get(k) === k || !group.has(k) ? k : root(group.get(k)!));
    for (const e of COURSE) {
      const keys = e.heard.map((l) => keyOf(l.en));
      for (const k of keys) if (!group.has(k)) group.set(k, k);
      for (const k of keys.slice(1)) group.set(root(k), root(keys[0]));
    }
    const seen = new Map<string, { exId: string; en: string }>();
    for (const { line, exId } of heardLines()) {
      const k = hiKeys(line);
      const other = seen.get(k);
      if (other && other.exId !== exId && root(keyOf(other.en)) !== root(keyOf(line.en))) {
        throw new Error(`"${line.en}" (${exId}) and "${other.en}" (${other.exId}) highlight the same blocks: ${k}`);
      }
      seen.set(k, { exId, en: line.en });
    }
  });
});

describe('the meaning quiz (Catch)', () => {
  it('never offers two meanings that are the same, or one sentence with two meanings', () => {
    const lines = COURSE.flatMap((e) => catchLines(e).map((l) => ({ e, l })));
    for (const a of lines) {
      for (const b of lines) {
        if (a.e === b.e || near(a.e, b.e)) continue;
        const same = keyOf(a.l.en) === keyOf(b.l.en);
        if (same !== (a.l.ja === b.l.ja)) {
          throw new Error(`${a.e.id} "${a.l.en}" (${a.l.ja}) and ${b.e.id} "${b.l.en}" (${b.l.ja}): mark them near, or change one`);
        }
      }
    }
  });
});

/** Every Svelte and TypeScript file of the app, as text. */
function appSource(dir = 'src/app'): string {
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .map((p) => (statSync(p).isDirectory() ? appSource(p) : /\.(svelte|ts)$/.test(p) ? readFileSync(p, 'utf8') : ''))
    .join('\n');
}

describe('app words', () => {
  it('only switch to English after steps the app teaches', () => {
    for (const [key, t] of Object.entries(UI)) {
      expect(t.needs.length, key).toBeGreaterThan(0);
      for (const id of t.needs) expect(exchangeById(id), `${key} needs ${id}`).toBeTruthy();
    }
  });

  it('are all used somewhere in the app (none taught for nothing)', () => {
    const src = appSource();
    for (const key of Object.keys(UI)) expect(src.includes(`UI.${key}`), `UI.${key} is never shown`).toBe(true);
  });
});

describe('readings (REVIEW 3.8)', () => {
  const PH = phonemes as Record<string, string>;
  /** Syllables in the voice's own phonemes: one per vowel sound ("aɪ" in "idea" is one). */
  const syllables = (ph: string) => (ph.match(/[aeiouæɑɐɒɔəɚɛɜɪʊʌ]+/g) ?? []).length;

  it('use only katakana, spaces and the two marks', () => {
    for (const [key, b] of BLOCKS) expect(b.kana, key).toMatch(/^[゠-ヿ ー[\]]+$/);
  });

  it('mark the stressed beat of every block with more than one syllable, and only those (never an opener)', () => {
    for (const [key, b] of BLOCKS) {
      const ph = PH[keyOf(b.en)];
      expect(ph, `${key} has no phonemes: run node tools/audio/phonemes.mjs`).toBeTruthy();
      const stressed = kanaSegments(b.kana).filter((s) => s.stress).length;
      const want = b.kind === 'opener' || syllables(ph) < 2 ? 0 : 1;
      expect(stressed, `${key}: "${b.kana}" (${ph}, ${syllables(ph)} syllables)`).toBe(want);
    }
  });

  it('every block is used in some step (none left over)', () => {
    const used = new Set(COURSE.flatMap((e) => [...e.heard, ...e.short, ...e.then]).flatMap((l) => l.parts.map((p) => p.key)));
    for (const u of Object.values(UI)) for (const p of u.line.parts) used.add(p.key);
    for (const key of BLOCKS.keys()) expect(used.has(key), `block "${key}" is never used`).toBe(true);
  });
});

describe('Japanese is written as adults write it (REVIEW 3.1)', () => {
  /** Two Japanese characters with a space between them: the spaced-out style of a children's book. */
  const SPACED = /[぀-ヿ一-鿿][ 　]+[぀-ヿ一-鿿]/;

  it('in the steps, blocks, topics and app words', () => {
    const texts = [
      ...STEPS.flatMap((s) => [s.title, s.when, s.cue ?? '', ...stepLines(s).map((l) => l.ja)]),
      ...[...BLOCKS.values()].flatMap((b) => [b.ja, b.note ?? '']),
      ...Object.values(TOPICS).map((t) => t.title),
      ...Object.values(UI).map((u) => u.ja),
    ];
    for (const t of texts) expect(t).not.toMatch(SPACED);
  });

  it('on every screen', () => {
    for (const line of appSource().split('\n')) {
      if (/^\s*(\/\/|\*|\/\*\*)/.test(line)) continue;
      expect(line.trim()).not.toMatch(SPACED);
    }
  });
});

describe('audio (only finished steps have it: run tools/audio/make-audio.mjs once the content is decided)', () => {
  type Clip = { text: string };
  const clips = (manifest as unknown as { clips: Record<string, Clip> }).clips;

  it('every finished step has audio for every line and block', () => {
    for (const e of COURSE.filter((e) => !e.status)) {
      for (const l of [...e.heard, ...e.short, ...e.then]) {
        expect(clips[audioSlug(l.en)], `${e.id}: "${l.en}"`).toBeTruthy();
        for (const p of l.parts) expect(clips[audioSlug(p.text)], `${e.id}: block "${p.text}"`).toBeTruthy();
      }
    }
  });

  it('every app word has audio', () => {
    for (const u of Object.values(UI)) {
      expect(clips[audioSlug(u.line.en)], `"${u.line.en}"`).toBeTruthy();
      for (const p of u.line.parts) expect(clips[audioSlug(p.text)], `block "${p.text}"`).toBeTruthy();
    }
  });

  it('every clip in the list is really in public/audio', () => {
    for (const id of Object.keys(clips)) expect(existsSync(`public/audio/${id}.mp3`), id).toBe(true);
  });

  it('there is one voice at natural speed only (no slow versions)', () => {
    const settings = (manifest as { settings: { voice: string; speed: number } }).settings;
    expect(settings).toMatchObject({ voice: 'af_heart', speed: 1 });
    expect(Object.keys(clips).some((id) => id.includes('/'))).toBe(false);
  });
});
