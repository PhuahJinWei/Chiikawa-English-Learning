import manifest from './audio-manifest.json' with { type: 'json' };
import { audioSlug } from './audio.ts';
import { keyOf } from './blocks.ts';
import { PART1 } from './course/part1.ts';
import { PART2 } from './course/part2.ts';
import { TOPICS } from './topics.ts';
import { UI } from './ui.ts';
import type { Act, Exchange, ExchangeKind, Line, StepDef, Topic } from './types.ts';

/**
 * The course is one learning path, in teaching order: src/content/course/part1.ts, then part2.ts. Each step is one
 * thing she learns. This module turns the steps into what the app uses; the checks in tests/content.test.ts make sure
 * they link up, and tools/sheet/make-sheet.mjs shows them as a sheet for review.
 */
export const STEPS: readonly StepDef[] = [...PART1, ...PART2];

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

/** What she hears in Catch: the lines she hears, or for something she says first, that line said by someone else. */
const catchOf = (s: StepDef): Line[] => (kindOf(s) === 'say' ? (s.say ?? []) : (s.hear ?? []));

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

const STEP_BY_ID = new Map(STEPS.map((s) => [s.id, s] as const));
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
  // A step built from one with the same sentence in it (she heard it there, she says it here) is never its wrong
  // answer in the meaning quiz: the two meanings would both be right.
  const base = s.from ? STEP_BY_ID.get(s.from) : undefined;
  const twin = !!base && catchOf(s).some((l) => catchOf(base).some((b) => sameSentence(l.en, b.en)));
  const near = [...new Set([...(s.near ?? []), ...(twin && base ? [base.id] : [])])];
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

/** Any step of the path, drafts included. */
export function stepById(id: string): Exchange | undefined {
  return COURSE_BY_ID.get(id);
}

/** The notebook's shelves: one per topic, with the steps the app teaches. */
export const SHELVES: readonly { topic: Topic; exchanges: Exchange[] }[] = Object.values(TOPICS)
  .map((topic) => ({ topic, exchanges: ORDERED.filter((e) => e.topic === topic.id) }))
  .filter((s) => s.exchanges.length > 0);

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
