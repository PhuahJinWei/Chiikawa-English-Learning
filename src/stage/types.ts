/**
 * The contract between the lessons and the 3D stage. Lessons never touch three.js: they only call this.
 *
 * Voice rule (the user, 2026-11-16): the generated English voice is never a friend's voice. While English
 * audio plays, friends may listen, act and react, but their mouths stay still. `setTalking` is only for a
 * friend's own text bubble, and the app never turns it on while English audio is playing.
 */

export type FriendId =
  | 'chiikawa'
  | 'hachiware'
  | 'usagi'
  | 'momonga'
  | 'kurimanju'
  | 'rakko'
  | 'furuhonya'
  | 'shisa';

export const FRIEND_IDS: readonly FriendId[] = [
  'hachiware',
  'chiikawa',
  'usagi',
  'kurimanju',
  'shisa',
  'momonga',
  'rakko',
  'furuhonya',
];

/**
 * Body actions. One-shots end by themselves (wave, hop, cheer, bow, startled, nod, shake);
 * the rest loop until stopped or replaced.
 * nod = yes, shake = no (head shake), listen = paw to ear (used while English audio plays).
 */
export type Gesture =
  | 'wave'
  | 'hop'
  | 'cheer'
  | 'bow'
  | 'startled'
  | 'nod'
  | 'shake'
  | 'listen'
  | 'look'
  | 'sit'
  | 'doze'
  | 'eat'
  | 'drink'
  | 'read'
  | 'cry'
  | 'hula';

export type Face = 'neutral' | 'smile' | 'happy' | 'determined' | 'worried' | 'teary' | 'sobbing' | 'shocked';

export type Mark = 'exclaim' | 'question' | 'zzz' | 'note' | 'heart';

/**
 * How much of the stage the app lays something over, in CSS pixels: a speech bubble over its top, the panel's edge
 * over its bottom. `crop`: a share of the friends' height that may go under the bottom edge, for a closer shot on a
 * short stage (0: their feet show).
 */
export interface StageInsets {
  top?: number;
  bottom?: number;
  crop?: number;
}

/** A point in CSS pixels, relative to the stage container's top-left corner. */
export interface ScreenPoint {
  x: number;
  y: number;
}

export interface StageApi {
  /** Creates the canvas inside `container` and starts drawing. Resolves once the renderer is ready. */
  mount(container: HTMLElement): Promise<void>;

  /** Says what the app covers of the stage (fields left out keep their value). The friends are framed in the part
   * left showing, with room above their heads for marks. */
  setInsets(insets: StageInsets): void;

  /** Puts these friends on stage (1 to 3), laid out side by side facing the learner. Loads their models if
   * needed. Friends not listed leave. Resolves once all of them are visible. A friend arriving pops in where they
   * stand; one listed in `walkIn` walks in from beyond the stage's edge on their side instead. */
  setCast(ids: readonly FriendId[], options?: { walkIn?: readonly FriendId[] }): Promise<void>;

  /** Plays a gesture. Resolves when a one-shot gesture ends, or when a looping one is stopped or replaced. */
  play(id: FriendId, gesture: Gesture): Promise<void>;

  /** Stops whatever gesture the friend is doing. */
  stop(id: FriendId): void;

  /** Overrides the friend's face. `null` hands the face back to their gesture (or neutral). */
  setFace(id: FriendId, face: Face | null): void;

  /** Pops a mark over the friend's head. */
  mark(id: FriendId, mark: Mark): void;

  /** Mouth (and a little body) moves as if talking. Only for the friend's own text bubble. */
  setTalking(id: FriendId, on: boolean): void;

  /** Where the friend looks: the learner (the camera), another friend, a screen point, or ahead (`null`). */
  lookAt(id: FriendId, target: 'learner' | FriendId | ScreenPoint | null): void;

  /** When on, friends glance toward the learner's finger as it touches the screen. */
  followPointer(on: boolean): void;

  /** The top of the friend's head on screen, for placing a speech bubble's tail. `null` if not on stage. */
  headAnchor(id: FriendId): ScreenPoint | null;

  /** Called after every drawn frame (to move bubbles with the friends). Returns an unsubscribe function. */
  onFrame(cb: () => void): () => void;

  /** Stops drawing (for example while a full-screen page covers the stage). The stage also pauses by itself
   * while the app is in the background. */
  setPaused(paused: boolean): void;

  /** Measures the frame rate over `seconds`, for the self-check. */
  measureFps(seconds: number): Promise<number>;

  /** Called once if the stage cannot go on (drawing keeps failing, or the GPU was lost for good). The app then
   * switches to the flat stage. */
  onFatal?(cb: (e: unknown) => void): () => void;

  dispose(): void;
}
