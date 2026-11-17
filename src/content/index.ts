import manifest from './audio-manifest.json' with { type: 'json' };
import { audioSlug } from './audio.ts';
import { keyOf } from './blocks.ts';
import { PART1 } from './course/part1.ts';
import { PART2 } from './course/part2.ts';
import { PART3 } from './course/part3.ts';
import { PART4 } from './course/part4.ts';
import { PART5 } from './course/part5.ts';
import { PART6 } from './course/part6.ts';
import { ORDER } from './course/order.ts';
import { TALK_DEFS } from './talks.ts';
import { TOPICS } from './topics.ts';
import { UI } from './ui.ts';
import type { Act, Exchange, ExchangeKind, Line, StepDef, Talk, TalkDef, Topic } from './types.ts';

/**
 * The course is one learning path, in the order of src/content/course/order.ts; the steps are written in part1.ts to part6.ts. Each step is one
 * thing she learns. This module turns the steps into what the app uses; the checks in tests/content.test.ts make sure
 * they link up, and tools/sheet/make-sheet.mjs shows them as a sheet for review.
 */
/** Every step as written, in the files' order (the checks use this to find steps missing from the order). */
export const WRITTEN: readonly StepDef[] = [...PART1, ...PART2, ...PART3, ...PART4, ...PART5, ...PART6];

// The path follows course/order.ts. A step missing from the order still comes at the end, so nothing is ever lost;
// the checks name it.
const WRITTEN_BY_ID = new Map(WRITTEN.map((s) => [s.id, s] as const));
const ordered = ORDER.flatMap((id) => WRITTEN_BY_ID.get(id) ?? []);
export const STEPS: readonly StepDef[] = [...ordered, ...WRITTEN.filter((s) => !ordered.includes(s))];

const CLIPS = (manifest as { clips: Record<string, unknown> }).clips;
const hasClip = (text: string) => Object.hasOwn(CLIPS, audioSlug(text));

/** Every line of a step: what she hears, what she says, and what she may hear back. */
export const stepLines = (s: Pick<StepDef, 'hear' | 'say' | 'then'>): Line[] => [
  ...(s.hear ?? []),
  ...(s.say ?? []),
  ...(s.then ?? []),
];

/** The same sentence, whatever its punctuation or capitals: "I'm hungry." and "I'm hungry!" */
export const sameSentence = (a: string, b: string): boolean => keyOf(a) === keyOf(b);

/** Replies that fit so many questions ("OK!", "Yes.") that the quiz never offers them as a wrong answer. */
export const VERSATILE: ReadonlySet<string> = new Set([
  'OK!', 'Yes.', 'No.', 'Thank you!', 'A little.', "I'm OK.", "It's OK.", 'Not yet.', "I don't know.",
]);

export const kindOf = (s: StepDef): ExchangeKind =>
  s.hear?.length && s.say?.length ? 'reply' : s.say?.length ? 'say' : 'understand';

// Her replies to each line she hears, across the whole path: replies to the same line are fine answers in each
// other's steps ("Are you OK?" → "OK!" in one step, "I'm OK." in another).
const repliesTo = new Map<string, Set<string>>();
for (const s of STEPS) {
  if (kindOf(s) !== 'reply') continue;
  for (const h of s.hear!) {
    const set = repliesTo.get(keyOf(h.en)) ?? new Set<string>();
    for (const r of s.say!) set.add(r.en);
    repliesTo.set(keyOf(h.en), set);
  }
}

const CALM_REPLY: Act = { who: 'chiikawa', gesture: 'nod', face: 'smile' };

function defaultHeard(s: StepDef, topic: Topic): Act[] {
  if (!s.hear?.length) return [{ who: 'chiikawa', face: 'determined' }];
  const friend = topic.cast.length > 2 ? topic.cast[1] : 'hachiware';
  return [{ who: friend, ...(s.hear[0].en.trim().endsWith('?') ? { mark: 'question' as const } : {}) }];
}

