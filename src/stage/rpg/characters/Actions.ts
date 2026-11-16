import ACTION_DATA from './actions.json';
import ATTACK_DATA from './attacks.json';
import EMOTE_DATA from './emotes.json';
// (eigo-friends: the stage's own gestures, nod, shake and listen: see GESTURE_MOTIONS.)
import GESTURE_DATA from './gestures.json';
import type { Pose } from './Pose';
import type { ExpressionId } from './types';
import type { EmoteKind } from './Emotes';
import type { StringKey } from '../i18n/I18n';

export type ActionId =
  | 'wave'
  | 'hop'
  | 'cheer'
  | 'bow'
  | 'sit'
  | 'doze'
  | 'eat'
  | 'talk'
  | 'look'
  | 'startled'
  | 'cry'
  | 'hula'
  | 'ukulele'
  | 'sword'
  | 'read'
  | 'readSeated'
  | 'ready'
  | 'menace'
  | 'folded'
  | 'drink'
  | 'thrust'
  | 'smash'
  | 'slash'
  | 'throw'
  // eigo-friends: yes, no, and listening (see GESTURE_MOTIONS).
  | 'nod'
  | 'shake'
  | 'listen';

/** The actions the Test panel offers the cast. The Siren's own ('menace') is not one of them, nor 'ukulele' and
 * 'sword', offered only to those who play it (CharacterDef.plays) or carry one (CharacterDef.own). */
export const ACTION_IDS: readonly ActionId[] = [
  'wave',
  'hop',
  'cheer',
  'bow',
  'sit',
  'doze',
  'eat',
  'talk',
  'look',
  'startled',
  'cry',
  'hula',
];

/** What you do yourself, from the HUD's きもち button (see Hud), in its order: 1 to 9 on the keyboard. */
export const EMOTES: readonly ActionId[] = ['wave', 'bow', 'cheer', 'hop', 'hula', 'talk', 'look', 'startled', 'cry'];

export interface ActionContext {
  emote(kind: EmoteKind, side?: number): void;
  say(key: StringKey): void;
}

/** How an attack moves the weapon they carry, about the paw that holds it: from the way it is carried (its kind's
 * hold: across them, or raised) toward the way given here. */
export interface HeldMove {
  /** How far it has gone from how it is carried to the way below: 0 as carried, 1 all the way. */
  blend: number;
  /** The way it points: round from straight ahead toward the side of the paw that holds it (radians; below 0,
   * toward their other side), and its head up from level (below 0, down). */
  yaw: number;
  pitch: number;
  /** Turned about its own length (radians): a quarter turn lays a sword's blade flat, its edge leading a sweep. */
  roll: number;
  /** How far it is pushed out along itself (metres; below 0, drawn back). */
  thrust: number;
}

export interface ActionDef {
  /** Seconds; Infinity loops until cancelled. */
  duration: number;
  fadeIn: number;
  fadeOut: number;
  allowMove?: boolean;
  talking?: boolean;
  chewing?: boolean;
  /** What they hold while it plays: what they play (CharacterOptions.instrument), or the sword they carry on
   * their back (CharacterOptions.own). */
  prop?: 'ukulele' | 'sword';
  /** Done with one paw, the pose's R arm (their left, which what they hold leaves free): with Kurimanju's can in that
   * paw, the other does it instead, as one waves with the free hand (see Character.updatePose). */
  oneHand?: boolean;
  /** Its paws come up before or round the face (startled, crying, cheering): a paw with something in it keeps holding
   * it out where it holds it, the other doing it alone (what it held would have gone into them: see
   * Character.updatePose). */
  fullPawHolds?: boolean;
  /** Holds what is in their right paw open before their face, to read it (a book: see Character.placeHand). */
  reads?: boolean;
  /** Holds what is in their right paw up ready before them in both paws, pointing ahead and up (a weapon: see
   * Character.placeHand). */
  readies?: boolean;
  /** An attack with the weapon they carry (see Character.placeHand's weapons): how it is moved at `t` into it,
   * written into `out`. Each kind of weapon has its own (hunt/Weapons.ts WeaponDef.attack). */
  held?: (t: number, out: HeldMove) => void;
  /** The action's own face, shown over any expression chosen in the Test panel. */
  expression: (t: number) => ExpressionId;
  /** Shuts the eyes (bowing), whatever the expression. */
  eyesClosed?: (t: number) => boolean;
  /** Asleep: the face's sleeping eyes (`eyes sleep`), or its closed eyes if it has none. */
  asleep?: boolean;
  /** Receives the locomotion pose and overrides what the action controls. */
  pose: (t: number, p: Pose) => void;
  /** Fires effects; `prev` is last frame's time so events trigger exactly once. */
  tick?: (t: number, prev: number, ctx: ActionContext) => void;
}

const TAU = Math.PI * 2;

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const crossed = (prev: number, t: number, at: number) => prev < at && t >= at;

/** A part of an attack (see AttackMotions): its times, seconds into the attack (see partAt). */
type Part = number[];

/**
 * How far into a part of an attack it is at `t` (0 to 1), from its `times` (seconds into the attack, as AttackMotions
 * keeps them): [begins, full, eases, over] (rising from 0 to 1 between the first two, held, falling back to 0 between
 * the last two), or [begins, full] (rising, and staying). Tuned to take no time, it comes, or goes, at once.
 */
export function partAt(t: number, times: Readonly<Part>): number {
  const [a, b, c, d] = times;
  const rise = b > a ? smooth((t - a) / (b - a)) : t >= a ? 1 : 0;
  if (times.length < 4) return rise;
  return rise * (1 - (d > c ? smooth((t - c) / (d - c)) : t >= c ? 1 : 0));
}

/** How long an attack lasts (seconds), and how long it takes to ease into it and back out of it after. */
interface Timing {
  duration: number;
  fadeIn: number;
  fadeOut: number;
}

