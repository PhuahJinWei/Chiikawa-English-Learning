import * as THREE from 'three';

/**
 * What someone holds, held just where it is held. (Their shape, which what they hold is measured against, is
 * BodyShape.ts's.)
 *
 * A weapon is where its hold (holds.json, tuned by eye in the testing ground) and its attack put it; any other thing
 * upright in the paw by its side, flat on it, or up at the mouth (see Character's placeHand). Nothing moves it out of
 * them as they play. Whether it goes into anyone is for the testing ground's checks (dev/Checks.ts) to find, everyone
 * with every weapon in every motion, and what they find is put right where it comes from: in the hold, or the motion.
 * (The user, 2026-11-12: "a straightforward system", not special passes.)
 *
 * (Till then a fit here moved whatever they held out of them every frame, tipped and pushed out from the paw as far as
 * cleared them by its own rough stand-in of their shape and a margin of its own. It hid holds that went into them, and
 * moved holds that did not: a fork held at the paws was shown 6 cm out from them, never where it was tuned, and the
 * user found the holds they tuned "held together" by it. Measured without it, every pairing with the sword was clear;
 * the spring went into them only as it was heaved overhead to smash; the forks and the stone went in by 2 to 8 cm.)
 */

/** How a thing is held (see Character's placeHand): upright in the paw, flat on it, up at the mouth, or by its grip (a
 * weapon: the paw round its handle, its middle at the paw, not beside it as a thing held upright by its side is). */
export type HoldWay = 'upright' | 'flat' | 'eat' | 'gripped';

/** How far round its grip's height a held thing is looked at for how thick it is there (metres, half above, half below). */
const GRIP_SLICE = 0.02;
const thicknessOf = new WeakMap<THREE.BufferGeometry, number>();

/** How thick `thing` (made by createHeld: its body, its pen, a torch's flame; or the cave's torch) is where it is held,
 * at its grip (its y = 0), out from the grip's middle, as built: a stick's stick, a cup's middle. A thing held upright
 * is held by its side, its middle this far out from the paw (see heldAt). Found once a shape. */
export function gripThickness(thing: THREE.Object3D): number {
  const shape = shapeOf(thing);
  if (!shape) return 0;
  let thick = thicknessOf.get(shape);
  if (thick === undefined) thicknessOf.set(shape, (thick = acrossGrip(shape)));
  return thick;
}

/** What `thing` (made by createHeld) is shaped as: its body's shape, or none. */
function shapeOf(thing: THREE.Object3D): THREE.BufferGeometry | undefined {
  const meshes: THREE.Mesh[] = [];
  thing.traverse((o) => {
    const m = o as THREE.Mesh;
    // (Not its pen's hull, nor a book's halves open, held only as it is read: see Items' ItemModels.)
    if (m.isMesh && (m.material as THREE.Material).side !== THREE.BackSide && !m.userData.unheld) meshes.push(m);
  });
  return meshes[0]?.geometry;
}

/** The ground under what someone holds is what is no higher than this over their feet (metres: a step, as the game
 * takes what they stand on), not the top of a deck they hold it over. */
export const GROUND_STEP = 0.3;

/** How far out from its middle (its y axis) `g` reaches round its grip: its points within half a slice of the grip's
 * height, and where its edges cross that height. */
function acrossGrip(g: THREE.BufferGeometry): number {
  const position = g.getAttribute('position');
  const index = g.index;
  const count = index ? index.count : position.count;
  const at = (k: number) => (index ? index.getX(k) : k);
  let r = 0;
  for (let k = 0; k + 2 < count; k += 3) {
    for (let e = 0; e < 3; e++) {
      const a = at(k + e);
      const b = at(k + ((e + 1) % 3));
      const ya = position.getY(a);
      const yb = position.getY(b);
      if (Math.abs(ya) <= GRIP_SLICE / 2) r = Math.max(r, Math.hypot(position.getX(a), position.getZ(a)));
      if (ya <= 0 === yb <= 0) continue;
      const t = ya / (ya - yb);
      const x = position.getX(a) + (position.getX(b) - position.getX(a)) * t;
      const z = position.getZ(a) + (position.getZ(b) - position.getZ(a)) * t;
      r = Math.max(r, Math.hypot(x, z));
    }
  }
  return r;
}

/** Where the middle of a thing held `way` at `grip` (in their body's own frame, as drawn), `thick` thick there as it
 * is now (see gripThickness), sits, into `out`: held upright, by its side, out from the paw away from their middle
 * along the ground; else at the paw. */
export function heldAt(grip: THREE.Vector3, way: HoldWay, thick: number, out: THREE.Vector3): THREE.Vector3 {
  _side.set(grip.x, 0, grip.z);
  out.copy(grip);
  if (way !== 'upright') return out;
  if (_side.lengthSq() < 1e-6) _side.set(0, 0, 1);
  return out.addScaledVector(_side.normalize(), thick);
}

const _side = new THREE.Vector3();
