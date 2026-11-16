import * as THREE from 'three';
import type { CharacterDef, ExpressionId, Gait } from './types';
import { MAX_PARTS, PART, type AnchorName, type CharacterModel, type OutfitModel } from './Model';
import { ArmRig, type ArmPose, type ArmTurns } from './Arms';
import HOLD_DATA from './holds.json';
import GAIT_DATA from './gaits.json';
import MOVEMENT_DATA from './movement.json';
import { BodyPose, BodyShape } from './BodyShape';
import { gripThickness, heldAt, type HoldWay } from './Holding';
import {
  createCharacterMaterials,
  makeCharacterUniforms,
  makeOutfitUniforms,
  sharedUniforms,
  type CharacterUniforms,
} from './CharacterMaterial';
import { Face } from './Face';
import { groundShadows } from './GroundShadows';
import { Spring } from './Springs';
import { copyPose, lerpPose, resetPose, restPose, type Pose } from './Pose';
import { ACTIONS, type ActionContext, type ActionId, type HeldMove } from './Actions';
import type { EmoteHost, EmoteSystem } from './Emotes';
import { has, t } from '../i18n/I18n';
import { penAt } from '../world/Ink';
import { showOpen, type HeldLight } from './Props';
import { CANOPY_SHADE, FILM, MIRROR_LAYER } from '../world/Look';

export interface CharacterOptions {
  /** Background extra: flat tint, and a drawn face on a small canvas (the islanders' cheek marks). */
  crowd?: { color: THREE.ColorRepresentation };
  /** An outfit asset fitted to this character (the island outfit). Worn until taken off, unless they have
   * clothes of their own. */
  outfit?: OutfitModel;
  /** Their own clothes, fitted to them as the island outfit is and worn instead of it (Rakko's cape: see
   * CharacterDef.own), and what they carry with them (his sword), made by createHeld. */
  own?: { outfit: OutfitModel; carry?: THREE.Object3D };
  /** What they always have in their left hand (Kurimanju's can: see CharacterDef.carries), made by
   * createHeld. */
  carry?: THREE.Object3D;
  /** What they play in its action (Rakko's ukulele: see CharacterDef.plays), made by createHeld. */
  instrument?: THREE.Object3D;
}

/**
 * How each walks (their walk style: see Gait), by who they are (CharacterDef.id). They live in characters/gaits.json,
 * tuned by eye in the testing ground (dev/Dev.ts, its Tune: walk style) and saved there, and are read every frame. As
 * each was made (the user, 2026-10-23):
 * - Chiikawa: small quick steps, a little wobble.
 * - Hachiware: even and bouncy, cheerful.
 * - Usagi: springy, swinging her arms wide; the quickest to get going, stop and turn.
 * - Momonga: brisk short steps, a perky bounce.
 * - Kurimanju: relaxed and heavier: slower to get going and to turn, hardly bobbing, upright.
 * - Rakko: calm long strides, steady.
 * - Furuhonya: quick shuffling little steps.
 * - Shisa: neat and brisk.
 * - You (the islander, 'player'): the plain way. Hitoha and Futaba: as islanders walk, each a little differently
 *   from it (each made once from a number of their own, till 2026-11-12; how much faster or slower than the plain
 *   way they went is in their speeds now).
 * The very object tuned (changed in place, never replaced): whoever is made walks by it as it is.
 */
export const GAITS: Record<string, Gait> = GAIT_DATA;
/** The plain way of walking (see Gait), for whoever has none of their own in GAITS. */
const PLAIN_GAIT: Gait = { stride: 1, bounce: 1, sway: 1, arms: 1, lift: 1, lean: 1, quick: 1 };

export interface FrameContext {
  camera: THREE.Camera;
  viewHeight: number;
  pixelRatio: number;
  /** Height of what someone stands on at (x, z), within a step of where their feet were. */
  groundHeight: (x: number, z: number, feet?: number) => number;
  /** As groundHeight, and the top of anything short (a cushion, a log, a counter) they are up on or come
   * down on there (see Island.footing); groundHeight alone where it is left out. */
  footing?: (x: number, z: number, feet: number) => number;
  /** As footing, for someone in the air: what they come down on, a top a little over their feet too (see
   * Ground.landing); footing where it is left out. */
  landing?: (x: number, z: number, feet: number) => number;
  /** Keeps a character who moved from `from` (from.y: their feet) to `p` on ground they can stand on; given
   * `drops`, letting them step down off the edge of what they stand on (see Character.drops). */
  clamp: (p: THREE.Vector3, from: THREE.Vector3, drops?: boolean) => void;
  /** In the air, their feet at `y`: keeps a character who moved from `from` to `p` from passing into
   * anything standing higher than their feet. Without it, jumps go straight up and down and no one
   * falls off an edge. */
  air?: (p: THREE.Vector3, from: THREE.Vector3, y: number) => void;
  /** Whether someone whose feet came down to `y` at p fell into water too deep to stand in; if so,
   * p is moved to the nearest place they can climb out. */
  splash?: (p: THREE.Vector3, y: number) => boolean;
  /** How deep in the trees' shade a point is, 0 in the sun to 1: in the film look only. */
  shade?: (x: number, y: number, z: number) => number;
  /** The firelight on someone at a point after dark: the strongest lights' ways from them and how
   * much each warms them, into `out`, and where the strongest is, into `from`; `seen` is their own
   * memory of how clearly each light reaches them, eased over `dt`. Returns how much a lit room they
   * stand in warms them all round (see Firelight.lightsAt). In the film look only. */
  firelight?: (
    x: number,
    y: number,
    z: number,
    seen: Map<number, number>,
    dt: number,
    out: THREE.Vector4[],
    from: THREE.Vector3,
  ) => number;
  /** In the forbidden cave, its own light on someone at a point, into `out`; false outside it. In the
   * film look only. */
  caveLight?: (x: number, y: number, z: number, out: THREE.Color) => boolean;
}

/** Where someone riding in something sits (feet, x, y, z) and which way they face. */
export interface Ride {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/**
 * How everyone moves, in numbers. They live in characters/movement.json, tuned by eye in the testing ground (dev/Dev.ts,
 * its Tune: moving) and saved there, and are read afresh every frame. Angles in degrees.
 */
export interface Movement {
  everyone: {
    /** How hard they fall (metres a second each second), and how fast a jump leaves the ground (metres a second). */
    gravity: number;
    jumpSpeed: number;
    /** Holding the jump, they rise higher (the user, 2026-10-23: it had made no difference): for up to `holdTime`
     * after leaving the ground (seconds), while it is held and they are still rising, gravity pulls them only
     * `holdGravity` as hard. A tap jumps 0.7 m high, as every jump had; held all the way, about 1 m. */
    holdTime: number;
    holdGravity: number;
    /** Crouched this long before a jump (seconds); a jump asked for `jumpEarly` before they land is jumped as they
     * land, and walked off an edge, they may still jump for `jumpLate`. */
    crouch: number;
    jumpEarly: number;
    jumpLate: number;
    /**
     * How quickly someone on their feet takes the pace they want (the user chose a light touch, 2026-10-23): it eases
     * there as a critically damped spring does, with no jolt as it starts or as it ends, as fast as `getGoing` when
     * they speed up (radians a second: from standing to a run in about 0.25 s) and as `slowDown` when they slow down or
     * turn (from a run to standing in about 0.15 s), each for their quickness (Gait.quick). Before, they took a run's
     * pace in 0.19 s at a steady 16 m/s², and stopped as hard.
     */
    getGoing: number;
    slowDown: number;
    /** In the air they carry on as they were going: the stick steers them only this much (m/s², about a third of
     * how their feet do), and letting it go slows them not at all (the user, 2026-10-23). */
    airSteer: number;
    /** How much faster than they run they sprint (Shift, or the stick held at its edge: see Input.sprint): twice (the
     * user, 2026-10-23: 1.4 times was not fast enough). */
    sprint: number;
    /** Turning, their body turns no faster than this (degrees a second, for their quickness): a half turn on the spot
     * in about half a second, not swung round at once (before 2026-10-23, 0.25 s). On the spot they step round as they
     * turn, a step each `turnStep` (degrees). */
    turnMost: number;
    turnStep: number;
  };
  /** How fast each walks and runs (metres a second, by who they are: CharacterDef.id). */
  walk: Record<string, number>;
  run: Record<string, number>;
  /** Your friends (main.ts): further from you than `followFrom` (metres), they come after you, and stop once
   * `followTo` near; walking, running from `runFrom` off and sprinting from `sprintFrom`. A puff within `helpWithin` of
   * you, they run at it (sprinting from `helpSprintFrom` off), and swing from `helpReach` near it. */
  friends: {
    followFrom: number;
    followTo: number;
    runFrom: number;
    sprintFrom: number;
    helpWithin: number;
    helpReach: number;
    helpSprintFrom: number;
  };
}

/** How everyone moves: the very object the testing ground tunes (changed in place, never replaced). */
export const MOVEMENT: Movement = MOVEMENT_DATA;
const MOVE = MOVEMENT.everyone;
/** The walk and run of one who has none of their own there (the Siren and those who keep to their places: their pace
 * is never used). */
const RESTING_WALK = 1;
const RESTING_RUN = 2;
/** Walking off an edge deeper than this is a fall, not a step down. */
const DROP = 0.25;
/** How dark the firelight's shadow is for how much the light warms them: full where a light warms
 * them a third of the way (see FrameContext.firelight). */
const FIRE_SHADOW = 3;

/**
 * How someone's head turns to keep their eyes on what they watch (see Character.watch), in radians: up to
 * `yaw` to either side, `up` and `down`, looking up or down only `share` of the way there (a gentle nod:
 * all the way looked weird to the user, 2026-10-22), easing to it at `rate` a second. Past `turn` to one
 * side their body turns to face it too, until it nearly does (the user: the head first, the body only once
 * the head has turned past a point). With `turn` null the body never turns, and the head gives up on what
 * is too far round to one side.
 */
export interface HeadLook {
  yaw: number;
  up: number;
  down: number;
  share: number;
  rate: number;
  turn: number | null;
}
export const HEAD_LOOK: HeadLook = { yaw: 0.5, up: 0.25, down: 0.25, share: 0.5, rate: 5, turn: 0.5 };
/** Faster than this (metres a second) they are walking: their body faces the way they go, and their head turns
 * only this share of its reach to what they watch (see updateHead). */
const WALKING = 0.35;
const WALKING_LOOK = 0.35;
/** How much a lean tips the head (see actionTilt): the body bends as the square of its height (the material's
 * lean), so its slope near the head's height is about this many times the lean. */
const HEAD_BEND = 1.7;
/** What they hold in their right paw (see Character.hold), in their model's frame: upright, at the paw's tip,
 * leaning this far forward (radians); flat, this far ahead of it and up; eaten, this far out from the mouth and
 * down from it, tipped this far back toward it. Upright, it is held by its side (see Holding.ts
 * heldAt); what they always carry in their left paw (Kurimanju's can) too, upright at
 * its tip. (Their own right paw, as the film's Chiikawa holds her さすまた (the user, 2026-10-24: things had been
 * held in the other): the pose's L arm and the handL anchor, on the model's -x side, which are named as they are seen
 * from before them; their left, the pose's R arm, does one-pawed gestures, the wave and the talk.) */
const HAND_LEAN = 0.15;
const HAND_FLAT_AHEAD = 0.07;
const HAND_FLAT_UP = 0.03;
const HAND_MOUTH_OUT = 0.08;
const HAND_MOUTH_DOWN = 0.08;
const HAND_MOUTH_TIP = -0.35;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const HELD_TURN: Record<HoldWay, THREE.Quaternion> = {
  upright: new THREE.Quaternion().setFromAxisAngle(X_AXIS, HAND_LEAN),
  flat: new THREE.Quaternion(),
  eat: new THREE.Quaternion().setFromAxisAngle(X_AXIS, HAND_MOUTH_TIP),
  // (A weapon is turned as its kind is carried and its attack swings it: see placeHand.)
  gripped: new THREE.Quaternion(),
};
const CARRY_TURN = new THREE.Quaternion();
/** A book they read (an action that `reads`: see Actions.ts), open before their face under their chin, as Hachiware reads
 * the film's: the middle of its near edge this far from their mouth (in their head's frame, metres), its pages facing
 * this far up from square on to them (radians), toward their eyes; its left half swinging open in so many seconds. */
const READ_AT = new THREE.Vector3(0, -0.09, 0.07);
const READ_UP = 1.1;
const READ_OPEN = 0.45;
const READ_TURN = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
  .multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2 - READ_UP));
/** A weapon held up ready (an action that `readies`, かまえる: see Actions.ts): by its foot (ItemDef.ready) between their
 * paws before them, leaning this far forward, pointing ahead and up, and this far out to the side of the paw that holds
 * it, clear of their face (radians). */
const READY_FORWARD = 0.75;
const READY_OUT = 0.45;
const _readyTurn = new THREE.Quaternion();
const _swingTurn = new THREE.Quaternion();
const _weaponTurn = new THREE.Quaternion();
const _acrossFront = new THREE.Vector3();
const _acrossUp = new THREE.Vector3();
const _acrossBasis = new THREE.Matrix4();
const _weaponWay = new THREE.Vector3();
const _heldMove: HeldMove = { blend: 0, yaw: 0, pitch: 0, roll: 0, thrust: 0 };
/** They stand square to the ground under them (see squareToHill): how steeply it rises is taken over this far each side of
 * them, along the world's x and z (metres: about as far as what they hold reaches, a club coming down, a fork shooting
 * out); they tilt at most so far (radians: the meadow's steepest is a little less), and follow the ground this fast (a
 * second: smoothly over each bump). */
const SLOPE_REACH = 0.5;
const MOST_TILT = 0.4;
const TILT_FOLLOW = 12;
const _upright = new THREE.Vector3(0, 1, 0);
const _groundUp = new THREE.Vector3();
const _tiltTurn = new THREE.Quaternion();
/** How a weapon is carried (hunt/Weapons.ts WeaponDef.hold, a held thing's userData.hold; see placeHand). */
export type WeaponHold = 'across' | 'ahead' | 'raised' | 'palm';
/** A point a paw reaches for, as Actions' REACH: out to its own side, up from the eyes, forward, in face radii. */
type Reach = [number, number, number];
/**
 * A weapon carried across before them in both paws ('across': a fork), as the official drawing of Hachiware with his
 * さすまた has it (the user, 2026-11-12, two pictures: the second, his paws wide apart on its staff at his two sides, the
 * staff across his whole front): where each paw reaches, their right holding its foot and their left further up it; its
 * grip's middle this far from their right paw along the way to their left (`past`; below 0, out past it), and the
 * weapon this far under the paws and ahead of them (`under`, `ahead`; metres). An attack moves it from there
 * (ActionDef.held).
 */