/**
 * The attacks' motions in numbers (ACTIONS.thrust, smash, slash and throw, whose words say what each part and each
 * amount does). They live in characters/attacks.json, tuned by eye in the testing ground (dev/Dev.ts, its Tune:
 * attacks) and saved there, and are read every frame. Each has its Timing; its parts' times (Part, as partAt reads
 * them); and how far each part moves the weapon, the paw that holds it and the body. A name ending in a part's name
 * (pitchBack: how far they pitch over as they draw back) is how far that part moves it, added in as the part comes;
 * one ending in To (pawXRoundTo), where the paw goes to in that part. Angles in degrees; where a paw reaches in face
 * radii (see REACH: out to its own side, x; up from the eyes, y; forward, z); the weapon pushed along itself, the body
 * raised and the feet moved in metres; leaning as a share of their height (forward above 0), squashing as a share
 * of it (below 0, squashed down).
 */
export interface ThrustMotion extends Timing {
  back: Part;
  out: Part;
  round: Part;
  weaponBack: number;
  weaponOut: number;
  pawXRoundTo: number;
  pawZBack: number;
  pawZOut: number;
  pitchBack: number;
  pitchOut: number;
  leanBack: number;
  leanOut: number;
  squashBack: number;
  squashOut: number;
  footLOut: number;
  footROut: number;
  footRUpOut: number;
  earsBack: number;
  earsOut: number;
}
export interface SmashMotion extends Timing {
  up: Part;
  down: Part;
  carry: Part;
  letGo: Part;
  weaponPitch: number;
  weaponPitchDown: number;
  pawYUp: number;
  pawYDown: number;
  pawZDown: number;
  pitchUp: number;
  pitchDown: number;
  leanUp: number;
  leanDown: number;
  riseUp: number;
  squashUp: number;
  squashDown: number;
  earsUp: number;
  earsDown: number;
}
export interface SlashMotion extends Timing {
  wind: Part;
  sweep: Part;
  carry: Part;
  swing: Part;
  weaponYaw: number;
  weaponYawSwing: number;
  weaponPitch: number;
  weaponRoll: number;
  pawXSweepTo: number;
  pawZSweepTo: number;
  turnWind: number;
  turnSweep: number;
  pitchSweep: number;
  leanSweep: number;
  squashWind: number;
  squashSweep: number;
  footLSweep: number;
  earsSweep: number;
}
export interface ThrowMotion extends Timing {
  wind: Part;
  out: Part;
  fling: Part;
  flingIn: Part;
  letGo: Part;
  pawXOutTo: number;
  pawYOutTo: number;
  pawZWindTo: number;
  pawXFlingTo: number;
  pawYFlingTo: number;
  pawZFlingTo: number;
  turnWind: number;
  turnFling: number;
  pitchWind: number;
  pitchFling: number;
  leanWind: number;
  leanFling: number;
  squashWind: number;
  squashFling: number;
  footLFling: number;
  earsWind: number;
  earsFling: number;
}
export interface AttackMotions {
  thrust: ThrustMotion;
  smash: SmashMotion;
  slash: SlashMotion;
  throw: ThrowMotion;
}
export type AttackId = keyof AttackMotions;

/** The attacks' motions: the very object the testing ground tunes (changed in place, never replaced). */
export const ATTACK_MOTIONS: AttackMotions = ATTACK_DATA;
const M = ATTACK_MOTIONS;
const DEGREE = Math.PI / 180;

/**
 * The emotes' motions in numbers (ACTIONS.wave, bow, cheer, hop, hula, talk, look, startled and cry), and where paws
 * reach (`reach`: see REACH). They live in characters/emotes.json, tuned by eye in the testing ground (dev/Dev.ts, its
 * Tune: emotes) and saved there, and are read every frame. As the attacks' (see AttackMotions): each emote's easing in
 * and out and, unless it goes on till stopped, its length (seconds); its parts' times (as partAt reads them); how fast
 * what it does again and again goes (a `...Speed`, radians a second: what goes into a sine; `hopsPerSecond`,
 * `beatsPerSecond`; `lookTime`, seconds); when it says or shows something (`saysAt`, `markAt`, or `...Every` so many
 * seconds from `...From`); and how far it moves them. Angles in degrees; how far the paws reach in face radii; how high
 * they rise in metres; leaning and squashing as shares of their height (each named as the emote's own words have it).
 */
export const EMOTE_MOTIONS = EMOTE_DATA;
export type EmoteMotions = typeof EMOTE_DATA;
const E = EMOTE_MOTIONS;

/**
 * The other actions' motions in numbers (ACTIONS.sit, doze, eat, ukulele, sword, drink, ready, read, readSeated, menace
 * and folded: the game plays none of them yet), as the emotes' are (see EmoteMotions): each one's easing in and out,
 * its length (all but the drink's go on till stopped), its parts, its speeds, when it shows something, and how far it
 * moves them; and the points their paws reach (each `...At`, in face radii as REACH):
 * - Rakko's on his ukulele, where Character.ts holds it (UKULELE_AT): his right paw (the model's -x side) strumming
 *   over its body (strumAt), his left up its neck (neckAt); and both on his sword's grip (SWORD_HOLD), his right paw
 *   below his left (sword's lowerAt, upperAt).
 * - Everyone's on a weapon held up ready (the 'ready' action, かまえる), as Rakko's on his sword: before their middle,
 *   one above the other, the weapon held between them by its foot (see Character.placeHand's READY_TURN).
 * - 島二郎's fists with his arms folded (the 'folded' action), in his face radii: each across his middle to the other
 *   arm before his belly's top, his right forearm lower and before his left, so that they cross (checked in the game:
 *   sent level, side by side, they bunched into one lump).
 * The sitting and the reading the others share are sit's and read's (sitPose, readPose). Kurimanju's drink comes down
 * from his mouth at its `downAt`, his ハ〜 after. They live in characters/actions.json, tuned by eye in the testing
 * ground (dev/Dev.ts, its Tune: other actions) and saved there, and are read every frame.
 */
export const ACTION_MOTIONS = ACTION_DATA;
export type ActionMotions = typeof ACTION_DATA;
const O = ACTION_MOTIONS;