function compile(s: StepDef): Exchange {
  const kind = kindOf(s);
  const topic = TOPICS[s.topic];
  const heard = s.hear ?? [];
  const short = s.say ?? [];
  const own = new Set(short.map((l) => l.en));
  const shared = kind === 'reply' ? heard.flatMap((h) => [...(repliesTo.get(keyOf(h.en)) ?? [])]) : [];
  const fits = [...new Set([...(s.fits ?? []), ...shared])].filter((en) => !own.has(en));
  const near = [...(s.near ?? [])];
  return {
    id: s.id,
    kind,
    topic: s.topic,
    host: 'hachiware',
    cast: topic.cast,
    title: s.title,
    when: s.when,
    cue: s.cue,
    near: near.length ? near : undefined,
    fits: fits.length ? fits : undefined,
    heard,
    short,
    then: s.then ?? [],
    from: s.from,
    status: s.status,
    voiced: stepLines(s).every((l) => hasClip(l.en) && l.parts.every((p) => hasClip(p.text))),
    scene: {
      heard: s.scene?.heard ?? defaultHeard(s, topic),
      replies: s.scene?.replies ?? short.map(() => [CALM_REPLY]),
    },
  };
}

/** The whole path as the app would use it, drafts included: for the content sheet and the checks. */
export const COURSE: readonly Exchange[] = STEPS.map(compile);

// Steps that ask the same sentence are never each other's wrong answers in the meaning quiz: both meanings would be
// right. That is a step built from one with the same sentence in it (she heard it there, she says it here), and two
// answers to the same line ("Sorry!" → "It's OK." or "No problem!"; "How many?" → one to three, four to six…).
{
  const asking = new Map<string, Set<Exchange>>();
  for (const e of COURSE) {
    for (const l of catchLines(e)) asking.set(keyOf(l.en), (asking.get(keyOf(l.en)) ?? new Set()).add(e));
  }
  for (const same of asking.values()) {
    for (const e of same) {
      const others = [...same].filter((o) => o !== e).map((o) => o.id);
      if (others.length) e.near = [...new Set([...(e.near ?? []), ...others])];
    }
  }
}

// A step whose quiz lines are its base's (a longer answer to the same question) is also too close to whatever its
// base is too close to: "Thank you so much!" hears "This is for you." just like "Thank you!" does.
{
  const byId = new Map(COURSE.map((e) => [e.id, e] as const));
  const nearOf = (id: string) => [
    ...(byId.get(id)?.near ?? []),
    ...COURSE.filter((e) => e.near?.includes(id)).map((e) => e.id),
  ];
  for (const e of COURSE) {
    const base = e.from ? byId.get(e.from) : undefined;
    if (!base || !e.near?.includes(base.id)) continue;
    const inherited = nearOf(base.id).filter((id) => id !== e.id);
    if (inherited.length) e.near = [...new Set([...e.near, ...inherited])];
  }
}

/** What the app teaches, in teaching order: steps that are not drafts and whose every line has its audio. */
export const ORDERED: readonly Exchange[] = COURSE.filter((e) => e.status !== 'draft' && e.voiced);
export const EXCHANGES: readonly Exchange[] = ORDERED;

const BY_ID = new Map(ORDERED.map((e) => [e.id, e] as const));
const COURSE_BY_ID = new Map(COURSE.map((e) => [e.id, e] as const));

/** A step the app teaches. */
export function exchangeById(id: string): Exchange | undefined {
  return BY_ID.get(id);
}

/** The steps too close to this one in meaning to be its wrong answers in the quiz, itself included. */
export function nearIds(ex: Exchange): Set<string> {
  return new Set([ex.id, ...(ex.near ?? []), ...EXCHANGES.filter((e) => e.near?.includes(ex.id)).map((e) => e.id)]);
}

/** Any step of the path, drafts included. */
export function stepById(id: string): Exchange | undefined {
  return COURSE_BY_ID.get(id);
}