export interface AcrossHold {
  right: Reach;
  left: Reach;
  past: number;
  under: number;
  ahead: number;
}
/**
 * How each other kind of weapon is carried: where their right paw holds it (`paw`), and their left too, holding it with
 * both (`other`); the way it points from there, in degrees (`aim`: round from straight ahead toward the right paw's
 * side, and up from level; pointing back past upright, the turn the other way round takes it out to that side; or, for
 * a weapon standing up from the paw, `lean`: out toward that side, and forward, from upright, as seen from before them
 * and from their side), and how far it is turned about its length from there (`roll`, degrees: see placeHand); and how
 * far up off the paws it sits and ahead of them (`up`, `ahead`, metres), and out to the right paw's side of its middle (`aside`, metres: held by
 * the paw's outer side, which an attack lets go of, swinging it from the paw's middle). Every paw where the stub arms
 * reach easily, at most as high and as far out as a fork's or a wave's: sent further, as high as the cheek (the club on
 * the shoulder, the sword beside the head), the arm was stretched out straight and turned, and looked "bend backwards"
 * (the user, 2026-11-12), the paw 8 cm short of where it was sent. Nothing moves the weapon out of them as they play
 * (see placeHand): what goes into anyone is found by the checks (dev/Checks.ts) and put right here.
 * (The user, 2026-11-12, the holds "not the best": the club had been carried across them
 * as a fork is, a rolling pin; the sword and the stone held low against their side, the stone a lump there, the sword
 * half inside them.) As the user drew them (2026-11-12, two drawings of Chiikawa):
 * - a club ('ahead') in their right paw at their side, where the stub arm hangs, pointing ahead and a little up, its
 *   heavy head out before them, the paw over its handle (drawn from the side: its handle, thicker than the stub's paw,
 *   hid the paw held through its middle; a smash heaves it up from there, over, and down ahead: see Actions' smash);
 * - a sword ('raised') upright in their right paw at their side, where the stub arm ends, leaning out from them a fifth
 *   of a right angle beside their head and clear of it, as drawn from before them, and a little forward; held by the
 *   paw's outer side, its blade turned an eighth of a turn from facing ahead. (The drawing's paw is further out than
 *   the stub arms reach, under the head's widest: from where they reach, held by the paw's middle, its face ahead, its
 *   guard and blade went 4 cm into the head's wide rim, and so leaning, its middle alone touched that rim. Leaning a
 *   third of a right angle instead, its face ahead, it cleared; the user chose it turned, 2026-11-12.)
 * - a stone ('palm') held up before their chest in both paws, as a sea otter holds its stone.
 */
export interface CarryHold {
  paw: Reach;
  other?: Reach;
  aim?: [number, number];
  lean?: [number, number];
  roll: number;
  up: number;
  aside: number;
  ahead: number;
}
export type Holds = { across: AcrossHold } & Record<Exclude<WeaponHold, 'across'>, CarryHold>;
/**
 * Every kind of carry's numbers, as above, kept in holds.json: tuned by eye in the testing ground (development only:
 * dev/Dev.ts's Tune), which changes them here as it is played with, each change seen at once, and saves them there.
 * (Read afresh every frame: changed in place, never replaced.)
 */
export const HOLDS = HOLD_DATA as Holds;
const DEGREE = Math.PI / 180;
/** The way `carry` points (see CarryHold's aim and lean), as yaw and pitch in radians, into `out`. */
export function aimOf(carry: CarryHold, out: { yaw: number; pitch: number }): { yaw: number; pitch: number } {
  if (carry.lean) {
    const x = Math.tan(carry.lean[0] * DEGREE);
    const z = Math.tan(carry.lean[1] * DEGREE);
    out.yaw = Math.atan2(x, z);
    out.pitch = Math.atan2(1, Math.hypot(x, z));
  } else {
    out.yaw = (carry.aim?.[0] ?? 0) * DEGREE;
    out.pitch = (carry.aim?.[1] ?? 0) * DEGREE;
  }
  return out;
}
const _aim = { yaw: 0, pitch: 0 };
const _readyEuler = new THREE.Euler();
/** The cave's torch in a staged shot (see holdTorch), held up at the paw's tip leaning this far forward. */
const TORCH_TURN = new THREE.Quaternion().setFromAxisAngle(X_AXIS, 0.25);
/** Rakko's sword is on his back, as he usually carries it (the user, 2026-10-22), in the middle of it (the user: not
 * out over his right shoulder): its hilt up behind the foot of his head, its blade down his back over his cape,
 * leaning a little to his left (the model's +x), clear of his head's round back and his cape. Its guard's top, in
 * his body's own frame at rest (metres), and the way its blade runs from there; its flat faces out from his back. */
const SWORD_BACK_GUARD = new THREE.Vector3(-0.035, 0.46, -0.425);
const SWORD_BACK_WAY = new THREE.Vector3(0.07, -0.28, 0.045).normalize();
/** From the sword's origin, the middle of its grip, to its guard's top (art/blender/build_props.py SWORD). */
const SWORD_GRIP_TO_GUARD = 0.0575;
/** Where its grip's middle is, and how it is turned, on his back. */
const SWORD_BACK_AT = SWORD_BACK_GUARD.clone().addScaledVector(SWORD_BACK_WAY, -SWORD_GRIP_TO_GUARD);
const SWORD_BACK_TURN = (() => {
  const middle = SWORD_BACK_GUARD.clone().addScaledVector(SWORD_BACK_WAY, 0.14);
  const out = new THREE.Vector3(middle.x, 0, middle.z).normalize();
  out.addScaledVector(SWORD_BACK_WAY, -out.dot(SWORD_BACK_WAY)).normalize();
  const across = new THREE.Vector3().crossVectors(SWORD_BACK_WAY, out);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, SWORD_BACK_WAY, out));
})();
/** Only now and then he holds it (the 'sword' action): up point first, as the film has it (`[anime] rakko 1`), in
 * both paws before him (the sword action's lowerAt and upperAt: characters/actions.json). Its grip's middle there, in his body's own frame at rest
 * (metres), before his chest under his cape's neck band (at the band, as before 2026-10-23, the band crossed its
 * grip); its point leaning this far forward and this far out to his left (radians), clear of his head. Held in one
 * paw, as before arms bent, by a model whose arms do not: its grip this far ahead of the paw's tip and in toward his
 * middle (metres). */
const SWORD_HOLD = new THREE.Vector3(0, 0.195, 0.33);
const SWORD_FORWARD = 0.6;
const SWORD_OUT = 0.35;
const SWORD_AHEAD = 0.03;
const SWORD_INWARD = 0.02;
/** How the sword is turned in his body's own frame (it turns as his body does, bowing or swaying): held in both
 * paws, and in one. */
const SWORD_HELD_TURN = new THREE.Quaternion().setFromEuler(new THREE.Euler(SWORD_FORWARD, 0, -SWORD_OUT, 'YXZ'));
const SWORD_STUB_TURN = new THREE.Quaternion().setFromEuler(new THREE.Euler(SWORD_FORWARD, 0, SWORD_OUT, 'YXZ'));
/** Where his ukulele is held while he plays it (and anyone's), in his body's own frame at rest (metres): across his
 * tummy, under his cape's neck band (at its height, as before 2026-10-23, the band went through its body), in his
 * paws (the ukulele action's strumAt and neckAt: characters/actions.json), its body to his right; tipped this far back (radians) and its neck this far up
 * to his left; so turned in his body's own frame, as it turns. */
const UKULELE_AT = new THREE.Vector3(-0.03, 0.2, 0.37);
const UKULELE_BACK = -0.25;
const UKULELE_UP = 0.45;
const UKULELE_TURN = new THREE.Quaternion().setFromEuler(new THREE.Euler(UKULELE_BACK, 0, UKULELE_UP, 'YXZ'));
/** How much wider a grass skirt's hem spreads as they sit (a share of its radius standing), as the film's skirts
 * pool on the ground round them by the bonfire (`[anime] chiikawa 5`): shorter only, the skirt read as their
 * sinking into the ground (the user, 2026-10-23). */
const SKIRT_FLARE = 0.5;
/** A seat this much higher than the floor under it (metres) is raised: a stool, a log, a bed (see seatedHigh). */
const RAISED_SEAT = 0.06;
/** For a model without feet of its own, how far out each foot stands from their middle and how big it is, for
 * their width: as the cast's are (see sole). */
const FOOT_APART = 0.1;
const FOOT_SIZE = 0.104;
/** How arms that bend are held at rest (see locomotionPose): as the model is built, straight, not bent at the elbow
 * or the wrist (the user, 2026-11-11: "chiikawa hands doesnt bend"). In this game the model's own arms are short
 * thin stubs out of the crease under the head's rim, straight out and a little down, after the model the user
 * chose (art/blender/import_characters.py ARM): they are right as built, so nothing is added here. (In Mermaid
 * Island, on thicker arms out of the body's side, they hung 0.3 lower, swung 0.2 forward and bent 0.5 at the elbow
 * and 0.25 at the wrist; hung down straight, those read as shoulders, or stood off from the body.) `raise` lowers
 * them (negative, radians) and `swing` brings them forward, should they want to hang more. */
const REST_ARM = { raise: 0, swing: 0, bend: 0, paw: 0 };
/** An arm whose paw holds a thing: raised out and swung a little forward, nearly straight, so the paw is out before
 * their side, clear of the head's rim over it (tucked in under it, as before 2026-10-23, whatever it held rose into
 * the head: see Holding.ts); walking, it sways only this share of an empty arm's swing; seated, it is raised this much
 * more, so what it holds is up off the ground and the skirt spread on it. The cave's torch, held up, as before. */
const HOLD_ARM = { raise: 0.2, swing: 0.25, bend: 0.2, paw: 0.25, sway: 0.3, seated: 0.5 };
const TORCH_ARM = { raise: 0.55, swing: 0.55, bend: 0.75 };
/** Turning to face what they watch, the body stops this near it (radians) and turns this fast (a second). */
const TURN_DONE = 0.08;
const TURN_RATE = 4;
/** Bent over the water to look into it (see setBow), how much of their face's turn down is their head's own, bowing
 * about its neck, the rest their body's leaning: their head with their body under it, as one leaning over a pond
 * shows in it, rather than all of them turned over flat (a flat picture of them, seen from below) or their head
 * alone (a head with nothing under it), both of which the user found wrong (2026-10-22, 2026-10-23). */
const BOW_HEAD_SHARE = 0.52;