/**
 * eigo-friends: the stage's own gestures, which the RPG has no need of, in numbers as the emotes' are (characters/
 * gestures.json): a nod for yes, a head shake for no, and listening (a paw held up by the side of the head, cupped, the
 * head tilted toward it: these arms are too short to reach the ears on top of the head). The head's own turns are the
 * pose's headNod, headTurn and headTilt (degrees here); leaning and squashing as shares of their height.
 */
export const GESTURE_MOTIONS = GESTURE_DATA;
const G = GESTURE_MOTIONS;
const every = (prev: number, t: number, period: number, offset: number) =>
  t >= offset && Math.floor((t - offset) / period) > Math.floor((prev - offset) / period);

type Point = readonly [number, number, number];

/**
 * Where paws reach (see Pose.reachL and Arms.ts), in face radii (Arms.ts MOUTH_AHEAD: Chiikawa's head radius, and
 * as much on everyone's face, Momonga's wide head or not): out from the middle on the paw's own side, up from the
 * eyes, forward from the body's middle. The arms are as short as the models' stubs (the user), reaching about a
 * quarter of a face radius from their root, the root going round the body and up its front as they reach in; each
 * point measured to be within reach on every cast member (a straight arm flung toward the wave's and the cheer's).
 * As the drawings, the official figures and the film have them: both paws up on the face under the mouth (the
 * user's drawing of Hachiware), or a little lower under the chin; up at the side for a wave; and flung up and out
 * round the head's sides for a cheer (the head too big for paws over it). Paws come before them only so, or with a
 * thing in them (see Character.locomotionPose); standing, talking, bowing and sitting, they stay at their sides, as
 * Chiikawa's characters are drawn (the user, 2026-10-23: paws before them for no reason look odd). `read`: under a
 * book held open before the chin, each paw under its half (see Character.placeHand's READ_AT). They live in
 * characters/emotes.json (its `reach`: see EMOTE_MOTIONS), tuned in the testing ground; each is read as it is used.
 */
export const REACH = EMOTE_MOTIONS.reach as unknown as Record<'mouth' | 'chin' | 'wave' | 'cheer' | 'read', Point>;

// (Where Rakko's, 島二郎's and everyone's paws go holding things up are in characters/actions.json: see ActionMotions.)

/** Reaches the pose's left paw (the model's -x side, their own right, named as seen from before them) `w` of the
 * way to `at`, moved by (dx, dy, dz). */
function reachL(p: Pose, w: number, at: Readonly<number[]>, dx = 0, dy = 0, dz = 0): void {
  p.reachL = w;
  p.reachLX = at[0] + dx;
  p.reachLY = at[1] + dy;
  p.reachLZ = at[2] + dz;
}

/** Reaches the pose's right paw (the model's +x side, their own left) `w` of the way to `at`, moved by (dx, dy, dz). */
function reachR(p: Pose, w: number, at: Readonly<number[]>, dx = 0, dy = 0, dz = 0): void {
  p.reachR = w;
  p.reachRX = at[0] + dx;
  p.reachRY = at[1] + dy;
  p.reachRZ = at[2] + dz;
}

/**
 * Sitting on the ground with the legs stretched out in front, as the film's characters sit:
 * the body settles onto its bottom with a little bounce, leaning back slightly, and keeps its
 * shape. The paws stay by their sides, as round the film's bonfire (`[anime] chiikawa 5`).
 */
function sitPose(t: number, p: Pose): void {
  const a = O.sit;
  const s = partAt(t, a.down);
  p.sit = s;
  p.squash = 1 + a.bounceSquash * partAt(t, a.bounce) + a.breathe * Math.sin(t * a.breatheSpeed) * s;
  p.rootPitch = a.pitch * DEGREE * s;
  p.leanZ = a.lean * s;
}

/**
 * Reading what they hold, a book held open before them (Character.placeHand opens it there), as Hachiware reads the
 * film's: both paws up under it before the chin, the head bowed a little over it, the eyes down on its pages and
 * going down them and back up, a slow breath.
 */
function readPose(t: number, p: Pose): void {
  const a = O.read;
  const up = partAt(t, a.up);
  p.armLRaise = p.armRRaise = a.armRaise * DEGREE * up;
  p.armLSwing = p.armRSwing = a.armSwing * DEGREE * up;
  reachL(p, up, REACH.read);
  reachR(p, up, REACH.read);
  p.leanZ += a.lean * up;
  p.gazeY = (a.eyesDown + a.eyesScan * Math.sin(t * a.scanSpeed)) * up;
  p.squash = 1 + a.breathe * Math.sin(t * a.breatheSpeed);
}

/** `def`, taking its length and its easing in and out from its numbers as they are tuned (`numbers`: its own of
 * ATTACK_MOTIONS or EMOTE_MOTIONS); one that goes on till stopped keeps its own length, Infinity. */
function tuned(
  numbers: () => { duration?: number; fadeIn: number; fadeOut: number },
  def: Omit<ActionDef, 'duration' | 'fadeIn' | 'fadeOut'> & { duration?: number },
): ActionDef {
  return Object.defineProperties(def, {
    duration: def.duration === Infinity ? { value: Infinity } : { get: () => numbers().duration },
    fadeIn: { get: () => numbers().fadeIn },
    fadeOut: { get: () => numbers().fadeOut },
  }) as ActionDef;
}

