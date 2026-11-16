// Content types. Everything under src/content runs in the browser AND directly in Node (the audio script and the
// tests import it as TypeScript), so: imports carry their `.ts` extension, type imports use `import type`, and
// nothing here may import an npm package.
import type { Face, FriendId, Gesture, Mark } from '../stage/types.ts';

/** The six kinds of block (PLAN.md section 4, Word blocks). */
export type BlockKind =
  /** Starts a sentence and shows its type: Do you / Are you / I'm. Never highlighted. */
  | 'opener'
  /** Tells her what kind of answer is wanted: What / Where. Always highlighted. */
  | 'qword'
  /** An action, thing, feeling or describing word. Highlighted only when it is the topic. */
  | 'content'
  /** Flips the meaning: don't / not. Always highlighted. */
  | 'not'
  /** Adds tone, not something she must catch: please / too / lah. Never highlighted. */
  | 'tag'
  /** Learned whole: Thank you / See you. Highlighted as one block when it is the topic. */
  | 'fixed';

export interface BlockDef {
  /** The block as written, for reference (the dictionary key is its lower-case form). */
  en: string;
  /** Katakana reading, written to match how the American voice says it, not the loanword spelling. */
  kana: string;
  kind: BlockKind;
  /** Short meaning in Japanese. */
  ja: string;
  /** Tap-to-explain (Phase 2): when to use it, in Japanese, no grammar terms. */
  note?: string;
}

/** One block as it appears inside a line. */
export interface Part {
  /** Dictionary key (lower case, no punctuation, optional `@variant`). */
  key: string;
  /** The surface text with its punctuation, as shown: "some more?" */
  text: string;
  /** Reading for this occurrence (the block's own unless the line overrides it). */
  kana: string;
  /** Marked as the topic by the author (`*`). */
  topic: boolean;
  /** Highlighted (computed by the highlight rule; always false on lines she says). */
  hi: boolean;
}

export interface Line {
  /** Full English text, exactly what the voice says: "Do you want some more?" */
  en: string;
  /** Natural Japanese meaning of the whole line. */
  ja: string;
  parts: Part[];
  /** Heard lines get highlights; lines she says never do. */
  role: 'heard' | 'said';
}

export type ExchangeKind =
  /** She hears something and answers: "Are you OK?" → "OK!" */
  | 'reply'
  /** A situation (Japanese cue) where she says something: can't catch it → "Sorry, what?" */
  | 'say'
  /** She only needs to understand it: "Listen." */
  | 'understand';

/** What a friend does at one moment of a scene. Mouths stay still: English audio is never a friend's voice. */
export interface Act {
  who: FriendId;
  gesture?: Gesture;
  face?: Face;
  mark?: Mark;
}

export interface Scene {
  /** While what she hears plays (for 'say': while the situation is shown). */
  heard?: Act[];
  /** While each of her lines plays, by index into `say`. */
  replies?: Act[][];
}

/** A topic: a shelf in the notebook, and the friends on stage while its steps are taught. */
export type TopicId = 'app' | 'basics' | 'table' | 'family' | 'home' | 'chat' | 'feelings';

export interface Topic {
  id: TopicId;
  /** The shelf title in the notebook (Japanese). */
  title: string;
  /** Who stands on stage, left to right: Hachiware, the topic's friend, Chiikawa (three at most). */
  cast: FriendId[];
}

/**
 * How far a step is. 'draft': written, waiting for your review in the content sheet. 'approved': reviewed, waiting
 * for its audio. No status: finished. Audio is made only for approved or finished steps, and the app teaches only
 * steps whose every line has its audio.
 */
export type StepStatus = 'draft' | 'approved';

/**
 * One step of the learning path, as written in src/content/course: one thing she learns. What kind of step it is
 * follows from what it has: `hear` and `say` (she answers), `say` alone (she starts, in the situation `cue`), or
 * `hear` alone (she only needs to understand).
 */
export interface StepDef {
  /** Lower-case words joined by "-", unique: 'see-you-later'. */
  id: string;
  topic: TopicId;
  status?: StepStatus;
  /** Short Japanese title. */
  title: string;
  /** Hachiware's one line on when it is used (Japanese). */
  when: string;
  /** What she hears: the main line first, then other ways of saying it (up to 3 in all). */
  hear?: Line[];
  /** What she says: her answers to what she hears (alternatives), or, with no `hear`, what she says first. */
  say?: Line[];
  /** For something she says first: the situation, in Japanese. */
  cue?: string;
  /** What she may hear back after she says it (to understand). */
  then?: Line[];
  /** The earlier step this one is built from: it reuses that step's words and changes or adds a little. */
  from?: string;
  /** Steps close enough in meaning that they must never be each other's wrong answers in Catch. */
  near?: string[];
  /** Other replies (English, as written in their step) that would also be fine answers here: never offered as a
   * wrong choice. Replies to the same line in other steps, and the VERSATILE replies, are added automatically. */
  fits?: string[];
  /** What the friends do. Optional: a simple default is used. */
  scene?: Scene;
}

/** A step as the app uses it (compiled from a StepDef by src/content/index.ts). */
export interface Exchange {
  id: string;
  kind: ExchangeKind;
  topic: TopicId;
  /** The friend who talks (always Hachiware: in the original the others barely speak). */
  host: FriendId;
  /** Who stands on stage. */
  cast: FriendId[];
  title: string;
  when: string;
  near?: string[];
  fits?: string[];
  /** For 'say': the situation, in Japanese. */
  cue?: string;
  /** What she hears: 1 to 3 phrasings (empty for 'say'). */
  heard: Line[];
  /** What she says (empty for 'understand'). Several entries are alternatives. */
  short: Line[];
  /** What she may hear back after she says something first. */
  then: Line[];
  /** The step this one is built from. */
  from?: string;
  status?: StepStatus;
  /** Every line, and every block in it, has its audio clip. */
  voiced: boolean;
  scene: Scene;
}