/** The notebook's shelves: one per topic, with the steps the app teaches. */
export const SHELVES: readonly { topic: Topic; exchanges: Exchange[] }[] = Object.values(TOPICS)
  .map((topic) => ({ topic, exchanges: ORDERED.filter((e) => e.topic === topic.id) }))
  .filter((s) => s.exchanges.length > 0);

/**
 * A conversation's lines, found in their steps (`them` among the lines she hears, `me` among those she says), with
 * what the friends do: the other person's lines are acted by the topic's friend (or Hachiware), hers by her partner.
 * Null when a line is not where the conversation says it is (tests/talks.test.ts names it).
 */
function compileTalk(t: TalkDef): Talk | null {
  const cast = TOPICS[t.topic].cast;
  const speaker = cast.length > 2 ? cast[1] : 'hachiware';
  const turns: Talk['turns'] = [];
  for (const turn of t.turns) {
    const e = COURSE_BY_ID.get(turn.step);
    if (!e) return null;
    const pool = turn.who === 'me' ? e.short : [...e.heard, ...e.then, ...(e.kind === 'say' ? e.short : [])];
    const found = pool.find((l) => l.en === turn.en);
    if (!found) return null;
    const line = turn.ja ? { ...found, ja: turn.ja } : found;
    const acts =
      turn.who === 'me'
        ? (e.scene.replies?.[e.short.indexOf(found)] ?? [CALM_REPLY])
        : (e.scene.heard ?? []).map((a) => (a.who === 'chiikawa' ? a : { ...a, who: speaker }));
    turns.push({ who: turn.who, step: e.id, line, acts });
  }
  const steps = [...new Set(turns.map((x) => x.step))];
  const saySteps = [...new Set(turns.filter((x) => x.who === 'me').map((x) => x.step))];
  return { id: t.id, topic: t.topic, status: t.status, title: t.title, cue: t.cue, cast, turns, steps, saySteps };
}

/** Every conversation as written, null where a line cannot be found (for the checks and the content sheet). */
export const TALKS_WRITTEN: readonly { def: TalkDef; talk: Talk | null }[] = TALK_DEFS.map((def) => ({ def, talk: compileTalk(def) }));

/** The conversations the app uses: not drafts, every line found, and made only of steps the app teaches. */
export const TALKS: readonly Talk[] = TALKS_WRITTEN.flatMap(({ talk }) =>
  talk && talk.status !== 'draft' && talk.steps.every((id) => BY_ID.has(id)) ? [talk] : [],
);

const TALK_BY_ID = new Map(TALKS.map((t) => [t.id, t] as const));

/** A conversation the app uses. */
export function talkById(id: string): Talk | undefined {
  return TALK_BY_ID.get(id);
}

/** What to call what she says: an answer (答え) to what she heard, or for a 'say' phrase ("Sorry, what?") a way to
 * say it (言い方), since it answers nothing. */
export const replyWord = (ex: Exchange): '答え' | '言い方' => (ex.kind === 'say' ? '言い方' : '答え');

/** What she hears in Catch: the heard lines, or for a 'say' exchange, the phrase itself said by someone else. */
export function catchLines(ex: Exchange): Line[] {
  return ex.kind === 'say' ? ex.short : ex.heard;
}

const linesOf = (e: Exchange): Line[] => [...e.heard, ...e.short, ...e.then];

/** Lines that get audio (tools/audio/make-audio.mjs): every step that is not a draft, and the app's own words. */
export function allLines(): Line[] {
  return [...COURSE.filter((e) => e.status !== 'draft').flatMap(linesOf), ...Object.values(UI).map((u) => u.line)];
}

/** Every line of the path, drafts included: audio already made for a line is never deleted while a step uses it. */
export function courseLines(): Line[] {
  return [...COURSE.flatMap(linesOf), ...Object.values(UI).map((u) => u.line)];
}

export { TOPICS } from './topics.ts';
export { UI } from './ui.ts';
export type { UiKey, UiText } from './ui.ts';
export type * from './types.ts';