export const ACTIONS: Record<ActionId, ActionDef> = {
  // The attacks of this game's hunting (hunt/Hunt.ts), one for each kind of weapon (hunt/Weapons.ts WeaponDef.attack;
  // the user, 2026-11-12: a fork thrusts, a club swings heavily; a sword's slash and a thrown thing's throw are to
  // come with those weapons). Each starts and ends with the weapon carried as its kind is (Character.placeHand: a
  // fork across them, a club pointing ahead, a sword upright at their side, a stone before them in both paws) and says
  // how it moves meanwhile
  // (`held`); short, and done standing still (see hunt/Hunt.ts attacking). Their numbers (times, and how far each part
  // moves them) are in characters/attacks.json (see AttackMotions); the words below give them as they were made.
  //
  // A fork's (or a spear's) thrust, as the PvZ game's Hachiware jabs with his さすまた (art/sprites/ally_hachiware's
  // five attack pictures): its head brought round to point ahead as it is drawn back, crouching a little and leaning
  // back; then lunging into it, the weapon shot out ahead along itself, leaning in, a foot forward and the ears flung
  // back; held there a moment; and back across them. It is all the way out at 0.15 s, when a fork's hit lands. (Out
  // only as far as keeps the paw on its foot: the stub arms reach some 7 cm. Pointed ahead from their right paw where
  // it holds it across them, before them, the fork's foot was drawn back into them: the paw takes it out to their
  // side, where the stub arm hangs. Drawn back along itself 10 cm: clear of everyone, measured as they are drawn
  // (BodyShape.ts; a rougher shape of them had it 4 cm into them, and it was cut to 3 cm a while). Leaning into it only
  // 5 degrees: leaning 7, the tip of Momonga's fork went 2 cm into the ground.)
  thrust: tuned(() => M.thrust, {
    allowMove: true,
    expression: () => 'determined',
    held(t, m) {
      const a = M.thrust;
      m.blend = partAt(t, a.round);
      m.yaw = m.pitch = m.roll = 0;
      m.thrust = a.weaponBack * partAt(t, a.back) + a.weaponOut * partAt(t, a.out);
    },
    pose(t, p) {
      const a = M.thrust;
      const back = partAt(t, a.back);
      const out = partAt(t, a.out);
      const round = partAt(t, a.round);
      // Their left paw lets go of it as it comes round; their right goes out to their side with it, back, and out.
      p.reachR *= 1 - round;
      p.reachLX += (a.pawXRoundTo - p.reachLX) * round;
      p.reachLZ += a.pawZBack * back + a.pawZOut * out;
      p.rootPitch = (a.pitchBack * back + a.pitchOut * out) * DEGREE;
      p.leanZ = a.leanBack * back + a.leanOut * out;
      p.squash = 1 + a.squashBack * back + a.squashOut * out;
      p.footLZ += a.footLOut * out;
      p.footRZ += a.footROut * out;
      p.footRY += a.footRUpOut * out;
      p.earLPitch = p.earRPitch = (a.earsBack * back + a.earsOut * out) * DEGREE;
    },
  }),

  // A club's heavy swing (the spring weapon's): heaved up from pointing ahead to point up before them, as
  // they rear back and rise, then brought down hard ahead as they drop into it, to the ground; a moment there,
  // squashed; and back to pointing ahead. Slow: it comes down at 0.26 s, when a club's hit lands. (Its way up is toward
  // pointing up from however it is carried; its paw lifts a little with it, the club heaved up as they rise. Raised as high
  // as the cheek, the paw went under the rim of a wide head, Momonga's, and the club's handle into it. Not stood up over
  // them, as it was till 2026-11-12: from a paw at the end of a stub arm, under the head's wide rim, what is stood up
  // goes into the head, the spring's head 26 cm into everyone's, which only the fit there once was kept out of it; nor
  // leaned out beside the head, its handle then going into their side. Heaved up further than 45 degrees, it goes in:
  // at 50, into Rakko's head; stood up, 18.6 cm into everyone's (measured as they are drawn: BodyShape.ts).
  // And brought down only till its head is on the ground: still pointing a little up from them, as they drop and pitch
  // forward into it. Brought down to 26 degrees under their ahead, it went 25 cm into the ground.)
  smash: tuned(() => M.smash, {
    allowMove: true,
    expression: () => 'determined',
    held(t, m) {
      const a = M.smash;
      const down = partAt(t, a.down);
      m.blend = partAt(t, a.carry);
      m.yaw = m.roll = m.thrust = 0;
      m.pitch = (a.weaponPitch + a.weaponPitchDown * down) * DEGREE;
    },
    pose(t, p) {
      const a = M.smash;
      const up = partAt(t, a.up);
      const down = partAt(t, a.down);
      p.reachR *= 1 - partAt(t, a.letGo);
      p.reachLY += a.pawYUp * up + a.pawYDown * down;
      p.reachLZ += a.pawZDown * down;
      p.rootPitch = (a.pitchUp * up + a.pitchDown * down) * DEGREE;
      p.leanZ = a.leanUp * up + a.leanDown * down;
      p.rootY = a.riseUp * up;
      p.squash = 1 + a.squashUp * up + a.squashDown * down;
      p.earLPitch = p.earRPitch = (a.earsUp * up + a.earsDown * down) * DEGREE;
    },
  }),

  // A sword's slash: the blade brought down level and back to their sword paw's side as they twist that way, then
  // swept flat round before them to their other side, its edge leading, as they twist after it; and back up to how
  // it is carried. Quick: the sweep crosses before them at about 0.14 s, when a sword's hit lands.
  slash: tuned(() => M.slash, {
    allowMove: true,
    expression: () => 'determined',
    held(t, m) {
      const a = M.slash;
      const swing = partAt(t, a.swing);
      m.blend = partAt(t, a.carry);
      // (Only a little past straight ahead: swept on round to their other side, from a paw at their side, the blade
      // went through them.)
      m.yaw = (a.weaponYaw + a.weaponYawSwing * swing) * DEGREE;
      m.pitch = a.weaponPitch * DEGREE;
      m.roll = a.weaponRoll * DEGREE;
      m.thrust = 0;
    },
    pose(t, p) {
      const a = M.slash;
      const wind = partAt(t, a.wind);
      const sweep = partAt(t, a.sweep);
      // The sword paw comes round before them with the sweep, so that the blade goes round ahead of them, not through
      // them (see Character's CarryHold: it stays where the stub arm reaches).
      p.reachLX += (a.pawXSweepTo - p.reachLX) * sweep;
      p.reachLZ += (a.pawZSweepTo - p.reachLZ) * sweep;
      // (Their right is the model's -x: a turn that way is a yaw below 0.)
      p.rootYaw = (a.turnWind * wind + a.turnSweep * sweep) * DEGREE;
      p.rootPitch = a.pitchSweep * sweep * DEGREE;
      p.leanZ = a.leanSweep * sweep;
      p.squash = 1 + a.squashWind * wind + a.squashSweep * sweep;
      p.footLZ += a.footLSweep * sweep;
      p.earLPitch = p.earRPitch = a.earsSweep * sweep * DEGREE;
    },
  }),

  // A throw (a thing thrown from a distance), underarm: taken from both paws into the right, drawn back low at their
  // side as they lean back, then flung forward and up before them as they lean in after it; it leaves the paw at about
  // 0.14 s (hunt/Hunt.ts lets it fly then). (Its paw kept where the stub arm reaches, out at their side and before
  // them: swung by the arm's own turns, up and back, it took the stone through their head. And kept low at their
  // side, below their head's wide rim: drawn back at their cheek's height, under that rim, the stone in it was 5 cm in
  // their head, and no way of holding it cleared them.)
  throw: tuned(() => M.throw, {
    allowMove: true,
    expression: () => 'determined',
    pose(t, p) {
      const a = M.throw;
      const wind = partAt(t, a.wind);
      // (Out to their side and down first, still before them, then back: drawn straight back from before them, under
      // their head's rim, the stone in it went through their belly; and going back as it went out, it cut the corner
      // of their body, 3 cm in: it goes back only once it is out.)
      const out = partAt(t, a.out);
      const fling = partAt(t, a.fling);
      // (Flung forward first, and then in before them: swung straight from behind their side to before them, the paw
      // cut the corner of a broad body, the stone 1.4 cm into Rakko's.)
      const flingIn = partAt(t, a.flingIn);
      // Their left paw lets go; their right takes it out and back low at their side, then flings it forward.
      p.reachR *= 1 - partAt(t, a.letGo);
      p.reachLX += (a.pawXOutTo - p.reachLX) * out;
      p.reachLY += (a.pawYOutTo - p.reachLY) * out;
      p.reachLZ += (a.pawZWindTo - p.reachLZ) * wind;
      p.reachLX += (a.pawXFlingTo - p.reachLX) * flingIn;
      p.reachLY += (a.pawYFlingTo - p.reachLY) * fling;
      p.reachLZ += (a.pawZFlingTo - p.reachLZ) * fling;
      p.rootYaw = (a.turnWind * wind + a.turnFling * fling) * DEGREE;
      p.rootPitch = (a.pitchWind * wind + a.pitchFling * fling) * DEGREE;
      p.leanZ = a.leanWind * wind + a.leanFling * fling;
      p.squash = 1 + a.squashWind * wind + a.squashFling * fling;
      p.footLZ += a.footLFling * fling;
      p.earLPitch = p.earRPitch = (a.earsWind * wind + a.earsFling * fling) * DEGREE;
    },
  }),

  wave: tuned(() => E.wave, {
    oneHand: true,
    expression: () => 'happy',
    pose(t, p) {
      const a = E.wave;
      const up = partAt(t, a.up);
      const wag = Math.sin(t * a.wagSpeed);
      // A stub's wave, for a model whose arms do not bend; a paw up beside the head, wagged side to side from the
      // elbow and the wrist, for one whose do (the short arm reaching no higher than the head's lower side).
      p.armRRaise = up * (a.armRaise + a.armWag * wag) * DEGREE;
      p.armRSwing = up * a.armSwing * DEGREE;
      reachR(p, up, REACH.wave, a.pawSide * wag, a.pawUp * Math.abs(wag));
      p.pawRBend = up * a.pawBend * DEGREE * wag;
      p.leanX = a.leanSide * up;
      p.squash = 1 + a.squashBob * Math.sin(t * a.bobSpeed);
      p.rootY = a.riseBob * Math.abs(Math.sin(t * a.bobSpeed));
      p.earLRoll = p.earRRoll = a.earsBob * DEGREE * Math.sin(t * a.bobSpeed);
    },
  }),


  hop: tuned(() => E.hop, {
    expression: () => 'happy',
    pose(t, p) {
      const a = E.hop;
      const ph = (t * a.hopsPerSecond) % 1;
      const h = Math.sin(ph * Math.PI);
      const env = partAt(t, a.hops);
      p.rootY = a.height * h * env;
      p.squash = 1 + (a.stretch * h + a.landing * (1 - h) * (1 - h)) * env;
      p.armLRaise = p.armRRaise = (a.armRaise + a.armHop * h) * DEGREE * env;
      // The elbows giving with each landing.
      p.armLBend = p.armRBend = (a.elbow + a.elbowHop * h) * DEGREE * env;
      p.footLY = p.footRY = a.feetUp * h * env;
    },
  }),


  cheer: tuned(() => E.cheer, {
    fullPawHolds: true,
    expression: () => 'happy',
    pose(t, p) {
      const a = E.cheer;
      const h = Math.max(0, Math.sin(Math.min(1, t / a.jumpTime) * Math.PI));
      const up = partAt(t, a.up);
      p.rootY = a.jumpHeight * h;
      p.squash = 1 + a.stretchJump * h + a.squashDown * (1 - up);
      p.armLRaise = p.armRRaise = up * (a.armRaise + a.armShake * Math.sin(t * a.shakeSpeed)) * DEGREE;
      // Both paws flung up and out round the head's sides, shaking.
      const shake = a.pawShake * Math.sin(t * a.shakeSpeed);
      reachL(p, up, REACH.cheer, 0, shake);
      reachR(p, up, REACH.cheer, 0, -shake);
      p.pawLBend = p.pawRBend = a.pawBend * DEGREE * up;
      p.leanZ = a.lean * up;
      p.earLRoll = p.earRRoll = a.earsRoll * DEGREE * up;
    },
    tick(t, prev, ctx) {
      if (crossed(prev, t, E.cheer.saysAt)) ctx.say('bubble.cheer');
    },
  }),


  bow: tuned(() => E.bow, {
    expression: () => 'neutral',
    eyesClosed: (t) => t > E.bow.eyesShutFrom && t < E.bow.eyesShutTill,
    pose(t, p) {
      const a = E.bow;
      const b = partAt(t, a.bow);
      p.leanZ = a.lean * b;
      p.rootPitch = a.pitch * DEGREE * b;
      p.squash = 1 + a.squash * b;
      // The arms hanging at their sides as they bow, swung back as far as the body goes forward.
      p.armLSwing += a.armsBack * DEGREE * b;
      p.armRSwing += a.armsBack * DEGREE * b;
      p.earLPitch = p.earRPitch = a.ears * DEGREE * b;
    },
  }),


  sit: tuned(() => O.sit, {
    duration: Infinity,
    expression: () => 'neutral',
    pose: sitPose,
  }),


  doze: tuned(() => O.doze, {
    duration: Infinity,
    expression: () => 'neutral',
    asleep: true,
    pose(t, p) {
      const a = O.doze;
      sitPose(t, p);
      // Nodding off: the head sinks forward and sways with slow breaths.
      p.leanZ = a.nod + a.nodBreath * Math.sin(t * a.breathSpeed);
      p.leanX = a.sway * Math.sin(t * a.swaySpeed);
      p.squash += a.breathe * Math.sin(t * a.breatheSpeed);
      p.rootRoll = a.roll * DEGREE * Math.sin(t * a.swaySpeed);
      p.earLPitch = p.earRPitch = a.ears * DEGREE;
      p.earBend = a.earsBend;
    },
    tick(t, prev, ctx) {
      if (every(prev, t, O.doze.zzzEvery, O.doze.zzzFrom)) ctx.emote('zzz');
    },
  }),


  eat: tuned(() => O.eat, {
    duration: Infinity,
    chewing: true,
    expression: () => 'happy',
    pose(t, p) {
      const a = O.eat;
      p.armLRaise = p.armRRaise = a.armRaise * DEGREE;
      p.armLSwing = p.armRSwing = a.armSwing * DEGREE;
      // Both paws up under the chin round what they eat, held up at the mouth (see Character.placeHand), bobbing
      // with each bite.
      const bite = a.bite * Math.sin(t * a.biteSpeed);
      const up = partAt(t, a.up);
      reachL(p, up, REACH.mouth, a.pawIn, bite);
      reachR(p, up, REACH.mouth, a.pawIn, bite);
      p.squash = 1 + a.squashBite * Math.sin(t * a.biteSpeed);
      p.leanZ = a.lean + a.leanBite * Math.sin(t * a.biteSpeed);
    },
    tick(t, prev, ctx) {
      if (every(prev, t, O.eat.heartsEvery, O.eat.heartsFrom)) ctx.emote('heart');
    },
  }),


  talk: tuned(() => E.talk, {
    duration: Infinity,
    oneHand: true,
    talking: true,
    expression: () => 'neutral',
    pose(t, p) {
      const a = E.talk;
      p.leanZ = a.nod * Math.sin(t * a.nodSpeed);
      p.leanX = a.sway * Math.sin(t * a.swaySpeed);
      p.squash = 1 + a.bob * Math.sin(t * a.bobSpeed);
      const g = Math.max(0, Math.sin(t * a.handSpeed));
      // A paw lifted out at their side now and then as they talk, the other hanging by them.
      p.armRRaise += a.armRaise * DEGREE * g * g;
      p.armRSwing += a.armSwing * DEGREE * g;
      p.rootY = a.rise * Math.abs(Math.sin(t * a.bobSpeed));
    },
    tick(t, prev, ctx) {
      if (every(prev, t, E.talk.saysEvery, E.talk.saysFrom)) ctx.say('bubble.talk');
    },
  }),


  look: tuned(() => E.look, {
    expression: () => 'neutral',
    pose(t, p) {
      const a = E.look;
      const k = Math.sin((t * TAU) / a.lookTime) * partAt(t, a.looking);
      p.rootYaw = a.turn * DEGREE * k;
      p.leanX = a.lean * k;
      p.gazeX = a.gaze * k;
    },
    tick(t, prev, ctx) {
      if (crossed(prev, t, E.look.markAt)) ctx.emote('question');
    },
  }),


  startled: tuned(() => E.startled, {
    fullPawHolds: true,
    expression: (t) => (t < E.startled.shockedFor ? 'shocked' : 'worried'),
    pose(t, p) {
      const a = E.startled;
      const jt = t / a.jumpTime;
      const h = jt < 1 ? Math.sin(jt * Math.PI) : 0;
      p.rootY = a.jumpHeight * h;
      p.squash = t < a.crouchFor ? a.crouch : jt < 1 ? a.stretch : 1 - a.settle * Math.exp(-(t - a.jumpTime) * a.settleSpeed);
      p.leanZ = a.leanBack * smooth(t * a.leanSpeed);
      p.armLRaise = p.armRRaise = (a.armRaise + a.armJump * h) * DEGREE;
      // Flung out with the jump, then held up close before the chest, elbows in, as a startled paw is.
      p.armLBend = p.armRBend = (a.elbowJump + a.elbowHeld * (1 - h)) * DEGREE;
      const held = partAt(t, a.held);
      reachL(p, held, REACH.chin, a.pawX, a.pawY, a.pawZ);
      reachR(p, held, REACH.chin, a.pawX, a.pawY, a.pawZ);
      if (t > a.shakeFrom) p.leanX = Math.sin(t * a.shakeSpeed) * a.shake;
      p.earLRoll = p.earRRoll = a.earsRoll * DEGREE * h;
      p.earBend = a.earsBend * h;
    },
    tick(t, prev, ctx) {
      if (crossed(prev, t, E.startled.markAt)) ctx.emote('exclaim');
    },
  }),


  cry: tuned(() => E.cry, {
    duration: Infinity,
    fullPawHolds: true,
    expression: () => 'sobbing',
    pose(t, p) {
      const a = E.cry;
      const tremble = Math.sin(t * a.trembleSpeed) * a.tremble + Math.sin(t * a.tremble2Speed) * a.tremble2;
      p.leanX = tremble;
      p.leanZ = a.leanIn + tremble * a.trembleForward;
      p.squash = 1 + a.squash + a.sob * Math.sin(t * a.sobSpeed);
      p.armLRaise = (a.armRaise + a.armShake * Math.sin(t * a.shakeSpeedL)) * DEGREE;
      p.armRRaise = (a.armRaise + a.armShake * Math.sin(t * a.shakeSpeedR)) * DEGREE;
      p.armLSwing = p.armRSwing = a.armSwing * DEGREE;
      // Both paws up on the face under the mouth, trembling, as the drawings' sobbing characters hold them.
      const up = partAt(t, a.up);
      reachL(p, up, REACH.mouth, a.pawOut, a.pawShake * Math.sin(t * a.shakeSpeedL));
      reachR(p, up, REACH.mouth, a.pawOut, a.pawShake * Math.sin(t * a.shakeSpeedR));
      p.earLPitch = p.earRPitch = a.ears * DEGREE;
      p.earBend = a.earsBend;
    },
    tick(t, prev, ctx) {
      if (every(prev, t, E.cry.saysEvery, E.cry.saysFrom)) ctx.say('bubble.cry');
    },
  }),


  hula: tuned(() => E.hula, {
    duration: Infinity,
    expression: () => 'neutral',
    pose(t, p) {
      const a = E.hula;
      const w = TAU * a.beatsPerSecond;
      const s = Math.sin(w * t);
      const c = Math.cos(w * t);
      p.leanX = a.sway * s;
      p.rootYaw = a.turn * DEGREE * Math.sin(w * t * 0.5);
      p.squash = 1 + a.bob * Math.sin(2 * w * t);
      p.rootY = a.rise * Math.abs(s);
      p.skirtZ = a.skirtZ * s;
      p.skirtY = a.skirtY * s;
      p.skirtX = a.skirtX * c;
      p.armLRaise = (a.armRaise + a.armWave * s) * DEGREE;
      p.armRRaise = (a.armRaise - a.armWave * s) * DEGREE;
      p.armLSwing = a.armSwing * DEGREE * c;
      p.armRSwing = -a.armSwing * DEGREE * c;
      // The arms flowing as the hula's do: each elbow and wrist bending as its arm goes down and giving as it
      // rises.
      p.armLBend = (a.elbow - a.elbowWave * s) * DEGREE;
      p.armRBend = (a.elbow + a.elbowWave * s) * DEGREE;
      p.pawLBend = a.pawWave * DEGREE * c;
      p.pawRBend = -a.pawWave * DEGREE * c;
      p.earLRoll = a.earsRoll * DEGREE * s;
      p.earRRoll = -a.earsRoll * DEGREE * s;
      p.sprout = a.sprout * s;
    },
    tick(t, prev, ctx) {
      if (every(prev, t, E.hula.notesEvery, E.hula.notesFrom)) ctx.emote('note', Math.random() < 0.5 ? -1 : 1);
    },
  }),


  // Rakko's ukulele (PLAN.md: he plays it at the bonfire), calm as he is: held across his tummy, its neck up to
  // his left, his right paw (the model's -x side) strumming its body, his left paw up at its neck; swaying a
  // little to its beat.
  ukulele: tuned(() => O.ukulele, {
    duration: Infinity,
    prop: 'ukulele',
    expression: () => 'neutral',
    pose(t, p) {
      const a = O.ukulele;
      const strum = Math.sin(TAU * a.strumsPerSecond * t);
      const sway = Math.sin(TAU * a.swaysPerSecond * t);
      p.armLRaise = (a.strumRaise + a.strumMove * strum) * DEGREE;
      p.armLSwing = a.strumSwing * DEGREE;
      p.armRRaise = a.neckRaise * DEGREE;
      p.armRSwing = a.neckSwing * DEGREE;
      // His right paw strumming at its body, his left on its neck (see UKULELE_AT in Character.ts).
      reachL(p, 1, a.strumAt, 0, a.strumUp * strum);
      reachR(p, 1, a.neckAt, 0, a.neckUp * Math.sin(TAU * a.beatsPerSecond * t));
      p.pawLBend = a.strumPaw * DEGREE * strum;
      p.leanX = a.sway * sway;
      p.rootYaw = a.turn * DEGREE * sway;
      p.squash = 1 + a.bob * Math.sin(TAU * a.beatsPerSecond * t);
      p.rootY = a.rise * Math.abs(sway);
    },
  }),


  // Rakko's sword, which he holds only now and then (the user, 2026-10-22), off his back and up in his right paw
  // (the model's -x side), that arm raised and forward to hold it; serious, as he is with it in hand.
  sword: tuned(() => O.sword, {
    duration: Infinity,
    prop: 'sword',
    expression: () => 'determined',
    pose(t, p) {
      const a = O.sword;
      p.armLRaise = a.armRaise * DEGREE;
      p.armLSwing = a.armSwing * DEGREE;
      // Both paws on its grip before him, one above the other (see SWORD_HOLD in Character.ts).
      reachL(p, 1, a.lowerAt);
      reachR(p, 1, a.upperAt);
      p.squash = 1 + a.breathe * Math.sin(t * a.breatheSpeed);
    },
  }),


  // Kurimanju drinks from the can always in his left paw (the pose's R: see CharacterDef.carries; the user,
  // 2026-10-24): up to his mouth, leaning back with his eyes shut as he drinks, then down, and his ハ〜 (his special
  // face, which his painted 'shocked' is: art/faces/kurimanju/expressions.txt), with a little shake of pleasure.
  drink: tuned(() => O.drink, {
    expression: (t) => (t < O.drink.downAt ? 'smile' : 'shocked'),
    eyesClosed: (t) => t > O.drink.eyesShutFrom && t < O.drink.downAt,
    pose(t, p) {
      const a = O.drink;
      const up = smooth(t / a.upTime) * (1 - smooth((t - a.downAt) / a.upTime));
      reachR(p, up, REACH.mouth, 0, a.pawUp);
      p.leanZ = a.leanBack * up;
      const after = smooth((t - a.downAt) / a.afterTime);
      p.squash = 1 + a.shiver * after * Math.max(0, Math.sin((t - a.downAt) * a.shiverSpeed));
      p.rootRoll = a.wiggle * DEGREE * after * Math.sin((t - a.downAt) * a.wiggleSpeed);
    },
  }),


  // A weapon held up ready (かまえる: the user, 2026-10-24): what is in their paw up before them in both paws, by its
  // foot, pointing ahead and up (see Character.placeHand), as Rakko holds his sword; determined, leaning in a little,
  // bobbing as one ready to go. They may walk so.
  ready: tuned(() => O.ready, {
    duration: Infinity,
    allowMove: true,
    readies: true,
    expression: () => 'determined',
    pose(t, p) {
      const a = O.ready;
      const bob = Math.sin(t * a.bobSpeed);
      p.armLRaise = a.armRaise * DEGREE;
      p.armLSwing = a.armSwing * DEGREE;
      reachL(p, 1, a.lowerAt);
      reachR(p, 1, a.upperAt);
      p.leanZ = a.lean;
      p.squash = 1 + a.bob * bob;
      p.rootY = a.rise * Math.abs(bob);
    },
  }),


  // Reading the book in their paw, standing, and sitting down (settled as they sit, not sitting down afresh).
  read: tuned(() => O.read, {
    duration: Infinity,
    reads: true,
    expression: () => 'neutral',
    pose: readPose,
  }),


  readSeated: tuned(() => O.readSeated, {
    duration: Infinity,
    reads: true,
    expression: () => 'neutral',
    pose(t, p) {
      sitPose(Math.max(t, O.readSeated.settledAt), p);
      readPose(t, p);
    },
  }),


  // The Siren roused (`[anime] siren 3`, the angry plush): her fin-hands, spread a little down at rest,
  // raised out level either side and held there, her red eyes and toothy mouth, until she calms (see
  // Siren.ts).
  menace: tuned(() => O.menace, {
    duration: Infinity,
    expression: () => 'angry',
    pose(t, p) {
      const a = O.menace;
      const up = partAt(t, a.up);
      const breath = Math.sin(t * a.breathSpeed);
      p.armLRaise = p.armRRaise = up * (a.armRaise + a.armBreath * breath) * DEGREE;
      p.squash = 1 + up * (a.swell + a.swellBreath * breath);
      p.leanZ = a.lean * up;
    },
  }),


  // 島二郎 folding his arms as he talks (a line's cue, `[folded]`: see lines.ts and ShimajiroTalk; the user, 2026-10-25:
  // an expression of his to show when talking with him), as the user's drawing of him has them (`shimajiro himself
  // three quarter`), his mouth going as he speaks. His alone: everyone else's arms are too short for his points.
  folded: tuned(() => O.folded, {
    duration: Infinity,
    talking: true,
    expression: () => 'neutral',
    pose(t, p) {
      const a = O.folded;
      reachL(p, 1, a.overAt);
      reachR(p, 1, a.underAt);
      p.squash = 1 + a.breathe * Math.sin(t * a.breatheSpeed);
    },
  }),

  // eigo-friends: yes. The big head dips forward and comes back up, twice, the body giving a little with each dip.
  nod: tuned(() => G.nod, {
    expression: () => 'smile',
    pose(t, p) {
      const a = G.nod;
      const env = partAt(t, a.nodding);
      // 0 up, 1 at the bottom of each dip.
      const dip = env * (0.5 - 0.5 * Math.cos(t * a.nodsPerSecond * TAU));
      p.headNod = a.head * DEGREE * dip;
      p.leanZ = a.lean * dip;
      p.squash = 1 + a.squash * dip;
      p.earLPitch = p.earRPitch = a.ears * DEGREE * dip;
    },
  }),

  // eigo-friends: no. The head turns from side to side, the body turning a little the other way, the ears swinging
  // after it.
  shake: tuned(() => G.shake, {
    expression: () => 'neutral',
    pose(t, p) {
      const a = G.shake;
      const env = partAt(t, a.shaking);
      const w = t * a.shakesPerSecond * TAU;
      const side = env * Math.sin(w);
      p.headTurn = a.head * DEGREE * side;
      p.rootYaw = -a.body * DEGREE * side;
      p.leanX = a.lean * side;
      const lag = env * Math.sin(w - a.earsLag);
      p.earLRoll = a.ears * DEGREE * lag;
      p.earRRoll = -a.ears * DEGREE * lag;
    },
  }),

  // eigo-friends: listening (while English plays). One paw held up by the side of the head, cupped toward the voice;
  // the head tilted toward it and turned a little, nodding gently along; the ears perked. Held until stopped.
  listen: tuned(() => G.listen, {
    duration: Infinity,
    oneHand: true,
    expression: () => 'neutral',
    pose(t, p) {
      const a = G.listen;
      const up = partAt(t, a.up);
      p.armRRaise = a.armRaise * DEGREE * up;
      p.armRSwing = a.armSwing * DEGREE * up;
      reachR(p, up, a.at);
      p.pawRBend = a.pawBend * DEGREE * up;
      const bob = Math.sin(t * a.bobSpeed);
      // Tilted toward the raised paw (the model's +x side), as one leans an ear toward a voice.
      p.headTilt = -a.tilt * DEGREE * up;
      p.headTurn = a.turn * DEGREE * up;
      p.headNod = a.bob * 6 * bob * up;
      p.leanX = a.lean * up;
      p.squash = 1 + a.bob * bob * up;
      p.earLPitch = p.earRPitch = a.ears * DEGREE * up;
      p.earLRoll = a.earsRoll * DEGREE * up;
      p.earRRoll = -a.earsRoll * DEGREE * up;
      p.gazeX = a.gaze * up;
    },
  }),
};