const _v = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _w = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();
const _from = new THREE.Vector3();
const _cave = new THREE.Color();
const _tint = new THREE.Color();
const _s = new THREE.Vector3();
const _eyes = new THREE.Vector3();
const _way = new THREE.Vector3();
const _toLocal = new THREE.Matrix4();
const _grip = new THREE.Vector3();
const _off = new THREE.Vector3();
const _turnNow = new THREE.Quaternion();
const _eatTurn = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, x: number) => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Faded as the camera nears them (see Character.updateFade): from this far off the middle of them (metres: nearer
 * than the camera ever comes to you, CameraRig's NEAREST, 1.4 m off your eyes), most of the way by `to`, all of it by
 * `gone`; easing at `rate` (a second's share). */
const FADE = { from: 1.2, to: 0.8, gone: 0.5, most: 0.75, rate: 12 };

const shadowGeometry = new THREE.PlaneGeometry(1, 1);
/** How dark the soft round shadow under them is, of what it was when it was their only shadow. */
const CONTACT_SHADOW = 0.6;
const _slope = new THREE.Vector3();
/** The way a shadow's plane faces as made. */
const _facingUp = new THREE.Vector3(0, 0, 1);

/** A shadow on the ground: where it lies, its colour and how dark it is, drawn with everyone's (see
 * GroundShadows). */
function makeShadow(): THREE.Mesh {
  const mesh = new THREE.Mesh(shadowGeometry, new THREE.MeshBasicMaterial());
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** A shadow cast along the ground from their feet (see updateFireShadow), drawn with everyone's. */
function makeCastShadow(): THREE.Mesh {
  const mesh = new THREE.Mesh(shadowGeometry, new THREE.MeshBasicMaterial());
  mesh.visible = false;
  return mesh;
}

/** A pose the other way round: its arms left for right, its lean and its turn to the other side (see
 * ActionDef.oneHand). (The arms' angles and where their paws reach are each given on their own side.) */
function mirrorArms(p: Pose): void {
  let t = p.armLRaise;
  p.armLRaise = p.armRRaise;
  p.armRRaise = t;
  t = p.armLSwing;
  p.armLSwing = p.armRSwing;
  p.armRSwing = t;
  t = p.armLBend;
  p.armLBend = p.armRBend;
  p.armRBend = t;
  t = p.pawLBend;
  p.pawLBend = p.pawRBend;
  p.pawRBend = t;
  t = p.reachL;
  p.reachL = p.reachR;
  p.reachR = t;
  t = p.reachLX;
  p.reachLX = p.reachRX;
  p.reachRX = t;
  t = p.reachLY;
  p.reachLY = p.reachRY;
  p.reachRY = t;
  t = p.reachLZ;
  p.reachLZ = p.reachRZ;
  p.reachRZ = t;
  p.leanX = -p.leanX;
  p.rootRoll = -p.rootRoll;
  p.rootYaw = -p.rootYaw;
  p.gazeX = -p.gazeX;
}

/** One arm of `to` (its `side`'s) as `from` has it (see ActionDef.fullPawHolds). */
function keepArm(from: Pose, to: Pose, side: 'L' | 'R'): void {
  if (side === 'L') {
    to.armLRaise = from.armLRaise;
    to.armLSwing = from.armLSwing;
    to.armLBend = from.armLBend;
    to.pawLBend = from.pawLBend;
    to.reachL = from.reachL;
    to.reachLX = from.reachLX;
    to.reachLY = from.reachLY;
    to.reachLZ = from.reachLZ;
  } else {
    to.armRRaise = from.armRRaise;
    to.armRSwing = from.armRSwing;
    to.armRBend = from.armRBend;
    to.pawRBend = from.pawRBend;
    to.reachR = from.reachR;
    to.reachRX = from.reachRX;
    to.reachRY = from.reachRY;
    to.reachRZ = from.reachRZ;
  }
}

/**
 * One character: the Blender model, a soft-body shader, springs for
 * follow-through, procedural actions and a drawn face.
 */
export class Character implements EmoteHost {
  readonly def: CharacterDef;
  /** How they walk (see Gait): theirs in GAITS, as it is tuned. */
  readonly gait: Gait;
  readonly root = new THREE.Group();
  readonly face: Face;
  readonly height: number;
  readonly width: number;
  readonly velocity = new THREE.Vector3();
  readonly pose = restPose();
  facing = 0;
  /** The face shown when no action is playing (the Test panel's choice); null for neutral. */
  expressionOverride: ExpressionId | null = null;
  /** The face a line they say has them make while it shows (see life/lines.ts cues), over any action's own. */
  lineFace: ExpressionId | null = null;
  /** eigo-friends: their mouth going as if talking, whatever they do (the app's StageApi.setTalking, only ever for
   * their own text bubble, never while English audio plays). */
  talkingOverride = false;
  /** The way they face whichever way they walk: where you look, out of their eyes (see
   * FirstPersonCamera); null to face the way they walk. */
  look: number | null = null;
  /** Whether they may walk off the edge of what they stand on (a hut's porch, the stage, a cushion): the one
   * you play (the user, 2026-10-23). The islanders keep to what they walk on, as their way about does. */
  drops = false;
  /** Whether their jump is still held (Space or the jump button, for the one you play): rising, they go higher
   * (see Movement's holdTime). The islanders' hops are all alike. */
  jumpHeld = false;
  /** How far they are bent over to look into the water, 0 to 1, and where their eyes are carried to
   * then (see setBow). */
  bowAmount = 0;
  readonly bowAt = new THREE.Vector3();
  /** How far the head is bowed forward about its neck (radians, up negative) and turned to their right
   * (the model's +x side), as they watch something (see watch). Models built before the head was a part
   * of its own keep it still. */
  headPitch = 0;
  headYaw = 0;

  private readonly model: CharacterModel;
  /** Everything of them in the scene: their body (root), their shadows and what they hold (see setShown). */
  private readonly all = new THREE.Group();
  private readonly poseGroup = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  /** The pen's hull round the body. */
  private readonly outline: THREE.Mesh;
  /** Whether the camera looks out of their eyes, so that they show only in the calm water's mirror
   * (see setUnseen). */
  private unseen = false;
  private readonly uniforms: CharacterUniforms;
  /** How far they are faded out as the camera nears them (see updateFade). */
  private fade = 0;
  private readonly parts: THREE.Matrix4[];
  /** Their arms, if they bend (see Arms.ts), and how each is turned this frame. */
  private readonly armRig: ArmRig | null;
  private readonly armTurns: [ArmTurns, ArmTurns] = [0, 1].map(() => ({
    upper: new THREE.Quaternion(),
    fore: new THREE.Quaternion(),
    paw: new THREE.Quaternion(),
    shoulder: new THREE.Vector3(),
  })) as [ArmTurns, ArmTurns];
  private readonly armPose: ArmPose = { raise: 0, swing: 0, bend: 0, pawBend: 0, reach: 0, x: 0, y: 0, z: 0 };
  private readonly shadow: THREE.Mesh;
  /** The shadow the strongest firelight casts after dark, leaning away from it along the ground. */
  private readonly fireShadow: THREE.Mesh;
  /** How clearly each firelight reaches them (see FrameContext.firelight), and where the strongest
   * one burns. */
  private readonly fireSeen = new Map<number, number>();
  private readonly fireFrom = new THREE.Vector3();
  /** A torch held up in the right hand (in the cave), or none. */
  private torch: THREE.Object3D | null = null;
  /** What they hold in their right paw (one of the things one carries: see life/Items.ts), held flat on it
   * or upright in it; or none. Put away while they hold the cave's torch. */
  private hand: THREE.Object3D | null = null;
  private handFlat = false;
  /** Whether it is out of their paw a while (thrown: see emptyHand). */
  private handGone = false;
  /** Their own shape, which the testing ground measures how deep a point is in them by (see depthAtWorld; made only
   * then: see BodyShape.ts); and how thick what is in their right paw is where it is held, what is in their left, and the
   * cave's torch (see Holding.ts heldAt: a thing held upright is held by its side). */
  private readonly bodyShape: BodyShape;
  private handThick = 0;
  private carryThick = 0;
  private torchThick = 0;
  /** As they are this frame, for their shape (see BodyShape.depthAt), taken when first measured in it (on the update
   * `poseTaken` says; updated, `updates` more). */
  private readonly bodyPose = new BodyPose();
  private updates = 0;
  private poseTaken = -1;
  /** What they always have in their left hand (see CharacterOptions.carry), or none. */
  private readonly carried: THREE.Object3D | null;
  /** The way a weapon carried across them runs, from their right paw to their left (see placeHand). */
  private readonly acrossWay = new THREE.Vector3();
  /** Where what they hold in both paws sits from their right paw, halfway to their left (see placeHand): kept while an
   * emote takes their left off it. */
  private readonly between = new THREE.Vector3();
  /** How their weapon was last placed (see placeHand: the way it points, how far it is turned about its length and moved
   * to its side, and pushed out along itself), and how it was as their pose last began to blend (see startBlend): what
   * it eases from, as their body does. */
  private readonly weaponNow = { yaw: 0, pitch: 0, roll: 0, side: 0, thrust: 0 };
  private readonly weaponFrom = { yaw: 0, pitch: 0, roll: 0, side: 0, thrust: 0 };
  /** How steeply the ground under them rises, as they follow it (see squareToHill): along the world's x and along its
   * z, each as a rise over a run (the world's, not as they face: turning on a hill, they still lean with it). */
  private readonly tilt = { x: 0, z: 0 };
  /** The action last stopped: what their pose eases back out of (see otherPawOff). */
  private lastAction: ActionId | null = null;
  /** What they carry with their own clothes (Rakko's sword: see CharacterOptions.own), or none. */
  private readonly ownCarried: THREE.Object3D | null;
  /** Their own thing (Rakko's sword) lent out (see lendOwn): not on their back, nor theirs to hold up. */
  private ownLent = false;
  /** What they play (see CharacterOptions.instrument), shown while they play it; or none. */
  private readonly instrument: THREE.Object3D | null;
  /** Where they sit while riding in the boat, or null on their own feet. */
  ride: Ride | null = null;
  /** Whether what they sit on is raised off the floor under it (see RAISED_SEAT). */
  private seatedHigh = false;
  private readonly outfit: THREE.Group | null = null;
  /** Their own clothes, worn instead of the island outfit (see CharacterOptions.own), or none. */
  private readonly ownOutfit: THREE.Group | null = null;
  /** Whether outfits are on at all (the Test panel's 島の衣装), and whether someone with clothes of their own
   * wears the island outfit instead (only ever from the Test panel). */
  private outfitsOn = true;
  private islandInstead = false;
  /** The skirt's height when seated, as a fraction of standing, so its hem settles on the ground. */
  private readonly skirtSeat: number = 1;
  /** Wears a grass skirt that is part of the model (the islanders), not an outfit. */
  private readonly ownSkirt: boolean;
  private emotes: EmoteSystem | null = null;

  private readonly desired = new THREE.Vector3();
  private readonly accel = new THREE.Vector3();
  /** How fast their pace is changing on their feet (m/s², flat): the spring their pace eases by (see Movement's getGoing). */
  private readonly easing = new THREE.Vector3();
  /** A jump asked for in the air, jumped as they land, for this much longer (seconds); and how much longer they
   * may still jump, having walked off an edge. */
  private jumpEarly = 0;
  private jumpLate = 0;
  /** How much longer holding the jump keeps lifting them (seconds, see Movement's holdTime); none once let go. */
  private lift = 0;
  /** Turning on the spot: how fast their body turns (radians a second, eased), how far round their steps have gone
   * (as phase is for walking), and how much they step round, 0 to 1. */
  private turnRate = 0;
  private turnPhase = 0;
  private turnSteps = 0;
  /** What they keep their eyes on (see watch), and how. */
  private watching = false;
  private readonly watchAt = new THREE.Vector3();
  private watchLook: HeadLook = HEAD_LOOK;
  /** Turning their body to face what they watch, their head having turned past where it turns. */
  private turningToWatch = false;
  private targetFacing = 0;
  private phase = 0;
  private time = Math.random() * 10;
  private jumpY = 0;
  private vy = 0;
  private airborne = false;
  /** Where the character's feet are when not jumping: the ground, or the deck they stand on. */
  private feet = NaN;
  /** How deep in the trees' shade they stand (see FrameContext.shade); NaN until first measured. */
  private shaded = NaN;
  /** Whether they are in the forbidden cave, lit by its own light (see updateShade). */
  private inCave = false;
  private crouch = -1;

  private readonly squash = new Spring(3.0, 0.2, 1);
  private readonly leanX = new Spring(2.4, 0.32);
  private readonly leanZ = new Spring(2.4, 0.32);
  private readonly earPitch = [new Spring(4.5, 0.16), new Spring(4.5, 0.16)];
  private readonly earRoll = [new Spring(4.5, 0.16), new Spring(4.5, 0.16)];
  private readonly earBend = [new Spring(3.2, 0.14), new Spring(3.2, 0.14)];
  private readonly skirtX = new Spring(3.2, 0.25);
  private readonly skirtY = new Spring(2.5, 0.3);
  private readonly skirtZ = new Spring(3.2, 0.25);
  private readonly sprout = new Spring(3.6, 0.15);

  private action: { id: ActionId; t: number } | null = null;
  private blending = false;
  private blendT = 0;
  private blendDur = 0.2;
  private readonly blendFrom = restPose();
  private readonly base = restPose();
  private readonly target = restPose();

  // Out of their own eyes no one sees the marks and words over their own head: they show on the screen.
  private readonly actionCtx: ActionContext = {
    emote: (kind, side) => {
      if (this.unseen) this.emotes?.own?.mark(kind);
      else this.emotes?.spawn(kind, this, side ?? 1);
    },
    say: (key) => {
      // In their own way where they have one (`key.<id>`: Chiikawa's and Usagi's sounds, who have no words).
      const theirs = `${key}.${this.def.id}`;
      const words = t(has(theirs) ? theirs : key);
      if (this.unseen) this.emotes?.own?.words(words);
      else this.emotes?.say(this, words);
    },
  };

  constructor(def: CharacterDef, model: CharacterModel, options: CharacterOptions = {}) {
    this.def = def;
    this.gait = GAITS[def.id] ?? PLAIN_GAIT;
    this.model = model;
    this.height = model.rig.height;
    this.width = model.rig.width;
    const layers = options.crowd ? null : model.faceLayers;
    this.face = new Face(def.face, options.crowd ? 256 : 768, layers);
    this.parts = Array.from({ length: MAX_PARTS }, () => new THREE.Matrix4());
    this.armRig = ArmRig.of(model);
    this.uniforms = makeCharacterUniforms(model.rig, this.parts, this.face.texture, model.maskTexture);
    this.uniforms.uLineBias.value = 0.045 * model.rig.headR / 0.45;
    // Which parts are their head (see uHeadParts): the head and all that hangs from it; none for a model whose
    // head is not a part of its own (it bows with its body).
    let head = 0;
    for (let i = 0; i < MAX_PARTS; i++) {
      for (let p = i, depth = 0; p >= 0 && depth < MAX_PARTS; p = model.parents[p] ?? -1, depth++) {
        if (p === PART.HEAD) head |= 1 << i;
      }
    }
    this.uniforms.uHeadParts.value = model.hasHead ? head : 0;
    if (options.crowd) {
      const c = new THREE.Color(options.crowd.color);
      this.uniforms.uColorOverride.value.set(c.r, c.g, c.b, 0.86);
    }
    const { body, outline, depth } = createCharacterMaterials(this.uniforms, { fur: !!model.rig.fur && !options.crowd });
    this.mesh = new THREE.Mesh(model.geometry, body);
    // They cast their own shape in the sun's light (see CharacterMaterial's depth material).
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = depth;
    this.outline = new THREE.Mesh(model.geometry, outline);
    this.poseGroup.add(this.mesh, this.outline);
    // An outfit is a separate asset, drawn with the wearer's own deformation so it moves with them.
    const wear = (o: OutfitModel): THREE.Group => {
      const mats = createCharacterMaterials(makeOutfitUniforms(this.uniforms, o.info), { billboard: o.billboard });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(o.geometry, mats.body), new THREE.Mesh(o.geometry, mats.outline));
      this.poseGroup.add(group);
      return group;
    };
    if (options.outfit) this.outfit = wear(options.outfit);
    if (options.own) this.ownOutfit = wear(options.own.outfit);
    this.ownCarried = options.own?.carry ?? null;
    this.instrument = options.instrument ?? null;
    if (this.instrument) this.instrument.visible = false;
    this.showOutfits();
    const ownSkirt = model.rig.patterns?.skirt ?? null;
    this.ownSkirt = ownSkirt !== null;
    const skirt = ownSkirt ?? options.outfit?.info.skirt ?? null;
    const waist = model.pivots[PART.SKIRT].y;
    if (skirt && waist > skirt.bottom) {
      this.skirtSeat = clamp((waist - model.seat.drop) / (waist - skirt.bottom), 0.4, 1);
    }
    this.root.add(this.poseGroup);
    this.shadow = makeShadow();
    this.fireShadow = makeCastShadow();
    groundShadows().keep(this.shadow, this.fireShadow, this.uniforms.uOpenAir);
    this.carried = options.carry ?? null;
    this.bodyShape = BodyShape.of(model, [options.outfit, options.own?.outfit]);
    if (this.carried) this.carryThick = gripThickness(this.carried);
    // What they hold is lit as their hand is.
    for (const thing of [this.carried, this.ownCarried, this.instrument]) {
      const held = thing?.userData.light as HeldLight | undefined;
      if (held) {
        held.uShade = this.uniforms.uShade;
        held.uOpenAir = this.uniforms.uOpenAir;
      }
    }
    this.updateParts();
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  get actionId(): ActionId | null {
    return this.action?.id ?? null;
  }

  /** How long the action they play has played (seconds), or 0. */
  get actionTime(): number {
    return this.action?.t ?? 0;
  }

  /**
   * How what they do turns their head off the way they stand, for the eyes that look out of it
   * (FirstPersonCamera): x forward (a bow), y round to their left (a look about), z over to their left (a
   * dance's sway), in radians; eased in and out as the action is. A body's lean bends it most at the head.
   */
  actionTilt(out: THREE.Vector3): THREE.Vector3 {
    const p = this.pose;
    const b = this.base;
    return out.set(
      p.rootPitch - b.rootPitch + (p.leanZ - b.leanZ) * HEAD_BEND,
      p.rootYaw - b.rootYaw,
      (p.leanX - b.leanX) * HEAD_BEND - (p.rootRoll - b.rootRoll),
    );
  }

  get hasOutfit(): boolean {
    return this.outfit !== null || this.ownOutfit !== null;
  }

  /** Whether the camera looks out of their eyes (see setUnseen). */
  get lookedOutOf(): boolean {
    return this.unseen;
  }

  /** Put their outfit on or take it off: the island outfit, or their own clothes if they have them. Characters
   * without one ignore this. */
  setOutfitVisible(on: boolean): void {
    this.outfitsOn = on;
    this.showOutfits();
  }

  /** For someone with clothes of their own (Rakko), whether they wear the island outfit instead: only ever from
   * the Test panel. Others ignore this. */
  wearIsland(on: boolean): void {
    this.islandInstead = on;
    this.showOutfits();
  }

  private showOutfits(): void {
    const own = this.ownOutfit !== null && !this.islandInstead;
    if (this.outfit) this.outfit.visible = this.outfitsOn && !own;
    if (this.ownOutfit) this.ownOutfit.visible = this.outfitsOn && own;
  }

  /** Taken out of the world they were put in (attach): out of their scene, their shadows let go (groundShadows keeps
   * every character's till then), and what they say and show no longer shown. (The testing ground's checks make
   * someone afresh for every pairing they measure, and take each out after.) */
  detach(): void {
    this.all.removeFromParent();
    groundShadows().forget(this.shadow, this.fireShadow);
    this.emotes = null;
  }

  attach(scene: THREE.Object3D, emotes: EmoteSystem): void {
    this.all.add(this.root, this.shadow, this.fireShadow);
    for (const thing of [this.carried, this.ownCarried, this.instrument]) if (thing) this.all.add(thing);
    scene.add(this.all);
    this.emotes = emotes;
    if (FILM) {
      // The calm water mirrors them (see MIRROR_LAYER): their body, their outfit and what they hold,
      // not their lines (the pen's hulls, drawn by their back faces) nor their shadows.
      this.mesh.layers.enable(MIRROR_LAYER);
      this.outfit?.children[0].layers.enable(MIRROR_LAYER);
      this.ownOutfit?.children[0].layers.enable(MIRROR_LAYER);
      for (const thing of [this.carried, this.ownCarried, this.instrument]) {
        thing?.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && (m.material as THREE.Material).side !== THREE.BackSide) m.layers.enable(MIRROR_LAYER);
        });
      }
    }
  }

  /** Whether they are drawn at all, with their shadows and what they hold: not while they are out of sight
   * indoors, nor far off (see life/Life.ts). */
  setShown(on: boolean): void {
    this.all.visible = on;
  }

  get shown(): boolean {
    return this.all.visible;
  }

  /** Moves them, their shadows and what they hold, into `parent` (the Siren out of the cave to the sea). */
  reattach(parent: THREE.Object3D): void {
    parent.add(this.all);
  }

  /**
   * Whether the camera looks out of their eyes. Then it draws none of them (layer 0 is the camera's):
   * not their body, their lines nor their outfit, which only the calm water's mirror shows
   * (MIRROR_LAYER), marked so the water knows them for your own reflection (uMark) and shows it
   * clearly; nor the marks and words over their head; nor what they hold in their right paw or play,
   * which you see in your paw before your eyes instead (HandView). Their shadows stay on the ground under
   * them, and the cave's torch held up, in view.
   */
  setUnseen(on: boolean): void {
    if (on === this.unseen) return;
    this.unseen = on;
    for (const o of [this.mesh, this.outline, ...(this.outfit?.children ?? []), ...(this.ownOutfit?.children ?? [])]) {
      if (on) o.layers.disable(0);
      else o.layers.enable(0);
    }
    // What they hold and play too: out of their own eyes, you see it in your paw before you (HandView), not
    // here, where it would show again under the camera.
    for (const thing of [this.hand, this.instrument]) {
      thing?.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        if (on) o.layers.disable(0);
        else o.layers.enable(0);
      });
    }
    this.uniforms.uMark.value = on ? 2 : 0.5;
    if (!on) this.setBow(null);
  }

  /**
   * Out of their own eyes, bent over to look into the water (see Game.lookIntoWater): the middle of
   * their eyes carried to `at` and their face turned the way `toward` points (both in the world), `amount`
   * of the way (0 or null: standing as they are). Only the body is bent, in its shader, and only the
   * water's mirror shows it: their anchors, what they hold and the camera at their eyes stay where they
   * are.
   */
  setBow(at: THREE.Vector3 | null, toward: THREE.Vector3 | null = null, amount = 0): void {
    const bow = this.uniforms.uBow.value;
    const nod = this.uniforms.uBowHead.value;
    const standing = !at || !toward || amount <= 1e-3;
    // Bent, the body is carried out past the bounds it is culled by (which the shader cannot move).
    this.mesh.frustumCulled = standing;
    for (const o of [...(this.outfit?.children ?? []), ...(this.ownOutfit?.children ?? [])]) o.frustumCulled = standing;
    if (standing) {
      bow.set(0, 1, 0, 0);
      nod.set(0, 1, 0, 0);
      this.bowAmount = 0;
      return;
    }
    this.bowAt.copy(at);
    this.bowAmount = amount;
    // In the body's own frame (as its shader bends it): its front +z, up +y.
    this.mesh.updateWorldMatrix(true, false);
    _toLocal.copy(this.mesh.matrixWorld).invert();
    const eyes = this.anchorLocal('eyeL', _eyes).add(this.anchorLocal('eyeR', _v)).multiplyScalar(0.5);
    const to = _v.copy(at).applyMatrix4(_toLocal);
    const way = _way.copy(toward).transformDirection(_toLocal);
    // Their face turned that way, as far as `amount` goes: their head bowing its share about its neck, their body
    // leaning the rest (a model whose head is no part of its own turns as one).
    const turn = Math.atan2(-way.y, way.z) * amount;
    const neck = this.model.pivots[PART.HEAD];
    const headTurn = this.model.hasHead && neck ? turn * BOW_HEAD_SHARE : 0;
    const sn = Math.sin(headTurn);
    const cn = Math.cos(headTurn);
    const ny = neck?.y ?? 0;
    const nz = neck?.z ?? 0;
    nod.set(sn, cn, ny, nz);
    // Where the bowed head puts their eyes.
    const ey = ny + (eyes.y - ny) * cn - (eyes.z - nz) * sn;
    const ez = nz + (eyes.y - ny) * sn + (eyes.z - nz) * cn;
    const lean = turn - headTurn;
    const s = Math.sin(lean);
    const c = Math.cos(lean);
    // Their eyes carried along the straight way to `at` as they bend.
    const y = eyes.y + (to.y - eyes.y) * amount;
    const z = eyes.z + (to.z - eyes.z) * amount;
    bow.set(s, c, y - (ey * c - ez * s), z - (ey * s + ez * c));
  }

  setDesiredVelocity(v: THREE.Vector3): void {
    this.desired.set(v.x, 0, v.z);
  }

  faceToward(x: number, z: number): void {
    const dx = x - this.root.position.x;
    const dz = z - this.root.position.z;
    if (dx * dx + dz * dz > 1e-4) this.targetFacing = Math.atan2(dx, dz);
  }

  setFacing(yaw: number): void {
    this.targetFacing = yaw;
  }

  /** Stops them where they stand, at once: their pace, its easing, and the pace asked of them (planted for an
   * attack: see Hunt.swing). */
  plant(): void {
    this.velocity.set(0, 0, 0);
    this.easing.set(0, 0, 0);
    this.desired.set(0, 0, 0);
  }

  /** Keeps their eyes on `at` (a point, as someone's eyes), as `look` says: their head turns to it and,
   * past where it turns, their body. Null: they look ahead again. Call before update. */
  watch(at: THREE.Vector3 | null, look: HeadLook = HEAD_LOOK): void {
    this.watching = at !== null;
    if (at) this.watchAt.copy(at);
    this.watchLook = look;
  }

  /** Puts them at (x, z) facing `yaw`, on the ground there; or, given `feet`, on whatever is within a
   * step of that height (the cave's floor under the island's ground). */
  teleport(x: number, z: number, yaw: number, feet = NaN): void {
    this.root.position.set(x, Number.isNaN(feet) ? 0 : feet, z);
    this.feet = feet;
    this.shaded = NaN;
    this.airborne = false;
    this.jumpY = 0;
    this.vy = 0;
    this.crouch = -1;
    this.jumpEarly = this.jumpLate = this.lift = 0;
    this.velocity.set(0, 0, 0);
    this.easing.set(0, 0, 0);
    this.desired.set(0, 0, 0);
    this.facing = this.targetFacing = yaw;
    this.turnRate = this.turnSteps = 0;
    this.headPitch = this.headYaw = 0;
    this.turningToWatch = false;
  }

  /** A crouch and a jump; in the air, a jump as they land (Movement's jumpEarly), or at once, just after walking off an
   * edge (jumpLate). */
  jump(): void {
    if (this.crouch >= 0) return;
    if (this.airborne) {
      if (this.jumpLate <= 0) {
        this.jumpEarly = MOVE.jumpEarly;
        return;
      }
      this.jumpLate = 0;
      this.vy = MOVE.jumpSpeed;
      this.lift = MOVE.holdTime;
      this.squash.velocity += 2.5;
    } else {
      this.crouch = MOVE.crouch;
    }
    if (this.action && !ACTIONS[this.action.id].allowMove) this.stopAction();
  }

  /** Their own thing (Rakko's sword, CharacterDef.own.carries) lent out, or back: while lent it is not on them, and
   * the action holding it (剣をかまえる) is not theirs to do (see life/Life.lend). */
  lendOwn(lent: boolean): void {
    this.ownLent = lent;
    if (lent && this.action && ACTIONS[this.action.id].prop === 'sword') this.stopAction();
  }

  play(id: ActionId): void {
    const prop = ACTIONS[id].prop;
    // Only someone with an instrument plays it, and someone with a sword holds it.
    if ((prop === 'ukulele' && !this.instrument) || (prop === 'sword' && (!this.ownCarried || this.ownLent))) return;
    this.startBlend(ACTIONS[id].fadeIn);
    this.action = { id, t: 0 };
    // (Eating what they hold, it goes to their mouth: see placeHand.)
    if (this.instrument) this.instrument.visible = prop === 'ukulele';
  }

  /** Holds a torch up in the right hand, or puts it away (null). The torch is the caller's to add to
   * the scene; it is moved with the hand each frame. */
  holdTorch(torch: THREE.Object3D | null): void {
    if (this.torch && this.torch !== torch) this.torch.visible = false;
    this.torch = torch;
    this.torchThick = torch ? gripThickness(torch) : 0;
    if (torch) torch.visible = true;
  }

  get holdsTorch(): boolean {
    return this.torch !== null;
  }

  /**
   * Puts `thing` (made by createHeld: one of the things one carries) in their right paw, upright in it or
   * `flat` on it, or empties it (null). It goes with them as they go (shown, hidden and moved with the rest
   * of them), lit as their paw is; while they eat, it is held up to their mouth instead (see play). The
   * calm water mirrors it as it does them; out of their own eyes, only the water shows it (see setUnseen).
   * The thing it held before is taken out of the scene.
   */
  hold(thing: THREE.Object3D | null, flat = false): void {
    if (this.hand && this.hand !== thing) this.hand.removeFromParent();
    this.hand = thing;
    this.handFlat = flat;
    this.handGone = false;
    this.handThick = thing ? gripThickness(thing) : 0;
    if (!thing) return;
    this.all.add(thing);
    thing.visible = true;
    thing.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (FILM && (m.material as THREE.Material).side !== THREE.BackSide) m.layers.enable(MIRROR_LAYER);
      if (this.unseen) m.layers.disable(0);
      else m.layers.enable(0);
    });
  }

  /** What they hold in their right paw (see hold), or null. */
  get holding(): THREE.Object3D | null {
    return this.hand;
  }

  /** How deep a point of the world is in them (below 0, how far clear), by their shape as drawn (see BodyShape.ts), as
   * they were posed when last updated: for checking what they hold (the testing ground, dev/Dev.ts). */
  depthAtWorld(p: THREE.Vector3): number {
    this.mesh.worldToLocal(_probe.copy(p));
    return this.depthAtLocal(_probe.x, _probe.y, _probe.z);
  }

  /** Their body's own frame as drawn, from the world (their mesh's world matrix turned round), into `out`: to measure many
   * points in it (see depthAtLocal), the frame found once, not once a point (dev/measure.ts). */
  bodyFrame(out: THREE.Matrix4): THREE.Matrix4 {
    return out.copy(this.mesh.matrixWorld).invert();
  }

  /** How deep (x, y, z), a point of their body's own frame as drawn (see bodyFrame), is in them (below 0, how far clear),
   * as they were posed when last updated (their pose for it taken once an update: see BodyPose). `above`: only what is
   * deeper than this is asked about (see BodyShape.depthAt). */
  depthAtLocal(x: number, y: number, z: number, above = -Infinity): number {
    return this.bodyShape.depthAt(x, y, z, this.posedForShape(), above);
  }

  /** Their shape made ready to be measured (see BodyShape.ready): for the testing ground's checks to wait for. */
  shapeReady(): Promise<void> {
    return this.bodyShape.ready();
  }

  /** How fast (at most) a reading of depthAtLocal changes, for each metre a point moves, anywhere at or below `top` (a
   * height in their body's own frame as drawn), as they were posed when last updated (see BodyShape.steepness): for the
   * testing ground to pass over bunches of points that cannot matter, exactly (dev/measure.ts). */
  bodySteepness(top: number): number {
    return this.bodyShape.steepness(top, this.posedForShape());
  }

  /** Their pose for their shape to be measured against (see BodyPose), taken once an update. */
  private posedForShape(): BodyPose {
    if (this.poseTaken !== this.updates) {
      this.poseTaken = this.updates;
      this.bodyPose.set(this.uniforms.uSquash.value, this.uniforms.uLean.value, this.height, this.parts);
    }
    return this.bodyPose;
  }

  /** What they hold out of their paw (`empty`: thrown, see hunt/Hunt.ts), hidden, till they have another (not empty),
   * shown as they are next placed, where it is held. */
  emptyHand(empty: boolean): void {
    this.handGone = empty;
  }

  /** Lights a held thing's `light` (see createHeld) as their paw is lit. */
  lightHeld(light: HeldLight): void {
    light.uShade.value.copy(this.uniforms.uShade.value);
    light.uOpenAir.value = this.uniforms.uOpenAir.value;
    light.uFade.value = this.fade;
  }

  /**
   * Faded out as the camera comes near them (the user, 2026-11-12: "fade her when close"), what they hold with them:
   * from FADE.from metres off the middle of them, to FADE.most of them gone by FADE.to, and all of them by FADE.gone,
   * easing as it comes and goes. Anyone, not only you: a friend the camera comes by, as it goes round you, fades too;
   * and, standing between it and you, by `inWay` at least (see SeeThrough's standsBetween). Call after the camera has
   * moved.
   */
  updateFade(ctx: FrameContext, dt: number, inWay = 0): void {
    _w.set(0, this.height * 0.5, 0).applyMatrix4(this.root.matrixWorld);
    const d = _w.distanceTo(ctx.camera.position);
    const near = FADE.most * smoothstep(FADE.from, FADE.to, d) + (1 - FADE.most) * smoothstep(FADE.to, FADE.gone, d);
    const want = Math.max(near, inWay);
    this.fade += (want - this.fade) * (1 - Math.exp(-dt * FADE.rate));
    if (this.fade < 0.002) this.fade = 0;
    this.uniforms.uFade.value = this.fade;
    const light = this.hand?.userData.light as HeldLight | undefined;
    if (light) light.uFade.value = this.fade;
  }

  stopAction(): void {
    if (!this.action) return;
    this.startBlend(ACTIONS[this.action.id].fadeOut);
    this.lastAction = this.action.id;
    this.action = null;
    if (this.instrument) this.instrument.visible = false;
  }

  update(dt: number, ctx: FrameContext): void {
    this.updates++;
    this.time += dt;
    this.updateLocomotion(dt, ctx);
    this.updateHead(dt);
    this.updatePose(dt);
    this.updateSprings(dt);
    this.squareToHill(ctx, dt);
    this.updateParts();
    this.root.updateMatrixWorld(true);
    this.updateFace(dt, ctx);
    this.updateShade(dt, ctx);
    this.updateShadowAndProp(ctx, dt);
  }

  /** World position of a rig anchor, following the current pose and squash. */
  getAnchor(name: AnchorName, out: THREE.Vector3): THREE.Vector3 {
    return this.mesh.localToWorld(this.anchorLocal(name, out));
  }

  /** Where a point of their head (in their model's own frame, at rest) is now in the world: as their head
   * turns and bows (see watch), squashed and leaning as their shader draws it. Where something riding on it
   * sits: the Siren's little mermaids (see LittleMermaids). */
  headPoint(local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return this.mesh.localToWorld(this.partPoint(out.copy(local), PART.HEAD));
  }

  /** Where a point of their body (in their model's own frame, at rest) is now in the world, squashed and leaning
   * as their shader draws it: where what they play is held (see UKULELE_AT). */
  private bodyPoint(local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return this.mesh.localToWorld(this.partPoint(out.copy(local), PART.BODY));
  }

  /** A rig anchor in the body's own frame (its mesh's), following the current pose and squash as its
   * shader does, but not its bow (see setBow). */
  private anchorLocal(name: AnchorName, out: THREE.Vector3): THREE.Vector3 {
    return this.deform(this.posedAnchor(name, out));
  }

  /** A rig anchor where its part is posed now, before the squash and the lean (see deform). */
  private posedAnchor(name: AnchorName, out: THREE.Vector3): THREE.Vector3 {
    // The hands' are the tips of their paws (or of the arm, where it does not bend); the rest are on the head,
    // which is the body but for a head of its own (see headPitch).
    const bends = !!this.armRig;
    const part =
      name === 'handL' ? (bends ? PART.PAW_L : PART.ARM_L) : name === 'handR' ? (bends ? PART.PAW_R : PART.ARM_R) : PART.HEAD;
    return out.copy(this.model.anchors[name]).applyMatrix4(this.parts[part]);
  }

  /** A point of a part, given in the model's own frame at rest (`out`), moved to where the part, the squash
   * and the lean now put it in the body's own frame, as the shader moves it. */
  private partPoint(out: THREE.Vector3, part: number): THREE.Vector3 {
    return this.deform(out.applyMatrix4(this.parts[part]));
  }

  /** A point in the body's own frame as posed (`out`), squashed and leant as the shader does it. */
  private deform(out: THREE.Vector3): THREE.Vector3 {
    const s = this.uniforms.uSquash.value;
    const k = 1 / Math.sqrt(s);
    const lean = this.uniforms.uLean.value;
    const h = Math.max(out.y, 0) / this.height;
    out.y *= s;
    out.x = out.x * k + lean.x * h * h * this.height;
    out.z = out.z * k + lean.y * h * h * this.height;
    return out;
  }

  // ------------------------------------------------------------------ internals
  private startBlend(duration: number): void {
    copyPose(this.pose, this.blendFrom);
    Object.assign(this.weaponFrom, this.weaponNow);
    this.blending = true;
    this.blendT = 0;
    this.blendDur = Math.max(0.01, duration);
  }

  /**
   * How far their left paw is off what they hold in both (a fork across them, a stone before them), taken by what they
   * do (0: on it; 1: off it). An emote's gesture made with that paw (ActionDef.oneHand), or both paws brought up
   * before the face (fullPawHolds), takes it: it lets go as the emote eases in, and takes hold again as it eases back
   * out (as the pose blends: startBlend). Meanwhile what was held in both stays as it was held, in their right paw
   * alone (see placeHand). (An attack's own motion says how its weapon moves: ActionDef.held, the throw's letting go.)
   */
  private otherPawOff(): number {
    const takes = (id: ActionId | null) => !!id && (!!ACTIONS[id].oneHand || !!ACTIONS[id].fullPawHolds);
    const eased = this.blending ? smoothstep(0, 1, this.blendT / this.blendDur) : 1;
    if (this.action) return takes(this.action.id) ? eased : 0;
    return this.blending && takes(this.lastAction) ? 1 - eased : 0;
  }

  private speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** How fast they walk, run and sprint (metres a second: see Movement). */
  get walkSpeed(): number {
    return MOVEMENT.walk[this.def.id] ?? RESTING_WALK;
  }

  get runSpeed(): number {
    return MOVEMENT.run[this.def.id] ?? RESTING_RUN;
  }

  get sprintSpeed(): number {
    return this.runSpeed * MOVE.sprint;
  }

  /** On their feet: their pace eased toward the one they want as a critically damped spring does (`easing` its
   * rate), quicker as they slow down or turn than as they speed up along the way they go (see Movement's getGoing). */
  private ease(dt: number): void {
    const v = this.velocity;
    const want = this.desired;
    const e = this.easing;
    const speed = this.speed();
    const ahead = speed > 1e-3 ? (want.x * v.x + want.z * v.z) / speed : Math.hypot(want.x, want.z);
    const w = (ahead > speed ? MOVE.getGoing : MOVE.slowDown) * this.gait.quick;
    const k = Math.exp(-w * dt);
    const ox = v.x - want.x;
    const oz = v.z - want.z;
    const bx = e.x + w * ox;
    const bz = e.z + w * oz;
    v.set(want.x + (ox + bx * dt) * k, 0, want.z + (oz + bz * dt) * k);
    e.set((e.x - w * bx * dt) * k, 0, (e.z - w * bz * dt) * k);
  }

  /** In the air: on as they were going, steered a little the way they want to go (Movement's airSteer), never slowed by
   * letting the stick go. */
  private steerInAir(dt: number): void {
    this.easing.set(0, 0, 0);
    const want = this.desired;
    if (want.x * want.x + want.z * want.z < 1e-4) return;
    _v.set(want.x - this.velocity.x, 0, want.z - this.velocity.z);
    const most = MOVE.airSteer * dt;
    if (_v.lengthSq() > most * most) _v.setLength(most);
    this.velocity.add(_v);
  }

  /** Stopped short by what they walked (or jumped) into, by (`shortX`, `shortZ`) of where their pace would have
   * taken them from `from` to `at`: their pace is what they moved, and their easing on into it stops (so they
   * get going along a wall they slide on as before, and do not shoot off past its end). */
  private stopped(from: THREE.Vector3, at: THREE.Vector3, shortX: number, shortZ: number, dt: number): void {
    const inv = 1 / Math.max(dt, 1e-4);
    this.velocity.x = (at.x - from.x) * inv;
    this.velocity.z = (at.z - from.z) * inv;
    const n = Math.hypot(shortX, shortZ);
    if (n < 1e-9) return;
    const into = -(this.easing.x * shortX + this.easing.z * shortZ) / n;
    if (into > 0) {
      this.easing.x += (shortX / n) * into;
      this.easing.z += (shortZ / n) * into;
    }
  }

  private updateLocomotion(dt: number, ctx: FrameContext): void {
    const prevX = this.velocity.x;
    const prevZ = this.velocity.z;
    this.jumpEarly = Math.max(0, this.jumpEarly - dt);
    this.jumpLate = Math.max(0, this.jumpLate - dt);
    // (Crouched to jump, they keep the pace they jump with, as in the air.)
    const springing = this.airborne || this.crouch >= 0;
    if (springing) this.steerInAir(dt);
    else this.ease(dt);

    const pos = this.root.position;
    // A seat raised off the floor under it (a stool, a log, a bed, the pier's edge, the boat), not the ground.
    this.seatedHigh =
      !!this.ride && this.ride.y - ctx.groundHeight(this.ride.x, this.ride.z, this.ride.y) > RAISED_SEAT;
    if (this.ride) {
      // Riding: they sit where the boat carries them.
      pos.set(this.ride.x, this.ride.y, this.ride.z);
      this.feet = this.ride.y;
      this.jumpY = 0;
      this.vy = 0;
      this.airborne = false;
      this.crouch = -1;
      this.velocity.set(0, 0, 0);
      this.easing.set(0, 0, 0);
      this.facing = this.targetFacing = this.ride.yaw;
      this.root.rotation.y = this.facing;
      return;
    }
    if (Number.isNaN(this.feet)) this.feet = ctx.groundHeight(pos.x, pos.z);
    _from.copy(pos);
    _from.y = this.feet;
    pos.x += this.velocity.x * dt;
    pos.z += this.velocity.z * dt;
    const goneX = pos.x;
    const goneZ = pos.z;
    // In the air they carry on over gaps, drops and water, stopped only by what stands higher than
    // their feet; on their feet they keep to what they can walk on.
    if (this.airborne && ctx.air) ctx.air(pos, _from, this.feet + this.jumpY);
    else ctx.clamp(pos, _from, this.drops);
    // (Not as they crouch to jump: from the very edge of a stepping stone, which stops their feet, they jump on
    // as fast as they ran up to it.)
    if ((pos.x !== goneX || pos.z !== goneZ) && this.crouch < 0) this.stopped(_from, pos, pos.x - goneX, pos.z - goneZ, dt);

    const inv = 1 / Math.max(dt, 1e-4);
    const k = Math.min(1, dt * 12);
    this.accel.x += ((this.velocity.x - prevX) * inv - this.accel.x) * k;
    this.accel.z += ((this.velocity.z - prevZ) * inv - this.accel.z) * k;

    const speed = this.speed();
    if (this.look !== null) this.targetFacing = this.look;
    else if (speed > 0.15) this.targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
    // Turning after their head to what they watch, unhurried; the one whose eyes you look out of with your eyes,
    // anyone else no faster than they turn (Movement's turnMost).
    let turn = wrapAngle(this.targetFacing - this.facing) * Math.min(1, dt * (this.turningToWatch ? TURN_RATE : 10));
    if (this.look === null) {
      const most = MOVE.turnMost * DEGREE * this.gait.quick * dt;
      turn = clamp(turn, -most, most);
    }
    this.facing += turn;
    // Turning on the spot, they step round as they turn.
    this.turnRate += (turn / Math.max(dt, 1e-4) - this.turnRate) * k;
    const still = 1 - smoothstep(0.05, 0.5, speed);
    this.turnSteps += (still * smoothstep(0.8, 2.5, Math.abs(this.turnRate)) - this.turnSteps) * Math.min(1, dt * 10);
    this.turnPhase += (Math.abs(turn) / (MOVE.turnStep * DEGREE)) * Math.PI * still;

    const run = smoothstep(this.walkSpeed * 0.95, this.runSpeed * 0.9, speed);
    const dash = smoothstep(this.runSpeed * 1.02, this.sprintSpeed * 0.95, speed);
    this.phase += (speed / ((0.62 + 0.43 * run + 0.6 * dash) * this.gait.stride)) * Math.PI * 2 * dt;
    if (this.action && speed > 0.3 && !ACTIONS[this.action.id].allowMove) this.stopAction();

    if (this.crouch >= 0) {
      this.crouch -= dt;
      if (this.crouch < 0) {
        this.vy = MOVE.jumpSpeed;
        this.airborne = true;
        this.jumpLate = 0;
        this.lift = MOVE.holdTime;
        this.squash.velocity += 2.5;
      }
    }
    // Rising with the jump still held, gravity pulls them less, a moment (see Movement's holdTime); let go, it is over.
    const lifted = this.airborne && this.jumpHeld && this.vy > 0 && this.lift > 0;
    this.lift = lifted ? this.lift - dt : 0;
    const gravity = lifted ? -MOVE.gravity * MOVE.holdGravity : -MOVE.gravity;
    // What they stand on, or come down on: the ground, a deck, or the top of something short (a cushion, a log).
    const footing = ctx.footing ?? ctx.groundHeight;
    if (this.airborne && ctx.air) {
      // Their feet's height in the air against what is under them where they are now: a deck, the top of
      // something short or ground they come down on (or one a step above them, which they land on all the
      // same), water too deep to stand in (they climb out at the nearest shore), or nothing yet.
      this.vy += gravity * dt;
      const was = this.feet + this.jumpY;
      const y = was + this.vy * dt;
      const under = (ctx.landing ?? footing)(pos.x, pos.z, Math.max(y, was));
      if (y <= under) {
        this.feet = under;
        this.jumpY = 0;
        this.land();
      } else if (ctx.splash?.(pos, y)) {
        this.feet = ctx.groundHeight(pos.x, pos.z);
        this.jumpY = 0;
        this.vy = 0;
        this.airborne = false;
        this.jumpEarly = 0;
        this.velocity.set(0, 0, 0);
      } else {
        this.feet = under;
        this.jumpY = y - under;
      }
    } else {
      if (this.airborne) {
        this.vy += gravity * dt;
        this.jumpY += this.vy * dt;
        if (this.jumpY <= 0) {
          this.jumpY = 0;
          this.land();
        }
      }
      const below = footing(pos.x, pos.z, this.feet);
      if (!this.airborne && ctx.air && below < this.feet - DROP) {
        // Walked off an edge: they fall from where their feet were (and may still jump a moment).
        this.airborne = true;
        this.vy = 0;
        this.jumpY = this.feet - below;
        this.jumpLate = MOVE.jumpLate;
      }
      this.feet = below;
    }
    pos.y = this.feet + this.jumpY;
    this.root.rotation.y = this.facing;
  }

  /** Squeezed past by someone, or squeezing past them (see life/Life.ts): a little squash, soft as they are. */
  jostle(): void {
    this.squash.velocity -= 1.4;
  }

  /** Coming down on their feet: a squash and a bounce of the ears, as hard as they came down; and, a jump asked
   * for just before (Movement's jumpEarly), into the crouch for it. */
  private land(): void {
    const impact = Math.min(1.4, -this.vy / MOVE.jumpSpeed);
    this.vy = 0;
    this.airborne = false;
    this.jumpLate = 0;
    this.squash.velocity -= 3.2 * impact;
    for (const s of this.earBend) s.velocity += 7 * impact;
    for (const s of this.earPitch) s.velocity += 2.5 * impact;
    if (this.jumpEarly > 0) {
      this.jumpEarly = 0;
      this.jump();
    }
  }

  /** Whether they are off the ground: jumping, falling, or crouched to jump. In the air, feetY is the
   * ground under them, not where they will land (falling off the pier, the sea's floor). */
  get inAir(): boolean {
    return this.airborne || this.jumpY > 1e-3;
  }

  /** Height of the character's feet when not jumping: what they stand on. */
  get feetY(): number {
    return Number.isNaN(this.feet) ? this.root.position.y : this.feet;
  }

  /** Steps taken so far as they walk: one more each time a foot comes down (see locomotionPose), the left
   * foot's on odd counts. For the prints they leave (see world/Footprints.ts). */
  get steps(): number {
    return Math.floor(this.phase / Math.PI + 0.5);
  }

  /** Where their left (side 0) or right (1) foot stands now, in the world (`at`, its y their feet's height),
   * and how wide and long it is (`size`). A model without feet of its own (the crowd's, yours) stands on feet
   * as far apart and as big for its width as the cast's. */
  sole(side: 0 | 1, at: THREE.Vector3, size: THREE.Vector2): void {
    const foot = this.model.seat.feet[side];
    const x = foot ? foot.hip.x : (side === 0 ? -FOOT_APART : FOOT_APART) * this.width;
    const z = (foot ? foot.hip.z : 0) + (side === 0 ? this.pose.footLZ : this.pose.footRZ);
    const c = Math.cos(this.facing);
    const s = Math.sin(this.facing);
    const p = this.root.position;
    at.set(p.x + x * c + z * s, this.feetY, p.z - x * s + z * c);
    if (foot) size.copy(foot.sole);
    else size.setScalar(FOOT_SIZE * this.width);
  }

  private locomotionPose(): void {
    const p = resetPose(this.base);
    const tm = this.time;
    p.squash = 1 + 0.014 * Math.sin(tm * 2.3);
    p.armLRaise = p.armRRaise = 0.04 * Math.sin(tm * 2.3 + 0.8);
    if (this.armRig) {
      // Arms that bend hang a little lower than the stubs did, soft at the elbow and the wrist, their paws in by
      // their sides as the plush's are; arms built hanging at their sides (島二郎's) hang as built.
      if (!this.def.armsAsBuilt) {
        p.armLRaise = p.armRRaise = REST_ARM.raise + 0.04 * Math.sin(tm * 2.3 + 0.8);
        p.armLSwing = p.armRSwing = REST_ARM.swing;
        p.armLBend = p.armRBend = REST_ARM.bend;
        p.pawLBend = p.pawRBend = REST_ARM.paw;
      }
      // A paw that holds a thing holds it out before their side (see placeHand), and the cave's torch up: their right
      // (the pose's L: see HAND_LEAN).
      const breathe = 0.04 * Math.sin(tm * 2.3 + 0.8);
      if (this.torch) {
        p.armLRaise = TORCH_ARM.raise;
        p.armLSwing = TORCH_ARM.swing;
        p.armLBend = TORCH_ARM.bend;
      } else if (this.hand?.userData.hold === 'across' && !this.instrument?.visible) {
        // A weapon across before them: both paws on it.
        p.reachL = p.reachR = 1;
        [p.reachLX, p.reachLY, p.reachLZ] = HOLDS.across.right;
        [p.reachRX, p.reachRY, p.reachRZ] = HOLDS.across.left;
      } else if (this.hand && !this.instrument?.visible) {
        p.armLRaise = HOLD_ARM.raise + breathe;
        p.armLSwing = HOLD_ARM.swing;
        p.armLBend = HOLD_ARM.bend;
        p.pawLBend = HOLD_ARM.paw;
        // A club, a sword or a stone: their right paw where it carries it (see CarryHold), reaching there from that held
        // arm (which an attack swinging the arm itself goes back to: see Actions' slash and throw).
        const hold = this.hand.userData.hold as WeaponHold | undefined;
        if (hold && hold !== 'across') {
          const carry = HOLDS[hold];
          p.reachL = 1;
          [p.reachLX, p.reachLY, p.reachLZ] = carry.paw;
          p.reachLY += breathe * 0.1;
          if (carry.other) {
            p.reachR = 1;
            [p.reachRX, p.reachRY, p.reachRZ] = carry.other;
            p.reachRY += breathe * 0.1;
          }
        }
      }
      if (this.carried) {
        // Kurimanju's can, in the other paw, his left.
        p.armRRaise = HOLD_ARM.raise + breathe;
        p.armRSwing = HOLD_ARM.swing;
        p.armRBend = HOLD_ARM.bend;
        p.pawRBend = HOLD_ARM.paw;
      }
    }
    const g = this.gait;
    if (this.turnSteps > 0.01) {
      // Stepping round as they turn on the spot: a foot lifted and set down a little further round each turnStep (Movement)
      // (turning to their right, the left foot forward and the right back), their weight going from foot to foot.
      const t = this.turnSteps;
      const ts = Math.sin(this.turnPhase);
      const way = Math.sign(this.turnRate);
      p.footLY += t * Math.max(0, ts) * 0.03 * g.lift;
      p.footRY += t * Math.max(0, -ts) * 0.03 * g.lift;
      p.footLZ += t * Math.max(0, ts) * 0.025 * way;
      p.footRZ -= t * Math.max(0, -ts) * 0.025 * way;
      p.rootY += t * Math.abs(ts) * 0.012 * g.bounce;
      p.rootRoll += t * ts * 0.03 * g.sway;
    }
    const speed = this.speed();
    const walk = smoothstep(0.05, 0.5, speed);
    if (walk <= 0) return;
    const run = smoothstep(this.walkSpeed * 0.95, this.runSpeed * 0.9, speed);
    // Sprinting: leaning in, longer strides, the feet and the arms thrown higher (see Movement's sprint).
    const dash = smoothstep(this.runSpeed * 1.02, this.sprintSpeed * 0.95, speed);
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    const amp = 1 + 0.6 * run + 0.3 * dash;
    const bob = 0.035 * amp * g.bounce;
    p.rootY += walk * Math.abs(s) * bob;
    p.squash += walk * (Math.abs(s) - 0.5) * 0.05 * amp * g.bounce;
    p.leanX += walk * s * 0.03 * (1 - 0.5 * run) * g.sway;
    p.leanZ += walk * dash * 0.03;
    p.rootYaw += walk * s * 0.07 * g.sway;
    p.rootRoll += walk * s * 0.035 * g.sway;
    const reach = 0.07 * amp * g.stride;
    p.footLZ += walk * s * reach;
    p.footRZ -= walk * s * reach;
    const lift = 0.035 * amp * g.lift * (1 + 0.5 * dash);
    p.footLY += walk * Math.max(0, c) * lift;
    p.footRY += walk * Math.max(0, -c) * lift;
    const swing = 0.45 * amp * g.arms * (1 + 0.35 * dash);
    // (A paw that holds something sways less, as one carries a thing.)
    p.armLSwing -= walk * s * swing * (this.hand || this.torch ? HOLD_ARM.sway : 1);
    p.armRSwing += walk * s * swing * (this.carried ? HOLD_ARM.sway : 1);
    p.armLRaise += walk * (0.12 + 0.25 * run + 0.15 * dash);
    p.armRRaise += walk * (0.12 + 0.25 * run + 0.15 * dash);
    p.skirtY += walk * s * 0.05;
    p.earBend -= walk * (run * 0.25 + dash * 0.2);
  }

  /** Whether they hold up what they carry with their own clothes (Rakko's sword), in its action ('sword'); it is
   * on their back otherwise. */
  private get holdsOwn(): boolean {
    return !!this.ownCarried && !!this.ownOutfit?.visible && !!this.action && ACTIONS[this.action.id].prop === 'sword';
  }

  private updatePose(dt: number): void {
    this.locomotionPose();
    copyPose(this.base, this.target);
    const a = this.action;
    if (a) {
      const def = ACTIONS[a.id];
      const prev = a.t;
      a.t += dt;
      // One paw's gesture: made with their left (the pose's R), the paw left free of what they hold; Kurimanju's can
      // in it and the other paw free, with that one. One that brings the paws up before or round the face: a full paw
      // keeps holding what it holds out where it was.
      const holding = (!!this.hand && !this.instrument?.visible) || !!this.torch;
      const mirror = !!def.oneHand && !!this.carried && !holding;
      if (mirror) mirrorArms(this.target);
      def.pose(a.t, this.target);
      if (mirror) mirrorArms(this.target);
      if (def.fullPawHolds && holding) keepArm(this.base, this.target, 'L');
      if (def.fullPawHolds && this.carried) keepArm(this.base, this.target, 'R');
      def.tick?.(a.t, prev, this.actionCtx);
      if (a.t >= def.duration) this.stopAction();
    }
    // Seated, a paw that holds something holds it up off the ground (see HOLD_ARM).
    const seated = this.target.sit;
    if (seated > 0) {
      if ((this.hand && !this.instrument?.visible) || this.torch) this.target.armLRaise += HOLD_ARM.seated * seated;
      if (this.carried) this.target.armRRaise += HOLD_ARM.seated * seated;
    }
    if (this.blending) {
      this.blendT += dt;
      lerpPose(this.blendFrom, this.target, smoothstep(0, 1, this.blendT / this.blendDur), this.pose);
      if (this.blendT >= this.blendDur) this.blending = false;
    } else {
      copyPose(this.target, this.pose);
    }
  }

  private updateSprings(dt: number): void {
    const p = this.pose;
    const cf = Math.cos(this.facing);
    const sf = Math.sin(this.facing);
    const ax = clamp(this.accel.x * cf - this.accel.z * sf, -20, 20);
    const az = clamp(this.accel.x * sf + this.accel.z * cf, -20, 20);

    let squashTarget = p.squash;
    if (this.crouch >= 0) squashTarget -= 0.12;
    if (this.airborne) squashTarget += this.vy > 0 ? 0.07 : -0.02;
    const sq = this.squash.update(squashTarget, dt);
    const lx = this.leanX.update(p.leanX - ax * 0.004, dt);
    const lz = this.leanZ.update(p.leanZ + this.speed() * 0.014 * this.gait.lean - az * 0.004, dt);

    const air = this.airborne ? clamp(this.vy * 0.025, -0.3, 0.3) : 0;
    this.earPitch[0].update(p.earLPitch - lz * 1.5 - air, dt);
    this.earPitch[1].update(p.earRPitch - lz * 1.5 - air, dt);
    this.earRoll[0].update(p.earLRoll + (1 - sq) * 1.2 + lx * 1.2, dt);
    this.earRoll[1].update(p.earRRoll + (1 - sq) * 1.2 - lx * 1.2, dt);
    this.earBend[0].update(p.earBend - this.earPitch[0].velocity * 0.06 + (1 - sq) * 1.5, dt);
    this.earBend[1].update(p.earBend - this.earPitch[1].velocity * 0.06 + (1 - sq) * 1.5, dt);
    this.skirtX.update(p.skirtX + az * 0.008, dt);
    this.skirtY.update(p.skirtY, dt);
    this.skirtZ.update(p.skirtZ - ax * 0.008, dt);
    this.sprout.update(p.sprout - lx * 2.5 - this.leanX.velocity * 0.3, dt);

    this.uniforms.uSquash.value = clamp(sq, 0.6, 1.4);
    this.uniforms.uLean.value.set(lx, lz);
  }

  /** Their head toward what they watch (see watch), and their body after it once the head has turned past
   * where it turns; their head back to looking ahead when they watch nothing. */
  private updateHead(dt: number): void {
    const look = this.watchLook;
    let yaw = 0;
    let pitch = 0;
    if (this.watching) {
      const pos = this.root.position;
      const at = this.watchAt;
      const way = Math.atan2(at.x - pos.x, at.z - pos.z);
      const off = wrapAngle(way - this.facing);
      // Walking, they face the way they go (the user: turned to what they watch, they walked sideways) and
      // only glance with their head (see WALKING_LOOK).
      const walking = this.speed() > WALKING;
      if (walking) this.turningToWatch = false;
      if (look.turn !== null && !walking) {
        // Only once the head has turned that far itself.
        if (Math.abs(off) > look.turn && Math.abs(this.headYaw) > 0.9 * Math.min(look.turn, look.yaw)) this.turningToWatch = true;
        if (this.turningToWatch) {
          this.targetFacing = way;
          if (Math.abs(off) < TURN_DONE) this.turningToWatch = false;
        }
      }
      // Up or down from their eyes, by how far off it is from them.
      const ahead = this.model.anchors.eyeL.z;
      const flat = Math.hypot(at.x - pos.x - Math.sin(this.facing) * ahead, at.z - pos.z - Math.cos(this.facing) * ahead);
      const rise = this.feetY + this.model.rig.eyeY - at.y;
      // A head whose body never turns, or a walker's, gives up on what is too far round to one side.
      const reach = walking ? look.yaw * WALKING_LOOK : look.yaw;
      const keep = look.turn === null || walking ? 1 - smoothstep(reach, reach + 0.7, Math.abs(off)) : 1;
      yaw = clamp(off, -reach, reach) * keep;
      pitch = clamp(Math.atan2(rise, Math.max(flat, 0.1)) * look.share, -look.up, look.down) * keep;
    } else {
      this.turningToWatch = false;
    }
    // A model built before its head turned on its own turns only its body.
    if (!this.model.hasHead) yaw = pitch = 0;
    const k = 1 - Math.exp(-look.rate * dt);
    this.headYaw += (yaw - this.headYaw) * k;
    this.headPitch += (pitch - this.headPitch) * k;
  }

  /** Arm i (0 left, 1 right) of an arm that bends, posed by its angles and reach (see ArmRig.solve). */
  private poseArm(
    i: 0 | 1,
    raise: number,
    swing: number,
    bend: number,
    pawBend: number,
    reach: number,
    x: number,
    y: number,
    z: number,
  ): void {
    const rig = this.armRig as ArmRig;
    const a = this.armPose;
    a.raise = raise;
    a.swing = swing;
    a.bend = bend;
    a.pawBend = pawBend;
    a.reach = reach;
    a.x = x;
    a.y = y;
    a.z = z;
    // The head is turned before the arms (see updateParts), so points by the face can go with it.
    const turns = rig.solve(i, a, this.armTurns[i], this.model.hasHead ? this.parts[PART.HEAD] : null);
    const [upper, fore, paw] = rig.parts(i);
    this.setPartTurn(upper, turns.upper, turns.shoulder);
    this.setPartTurn(fore, turns.fore);
    this.setPartTurn(paw, turns.paw);
  }

  /** Turns part i by `q` about its pivot (as setPart, given a turn instead of angles), its pivot moved to `at` if
   * given (an arm's shoulder, slid round the body). */
  private setPartTurn(i: number, q: THREE.Quaternion, at?: THREE.Vector3): void {
    const pivot = this.model.pivots[i];
    const m = this.parts[i];
    m.compose(at ?? pivot, q, _s.set(1, 1, 1));
    m.multiply(_m.makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    const parent = this.model.parents[i];
    if (parent >= 0) m.premultiply(this.parts[parent]);
  }

  /** Turns part i about its pivot, moves it by (ox, oy, oz) and scales its height by sy. */
  private setPart(i: number, rx: number, ry: number, rz: number, ox = 0, oy = 0, oz = 0, sy = 1): void {
    const pivot = this.model.pivots[i];
    const m = this.parts[i];
    _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ'));
    _p.set(pivot.x + ox, pivot.y + oy, pivot.z + oz);
    m.compose(_p, _q, _s.set(1, sy, 1));
    m.multiply(_m.makeTranslation(-pivot.x, -pivot.y, -pivot.z));
    const parent = this.model.parents[i];
    if (parent >= 0) m.premultiply(this.parts[parent]);
  }

  /**
   * Arms hung under the curve of the head (the downloaded models) would sink into it when
   * raised high, so they stop at the rig's reach and come forward instead: a wave or a cheer
   * then happens in front of the face, where it stays in view.
   */
  private armAngles(raise: number, swing: number): [number, number] {
    const reach = this.model.rig.armReach;
    if (reach == null || raise <= reach) return [raise, swing];
    return [reach, swing + (raise - reach) * 0.6];
  }

  /**
   * A foot, moved by the pose. As the character sits, the leg turns about its hip to stretch
   * out in front, and the hip moves to where the model sits.
   */
  private setFoot(i: number, side: 0 | 1, ox: number, oy: number, oz: number): void {
    const foot = this.model.seat.feet[side];
    const sit = this.pose.sit;
    if (!foot || sit <= 0) {
      this.setPart(i, 0, 0, 0, ox, oy, oz);
      return;
    }
    // A skirt covers seated feet, so they tuck in under it.
    const tuck = this.ownSkirt || this.outfit?.visible ? foot.tuck : 0;
    const pitch = foot.pitch * sit;
    const yaw = foot.yaw * sit;
    // setPart turns a part about its pivot: offset it so the leg turns about its hip instead.
    _q.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ'));
    _v.subVectors(foot.hip, this.model.pivots[i]);
    _w.copy(_v).applyQuaternion(_q);
    ox += _v.x - _w.x + (foot.seat.x - foot.hip.x) * sit;
    oy += _v.y - _w.y + (foot.seat.y - foot.hip.y) * sit;
    oz += _v.z - _w.z + (foot.seat.z - tuck - foot.hip.z) * sit;
    this.setPart(i, pitch, yaw, 0, ox, oy, oz);
  }

  private updateParts(): void {
    const p = this.pose;
    this.parts[PART.BODY].identity();
    // Before the parts that hang from it (the ears, the leaves).
    // (eigo-friends: plus the head's own turn from an action: a nod, a head shake, a listening tilt; see Pose.headNod.)
    this.setPart(PART.HEAD, this.headPitch + p.headNod, this.headYaw + p.headTurn, p.headTilt);
    // Left is the model's -x side. Raise lifts the arm sideways, swing moves it forward; an arm that bends
    // also folds at its elbow and wrist, and reaches its paw to a point (see Arms.ts).
    const [raiseL, swingL] = this.armAngles(p.armLRaise, p.armLSwing);
    const [raiseR, swingR] = this.armAngles(p.armRRaise, p.armRSwing);
    if (this.armRig) {
      this.poseArm(0, raiseL, swingL, p.armLBend, p.pawLBend, p.reachL, p.reachLX, p.reachLY, p.reachLZ);
      this.poseArm(1, raiseR, swingR, p.armRBend, p.pawRBend, p.reachR, p.reachRX, p.reachRY, p.reachRZ);
    } else {
      this.setPart(PART.ARM_L, 0, swingL, -raiseL);
      this.setPart(PART.ARM_R, 0, -swingR, raiseR);
    }
    this.setFoot(PART.FOOT_L, 0, p.footLX, p.footLY, p.footLZ);
    this.setFoot(PART.FOOT_R, 1, p.footRX, p.footRY, p.footRZ);
    this.setPart(PART.EAR_L, this.earPitch[0].value, 0, this.earRoll[0].value);
    this.setPart(PART.EAR_R, this.earPitch[1].value, 0, -this.earRoll[1].value);
    this.setPart(PART.EAR_L2, this.earBend[0].value, 0, 0);
    this.setPart(PART.EAR_R2, this.earBend[1].value, 0, 0);
    const skirtHeight = 1 - (1 - this.skirtSeat) * p.sit;
    this.setPart(PART.SKIRT, this.skirtX.value, this.skirtY.value, this.skirtZ.value, 0, 0, 0, skirtHeight);
    // Sitting on the ground, the skirt's hem also spreads out round them on it (see CharacterMaterial's VERT); not
    // on a raised seat, where there is no ground round them for it to lie on.
    this.uniforms.uSkirtFlare.value = this.seatedHigh ? 0 : SKIRT_FLARE * p.sit;
    this.setPart(PART.TAIL, 0, 0, 0, p.tailX, 0, 0);
    this.setPart(PART.SPROUT, 0, 0, this.sprout.value);
    // Sitting lowers the body until its bottom rests on the ground.
    this.poseGroup.position.set(0, p.rootY - this.model.seat.drop * p.sit, 0);
    // Their pose's own turn, then all of them square to the ground under them, their up turned to its (see
    // squareToHill): its rise ahead of them as they face, and to their left (the model's +x).
    this.poseGroup.rotation.set(p.rootPitch, p.rootYaw, p.rootRoll, 'YXZ');
    const sf = Math.sin(this.facing);
    const cf = Math.cos(this.facing);
    const ahead = this.tilt.x * sf + this.tilt.z * cf;
    const left = this.tilt.x * cf - this.tilt.z * sf;
    _groundUp.set(-left, 1, -ahead).normalize();
    this.poseGroup.quaternion.premultiply(_tiltTurn.setFromUnitVectors(_upright, _groundUp));
  }

  private updateFace(dt: number, ctx: FrameContext): void {
    const a = this.action;
    const def = a ? ACTIONS[a.id] : null;
    // Every action (and a jump) has its own face; the chosen expression shows between them.
    const actionExpression = a && def ? def.expression(a.t) : this.airborne ? 'happy' : null;
    this.face.expression = this.lineFace ?? actionExpression ?? this.expressionOverride ?? 'neutral';
    // (eigo-friends: or talking as the app has them, for their own text bubble: see talkingOverride.)
    this.face.talking = this.talkingOverride || !!def?.talking;
    this.face.chewing = !!def?.chewing;
    this.face.eyesClosed = !!(a && def?.eyesClosed?.(a.t));
    this.face.asleep = !!def?.asleep;

    // Glance at the camera when it is in front of the face, wherever their head has turned.
    this.root.worldToLocal(_v.copy(ctx.camera.position));
    _v.applyAxisAngle(UP, -this.headYaw);
    _v.y -= this.height * 0.6;
    let gx = 0;
    let gy = 0;
    if (_v.z > 0.2) {
      gx = clamp(_v.x / _v.z, -1, 1) * 0.035;
      gy = clamp(_v.y / _v.z, -1, 1) * 0.025;
    }
    this.face.gaze.set(gx + this.pose.gazeX, gy + this.pose.gazeY);
    this.face.update(dt);
  }

  /**
   * Outline width for this frame: the world's pen at this character's distance, so every
   * character (and its outfit, painted lines and skirt strokes) is drawn with the same pen as
   * the rest of the world. Call after the camera has moved.
   */
  updateOutline(ctx: FrameContext): void {
    _w.set(0, this.height * 0.5, 0).applyMatrix4(this.root.matrixWorld).applyMatrix4(ctx.camera.matrixWorldInverse);
    this.uniforms.uOutlineWidth.value = penAt(-_w.z);
  }

  /** The trees' shade on the character, easing as they walk into it and out into the sun; after
   * dark, the firelight near them, each light from its own side (see FrameContext.firelight). */
  private updateShade(dt: number, ctx: FrameContext): void {
    if (!ctx.shade) return;
    const pos = this.root.position;
    const y = this.feetY + this.height * 0.55;
    this.inCave = !!ctx.caveLight?.(pos.x, y, pos.z, _cave);
    if (this.inCave) {
      // In the cave its own light lights them, whatever the hour outside: shade is the share of the
      // hour's light (uAmbient) that it is.
      const a = sharedUniforms.uAmbient.value;
      this.uniforms.uShade.value.setRGB(_cave.r / Math.max(a.r, 0.05), _cave.g / Math.max(a.g, 0.05), _cave.b / Math.max(a.b, 0.05));
      // Nor does the open air's light, the sky's in the air (the fog) and the island's lights, reach in.
      this.uniforms.uOpenAir.value = 0;
      this.shaded = NaN;
    } else {
      this.uniforms.uOpenAir.value = 1;
      const shade = ctx.shade(pos.x, y, pos.z);
      this.shaded = Number.isNaN(this.shaded) ? shade : this.shaded + (shade - this.shaded) * Math.min(1, dt * 5);
      this.uniforms.uShade.value.setRGB(1, 1, 1).lerp(CANOPY_SHADE, this.shaded);
    }
    if (ctx.firelight) {
      this.uniforms.uFireFill.value = ctx.firelight(pos.x, y, pos.z, this.fireSeen, dt, this.uniforms.uFire.value, this.fireFrom);
    }
  }

  private updateShadowAndProp(ctx: FrameContext, dt: number): void {
    const pos = this.root.position;
    const ground = Number.isNaN(this.feet) ? ctx.groundHeight(pos.x, pos.z) : this.feet;
    const lift = this.jumpY + Math.max(0, this.pose.rootY);
    const k = 1 - Math.min(0.55, lift * 0.9);
    // The soft round shadow where they touch the ground lies along the ground's slope there (level, it was cut
    // off by a hillside wherever the land rose through it), and is faint: their true shadow is the sun's.
    this.shadow.position.set(pos.x, ground + 0.025, pos.z);
    this.shadow.scale.setScalar(this.width * 1.05 * k);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = k * CONTACT_SHADOW;
    const e = 0.2;
    const sx = ctx.groundHeight(pos.x + e, pos.z, ground) - ctx.groundHeight(pos.x - e, pos.z, ground);
    const sz = ctx.groundHeight(pos.x, pos.z + e, ground) - ctx.groundHeight(pos.x, pos.z - e, ground);
    // (Level at an edge, where the ground beside them is a drop or a step and no slope.)
    if (Math.abs(sx) > 0.3 || Math.abs(sz) > 0.3) _slope.set(0, 1, 0);
    else _slope.set(-sx / (2 * e), 1, -sz / (2 * e)).normalize();
    this.shadow.quaternion.setFromUnitVectors(_facingUp, _slope);
    // A shadow only takes light away. Its warm brown is the hour's light on the ground where they stand
    // (white by day, so as painted; dimmer by night, and in the trees' shade), and none in the forbidden
    // cave, whose floor's light is its own and dim: never lighter than the ground it lies on.
    if (this.inCave) _tint.setRGB(0, 0, 0);
    else _tint.copy(sharedUniforms.uAmbient.value).multiply(this.uniforms.uShade.value);
    (this.shadow.material as THREE.MeshBasicMaterial).color.copy(_tint);
    (this.fireShadow.material as THREE.MeshBasicMaterial).color.copy(_tint);
    this.updateFireShadow(ground, k);

    // What they hold turns as their body does (bowing, swaying).
    _turnNow.setFromRotationMatrix(this.mesh.matrixWorld);
    if (this.torch) {
      // Held up in the right paw (handL: see HAND_LEAN), leaning a little forward, its flame up beside their head.
      this.placeHeld(this.torch, this.torchThick, 'upright', this.anchorLocal('handL', _grip), TORCH_TURN);
    }
    if (this.hand) this.placeHand();
    if (this.carried) {
      // Upright in the left paw (handR), held by its side.
      this.placeHeld(this.carried, this.carryThick, 'upright', this.anchorLocal('handR', _grip), CARRY_TURN);
    }
    const s = Math.sin(this.facing);
    const c = Math.cos(this.facing);
    const playing = !!this.instrument?.visible;
    if (this.ownCarried) {
      // With their own clothes (Rakko's sword): on their back, or held up by its grip in his right paw (handL), its
      // point leaning forward and out.
      this.ownCarried.visible = !!this.ownOutfit?.visible && !this.ownLent;
      if (this.holdsOwn && this.armRig) {
        // In both paws before him (see the sword action's lowerAt and upperAt).
        this.ownCarried.position.copy(this.bodyPoint(SWORD_HOLD, _v));
        this.ownCarried.quaternion.copy(_turnNow).multiply(SWORD_HELD_TURN);
      } else if (this.holdsOwn) {
        this.getAnchor('handL', _v);
        this.ownCarried.position.set(_v.x + s * SWORD_AHEAD + c * SWORD_INWARD, _v.y, _v.z + c * SWORD_AHEAD - s * SWORD_INWARD);
        this.ownCarried.quaternion.copy(_turnNow).multiply(SWORD_STUB_TURN);
      } else {
        this.ownCarried.position.copy(this.bodyPoint(SWORD_BACK_AT, _v));
        this.ownCarried.quaternion.copy(_turnNow).multiply(SWORD_BACK_TURN);
      }
    }
    if (this.instrument && playing) {
      // Across the tummy, its neck up to their left (the model's +x), tipped back a little.
      this.bodyPoint(UKULELE_AT, _v);
      this.instrument.position.copy(_v);
      this.instrument.quaternion.copy(_turnNow).multiply(UKULELE_TURN);
    }
  }

  /** What they hold in their right paw (see hold): up at their mouth while they eat, out before it as their head
   * is turned; a book they read open before their face (READ_AT); else upright in the paw, leaning a little
   * forward, or flat on it; lit as the paw is. */
  private placeHand(): void {
    const hand = this.hand as THREE.Object3D;
    // Put away while the cave's torch is in that paw, or they play what they play.
    hand.visible = !this.torch && !this.instrument?.visible && !this.handGone;
    const light = hand.userData.light as HeldLight | undefined;
    if (light) this.lightHeld(light);
    if (!hand.visible) return;
    const action = this.action;
    const reading = !!action && !!ACTIONS[action.id].reads && !!hand.userData.book;
    showOpen(hand, reading && action ? smoothstep(0, 1, action.t / READ_OPEN) : null);
    if (reading) {
      this.partPoint(_grip.copy(this.model.anchors.mouth).add(READ_AT), PART.HEAD);
      this.mesh.localToWorld(hand.position.copy(_grip));
      hand.quaternion.copy(_turnNow).multiply(_eatTurn.setFromRotationMatrix(this.parts[PART.HEAD]).multiply(READ_TURN));
      return;
    }
    const ready = hand.userData.ready as THREE.Vector3 | undefined;
    if (ready && action && ACTIONS[action.id].readies) {
      // Up before them by its foot, between their paws (see READY_FORWARD), out to its own paw's side (their right).
      this.anchorLocal('handL', _grip);
      this.anchorLocal('handR', _off);
      const side = Math.sign(_grip.x - _off.x) || 1;
      _grip.add(_off).multiplyScalar(0.5);
      this.mesh.localToWorld(hand.position.copy(_grip));
      _readyTurn.setFromEuler(_readyEuler.set(READY_FORWARD, 0, -side * READY_OUT, 'YXZ'));
      hand.quaternion.copy(_turnNow).multiply(_readyTurn);
      hand.position.sub(_off.copy(ready).multiplyScalar(hand.scale.x).applyQuaternion(hand.quaternion));
      return;
    }
    const hold = hand.userData.hold as WeaponHold | undefined;
    if (hold) {
      // A weapon, carried as its kind is (hunt/Weapons.ts WeaponDef.hold) in their right paw (handL):
      // - across before them in both paws, its staff running from their right paw through their left, its head out
      //   past it (see AcrossHold and locomotionPose; its way is taken from their paws as they hold it, and kept through
      //   an attack, while their left may be off it);
      // - else as each kind's CarryHold has it: a club pointing ahead, a sword upright at their side, a stone before them in
      //   both paws.
      // An attack moves it about that paw (ActionDef.held): from the way it is carried toward the way the attack
      // points it, turned about its length, and pushed out along itself or drawn back; on a hill, square to it with the
      // rest of them (see squareToHill).
      this.anchorLocal('handL', _grip);
      const sx = Math.sign(_grip.x) || -1;
      let yaw: number;
      let pitch: number;
      let roll = 0;
      let aside = 0;
      // (Their left paw taken off it by what they do, an emote's wave or cheer, or up to their face: what they hold in
      // both paws stays as it was held, in their right alone. Followed by their left, a fork swung 19 cm into them and
      // a stone 8 cm into their head: see otherPawOff.)
      const off = this.otherPawOff();
      if (hold === 'across') {
        const held = action ? ACTIONS[action.id].held : undefined;
        if ((!held && off === 0) || !(this.acrossWay.lengthSq() > 0)) {
          this.anchorLocal('handR', _off);
          this.acrossWay.subVectors(_off, _grip).normalize();
        }
        const way = this.acrossWay;
        yaw = Math.atan2(sx * way.x, way.z);
        pitch = Math.asin(THREE.MathUtils.clamp(way.y, -1, 1));
        _grip.addScaledVector(way, HOLDS.across.past);
        _grip.y -= HOLDS.across.under;
        _grip.z += HOLDS.across.ahead;
      } else {
        const carry = HOLDS[hold];
        aimOf(carry, _aim);
        yaw = _aim.yaw;
        pitch = _aim.pitch;
        roll = carry.roll * DEGREE;
        aside = carry.aside;
        if (carry.other) {
          // Between their paws, as far as their left is on it (it lets go to throw: then in their right alone). Taken
          // off it by an emote, it stays where both held it, in their right alone, as a weapon across them keeps its
          // way. (Gone over into their right paw, a stone went 4 cm further into everyone cheering or waving.)
          if (off === 0) this.anchorLocal('handR', this.between).sub(_grip).multiplyScalar(0.5 * this.pose.reachR);
          _grip.add(this.between);
        }
        _grip.y += carry.up;
        _grip.z += carry.ahead;
      }
      const m = _heldMove;
      m.blend = m.yaw = m.pitch = m.roll = m.thrust = 0;
      if (action) ACTIONS[action.id].held?.(action.t, m);
      yaw += (m.yaw - yaw) * m.blend;
      pitch += (m.pitch - pitch) * m.blend;
      roll += (m.roll - roll) * m.blend;
      let side = sx * aside * (1 - m.blend);
      let thrust = m.thrust;
      // From how it was, as what they do changed, to how this puts it, as their body eases (see startBlend): an attack cut
      // short (a puff's catching them) does not swing its weapon back to how it is carried at once, while their paws are
      // still where the attack had them. (At once, a fork drawn back and pointing ahead went back across them through
      // their body: 8.6 cm into Rakko.)
      const w = this.weaponNow;
      if (this.blending) {
        const from = this.weaponFrom;
        const e = smoothstep(0, 1, this.blendT / this.blendDur);
        yaw = from.yaw + (yaw - from.yaw) * e;
        pitch = from.pitch + (pitch - from.pitch) * e;
        roll = from.roll + (roll - from.roll) * e;
        side = from.side + (side - from.side) * e;
        thrust = from.thrust + (thrust - from.thrust) * e;
      }
      Object.assign(w, { yaw, pitch, roll, side, thrust });
      _grip.x += side;
      // Its length (+y) the way it points; its face (+z) level and square to that, to the front when it lies across
      // them; its width (+x: a fork's U, a blade's edges) square to both. Then turned about its length, as it is
      // carried (CarryHold's roll) and as an attack turns it.
      const flat = Math.cos(pitch);
      _weaponWay.set(sx * Math.sin(yaw) * flat, Math.sin(pitch), Math.cos(yaw) * flat);
      _acrossFront.set(sx * Math.cos(yaw), 0, -Math.sin(yaw));
      _acrossUp.crossVectors(_weaponWay, _acrossFront);
      _readyTurn.setFromRotationMatrix(_acrossBasis.makeBasis(_acrossUp, _weaponWay, _acrossFront));
      _swingTurn.setFromAxisAngle(_weaponWay, roll);
      _grip.addScaledVector(_weaponWay, thrust);
      // Just there, wherever it is carried and an attack takes it: nothing moves it out of them (see Holding.ts). What
      // goes into anyone is found by the checks (dev/Checks.ts), everyone in every motion, and put right in the hold
      // (holds.json) or the motion (attacks.json, emotes.json).
      _weaponTurn.copy(_swingTurn).multiply(_readyTurn);
      this.placeHeld(hand, this.handThick, 'gripped', _grip, _weaponTurn);
      return;
    }
    let way: HoldWay;
    let base: THREE.Quaternion;
    if (this.action?.id === 'eat') {
      way = 'eat';
      _off.set(0, -HAND_MOUTH_DOWN, HAND_MOUTH_OUT).add(this.model.anchors.mouth);
      this.partPoint(_grip.copy(_off), PART.HEAD);
      base = _eatTurn.setFromRotationMatrix(this.parts[PART.HEAD]).multiply(HELD_TURN.eat);
    } else {
      way = this.handFlat ? 'flat' : 'upright';
      this.anchorLocal('handL', _grip);
      if (this.handFlat) {
        _grip.y += HAND_FLAT_UP;
        _grip.z += HAND_FLAT_AHEAD;
      }
      base = HELD_TURN[way];
    }
    this.placeHeld(hand, this.handThick, way, _grip, base);
  }

  /**
   * Follows (`tilt`) how steeply the ground under them rises, along the world's x and z, so that all of them, body,
   * paws and what they hold, stand square to it in everything they do (see updateParts: their up turned to the ground's):
   * on a hill, what they hold keeps out of it as it keeps out of level ground, as the checks have it there. (The user,
   * 2026-11-13, "lean with the slope": upright, a fork carried across them, low before them, touched a hill rising 15
   * degrees toward its head, and a bow took any weapon into it. Attacks alone were squared till then: their weapon alone
   * turned up after a hill, a club's handle had gone into the hill under their paw, and its head into their own face.)
   * Each way, from the ground they could step onto (decks within a step of their feet: Ground's groundHeight) over
   * SLOPE_REACH on either side of them: where both sides rise alike, the gentler (a step, a deck's edge or a kerb on one
   * side is not a slope); where they rise opposite ways (a ridge, a hollow, a gap between two kerbs), level. At most
   * MOST_TILT, followed at TILT_FOLLOW. Riding (a boat, a seat), upright on it. (Taken as high as what they hold can
   * reach, a platform beside them, half a metre up, leaned them over 15 degrees.)
   */
  private squareToHill(ctx: FrameContext, dt: number): void {
    let gx = 0;
    let gz = 0;
    if (!this.ride) {
      const feet = this.feetY;
      const { x, z } = this.position;
      const r = SLOPE_REACH;
      const at = (dx: number, dz: number) => ctx.groundHeight(x + dx, z + dz, feet);
      const under = at(0, 0);
      const slope = (a: number, b: number) => (a * b <= 0 ? 0 : Math.abs(a) < Math.abs(b) ? a : b);
      gx = slope(at(r, 0) - under, under - at(-r, 0)) / r;
      gz = slope(at(0, r) - under, under - at(0, -r)) / r;
      const most = Math.tan(MOST_TILT);
      const steep = Math.hypot(gx, gz);
      if (steep > most) {
        gx *= most / steep;
        gz *= most / steep;
      }
    }
    const t = this.tilt;
    const k = 1 - Math.exp(-TILT_FOLLOW * dt);
    t.x += (gx - t.x) * k;
    t.z += (gz - t.z) * k;
  }

  /** Puts `thing` (`thick` thick where it is held, as built), held `way` with its grip at `grip` (in their body's own
   * frame as drawn) and turned `base` there, in the world: just there (see Holding.ts heldAt). */
  private placeHeld(thing: THREE.Object3D, thick: number, way: HoldWay, grip: THREE.Vector3, base: THREE.Quaternion): void {
    this.mesh.localToWorld(heldAt(grip, way, thick * thing.scale.x, thing.position));
    thing.quaternion.copy(_turnNow).multiply(base);
  }

  /**
   * The strongest firelight's shadow on the ground at `ground`: from their feet away from the light,
   * as long as their height throws it from the light's height and distance (a lantern overhead
   * throws a short one, a torch off to the side a longer one), as dark as the light on them is
   * strong. `k` thins it as they leave the ground.
   */
  private updateFireShadow(ground: number, k: number): void {
    const light = this.uniforms.uFire.value[0];
    const pos = this.root.position;
    let ax = pos.x - this.fireFrom.x;
    let az = pos.z - this.fireFrom.z;
    const flat = Math.hypot(ax, az);
    const strength = Math.min(light.w * FIRE_SHADOW, 1);
    if (strength < 0.03 || flat < 0.05) {
      this.fireShadow.visible = false;
      return;
    }
    ax /= flat;
    az /= flat;
    const tall = this.height * 0.9;
    const above = this.fireFrom.y - ground;
    const length = clamp((flat * tall) / Math.max(above - tall, 0.25), 0.3, 2.5);
    // From a little behind their feet (under them) out to the shadow's end.
    const back = this.width * 0.25;
    const middle = (length - back) / 2;
    this.fireShadow.visible = true;
    this.fireShadow.position.set(pos.x + ax * middle, ground + 0.03, pos.z + az * middle);
    this.fireShadow.rotation.set(-Math.PI / 2, 0, Math.atan2(-ax, -az));
    this.fireShadow.scale.set(this.width * 0.95 * k, length + back, 1);
    (this.fireShadow.material as THREE.MeshBasicMaterial).opacity = strength * k;
  }
}
