import * as THREE from 'three';
import { MAX_PARTS, PART, type CharacterModel, type OutfitModel } from './Model';

/**
 * Someone's shape as drawn, which what they hold is measured against (the testing ground's checks and readout:
 * dev/measure.ts, through Character.depthAtWorld): to within a few millimetres of the drawn model (the user, 2026-11-12:
 * "accuracy first").
 *
 * They are drawn as pieces, each moved by its own part (Character's parts) and then all squashed and leaned together
 * (CharacterMaterial's softBody): their body, their head, each ear (in two, where it bends), their tail, a sprout, a
 * skirt. Each piece's shape is kept as how deep every point of a grid round it is in it, in its own frame as built (see
 * PieceField), made the first time it is measured (never in the game itself). A point of them as drawn is taken back
 * through the squash and lean and into each piece's frame by its part; how deep it is in them is how deep it is in the
 * piece it is deepest in.
 *
 * (Till then their shape was kept as how far out round their middle it reached, row by row and way by way, each place as
 * far as its farthest neighbour: never thinner than drawn, but 2 cm fatter at the middle of it, 5 to 9 cm in a tenth of
 * it, and up to 20 cm under the head's rim, where paws hold things. What was held there was told as going into them
 * when it was clear of them.)
 */

/** The parts that are pieces of their shape. Not their arms, paws or feet: a paw holds what is held, and the other may
 * too; feet stand under them. */
const PIECES: readonly number[] = [PART.BODY, PART.HEAD, PART.EAR_L, PART.EAR_R, PART.EAR_L2, PART.EAR_R2, PART.TAIL, PART.SPROUT, PART.SKIRT];

/** A piece's grid: its points this far apart (metres), out this far round the piece (its margin, metres). How deep each
 * point is in it is exact nearer the piece than BAND (by the nearest of its faces); further, as near as two passes across
 * the grid find it (a little further than it is, never nearer). */
const CELL = 0.01;
const MARGIN = 0.04;
const BAND = 0.03;
/** A piece read from outside the ball round it reads no deeper than how far out of the ball it is, less this (metres:
 * what reading between a grid's points may add, at a crease); so a piece further off than that from being deeper than
 * what is asked about is not read (see BodyShape.depthAt). */
const BALL_SLACK = 0.01;
/** Built shapes kept over reloads in the browser's IndexedDB (development only: the testing ground's checks build them,
 * some 2 s for the cast, after every reload; the game never does), each by what it was built from: its geometries' numbers
 * and this very file's code as served (see keyOf). So what is taken up is what would be built. */
const KEPT_DB = 'chiikawa-rpg-dev-shapes';
const KEPT_STORE = 'shapes';
/** Lines across a grid are laid off its points by these few micrometres (see insideOf), so that none runs exactly through
 * a face's corner or edge, where it would cross two faces, or none. */
const JITTER_U = 1.37e-6;
const JITTER_V = 2.71e-6;

/**
 * One piece's shape: how deep each point of a grid round it is in it (metres; below 0, how far clear), in its own frame
 * as built. Between the points, as much of each as the point lies near it (trilinear): smooth as their round shapes are,
 * within a fraction of a millimetre of the faces; at a crease, within a few.
 */
class PieceField {
  // (eigo-friends: parameter properties written out as fields, for the app's `erasableSyntaxOnly`.)
  private readonly ox: number;
  private readonly oy: number;
  private readonly oz: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly nz: number;
  private readonly depth: Float32Array;

  constructor(ox: number, oy: number, oz: number, nx: number, ny: number, nz: number, depth: Float32Array) {
    this.ox = ox;
    this.oy = oy;
    this.oz = oz;
    this.nx = nx;
    this.ny = ny;
    this.nz = nz;
    this.depth = depth;
  }

  /** Its numbers, to be kept (see KEPT_DB) and taken up again as they are. */
  kept(): KeptField {
    return { ox: this.ox, oy: this.oy, oz: this.oz, nx: this.nx, ny: this.ny, nz: this.nz, depth: this.depth };
  }

  /** How fast its readings change at most (metres for each metre) between neighbouring points along any of its three
   * ways: a distance's, 1, as built (see BodyShape.steepness, which counts on it). */
  steepest(): number {
    const { nx, ny, nz } = this;
    const d = this.depth;
    let most = 0;
    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        const row = nx * (iy + ny * iz);
        for (let ix = 0; ix < nx; ix++) {
          const i = row + ix;
          const v = d[i];
          if (ix + 1 < nx) most = Math.max(most, Math.abs(d[i + 1] - v));
          if (iy + 1 < ny) most = Math.max(most, Math.abs(d[i + nx] - v));
          if (iz + 1 < nz) most = Math.max(most, Math.abs(d[i + nx * ny] - v));
        }
      }
    }
    return most / CELL;
  }

  /** How deep (x, y, z), in the piece's own frame as built, is in it. Off its grid, as clear as the nearest place on the
   * grid's edge is, and as far again as it is from there: so it reads the same either side of the edge, never changing
   * faster than a point moves (see dev/measure.ts, which counts on it). (Read as clear by the margin and how far off the
   * grid it was, it read nearer just off the edge than just on it, by as much as 4 cm: 4.0 cm clear, wherever it was.) */
  at(x: number, y: number, z: number): number {
    const nx = this.nx;
    const ny = this.ny;
    const nz = this.nz;
    let fx = (x - this.ox) / CELL;
    let fy = (y - this.oy) / CELL;
    let fz = (z - this.oz) / CELL;
    let off = 0;
    if (!(fx >= 0 && fy >= 0 && fz >= 0 && fx <= nx - 1 && fy <= ny - 1 && fz <= nz - 1)) {
      const cx = Math.min(Math.max(fx, 0), nx - 1);
      const cy = Math.min(Math.max(fy, 0), ny - 1);
      const cz = Math.min(Math.max(fz, 0), nz - 1);
      off = Math.hypot(fx - cx, fy - cy, fz - cz) * CELL;
      fx = cx;
      fy = cy;
      fz = cz;
    }
    const ix = Math.min(Math.floor(fx), nx - 2);
    const iy = Math.min(Math.floor(fy), ny - 2);
    const iz = Math.min(Math.floor(fz), nz - 2);
    const tx = fx - ix;
    const ty = fy - iy;
    const tz = fz - iz;
    const d = this.depth;
    const sy = nx;
    const sz = nx * ny;
    const i = ix + sy * iy + sz * iz;
    const c00 = d[i] + (d[i + 1] - d[i]) * tx;
    const c10 = d[i + sy] + (d[i + sy + 1] - d[i + sy]) * tx;
    const c01 = d[i + sz] + (d[i + sz + 1] - d[i + sz]) * tx;
    const c11 = d[i + sz + sy] + (d[i + sz + sy + 1] - d[i + sz + sy]) * tx;
    const c0 = c00 + (c10 - c00) * ty;
    const c1 = c01 + (c11 - c01) * ty;
    return c0 + (c1 - c0) * tz - off;
  }
}

/**
 * Someone's shape (see the top): each piece's grid, made the first time any of it is measured, once a model (and what it
 * wears).
 */
export class BodyShape {
  private static readonly made = new WeakMap<THREE.BufferGeometry, Map<string, BodyShape>>();
  /** Each piece there is: its part, its grid (made when first measured: see build), and the ball round it in its own
   * frame (its middle's x, y, z, and its radius). */
  private pieces: { part: number; field: PieceField; ball: number[] }[] | null = null;
  /** How fast its grids' readings change at most, for each metre along any of a grid's three ways (a distance's: 1;
   * measured as they are built, see build): what steepness counts on. */
  private gridSteep = 1;

  // (eigo-friends: a parameter property written out as a field, for the app's `erasableSyntaxOnly`.)
  private readonly geometries: THREE.BufferGeometry[];

  private constructor(geometries: THREE.BufferGeometry[]) {
    this.geometries = geometries;
  }

  static of(model: CharacterModel, worn: (OutfitModel | undefined)[]): BodyShape {
    const key = worn.map((o) => o?.geometry.uuid ?? '-').join(',');
    let byWorn = BodyShape.made.get(model.geometry);
    if (!byWorn) BodyShape.made.set(model.geometry, (byWorn = new Map()));
    let shape = byWorn.get(key);
    if (!shape) {
      shape = new BodyShape([model.geometry, ...worn.filter((o): o is OutfitModel => !!o).map((o) => o.geometry)]);
      byWorn.set(key, shape);
    }
    return shape;
  }

  /** Each piece's grid, made now (once), and kept for the next page (see KEPT_DB). */
  build(): void {
    if (this.pieces) return;
    this.pieces = [];
    for (const part of PIECES) {
      const faces = piecesFaces(this.geometries, part);
      if (!faces.length) continue;
      const whole = capped(faces);
      const field = fieldOf(whole);
      this.gridSteep = Math.max(this.gridSteep, field.steepest());
      this.pieces.push({ part, field, ball: ballOf(whole) });
    }
    const pieces = this.pieces;
    const gridSteep = this.gridSteep;
    void keyOf(this.geometries).then((key) => {
      if (key) void keepShape(key, { gridSteep, pieces: pieces.map((p) => ({ part: p.part, ball: p.ball, ...p.field.kept() })) });
    });
  }

  /** Made ready to be measured: taken up as kept from an earlier page, built from the very same (see KEPT_DB), or else
   * built now. The testing ground's checks wait for it before they measure (else it is built as it is first measured). */
  async ready(): Promise<void> {
    if (this.pieces) return;
    const key = await keyOf(this.geometries);
    const kept = key ? await keptShape(key) : null;
    if (this.pieces) return;
    if (!kept) {
      this.build();
      return;
    }
    this.gridSteep = kept.gridSteep;
    this.pieces = kept.pieces.map((p) => ({ part: p.part, ball: p.ball, field: new PieceField(p.ox, p.oy, p.oz, p.nx, p.ny, p.nz, p.depth) }));
  }

  /**
   * How fast (at most) a reading of their shape (see depthAt) changes, for each metre a point moves, anywhere at or below
   * `top` (a height in their body's own frame as drawn), as they are now (`pose`). Each piece's grid changes no faster than
   * `gridSteep` along each of its three ways, so no faster than √3 times that any way, within it and beyond its edge (see
   * PieceField.at), and the deepest of the pieces no faster than the fastest; taken back through the squash (√squash
   * across, 1/squash up) and the lean (the more, the higher: at `top` at most) and each part's turn (its stretch), a
   * point's reading changes no faster than all those times together. Exact: dev/measure.ts passes bunches of points over by
   * it. (A fixed 2.5 and a centimetre more did till 2026-11-15: their squash on landing, down to 0.77, can ask for more,
   * the centimetre covering it; any ordinary frame asks for about 1.8.)
   */
  steepness(top: number, pose: BodyPose): number {
    if (!this.pieces) this.build();
    const h = Math.max(top / pose.squash, 0) / pose.height;
    const lean = (2 * h * pose.root * Math.hypot(pose.leanX, pose.leanZ)) / pose.squash;
    return this.gridSteep * Math.sqrt(3) * pose.stretch * (Math.max(pose.root, 1 / pose.squash) + lean);
  }

  /**
   * How deep (x, y, z), a point in their body's own frame as drawn, is in them as they are now (`pose`): below 0, how
   * far clear of them it is. Taken back through their squash and lean (as CharacterMaterial's softBody does them), and
   * into each piece's own frame as built by its part's turn; the deepest of the pieces. Many a frame, so in plain numbers.
   * `above`: only what is deeper than this is asked about. A piece too far off to be deeper than it (or than the deepest
   * so far) is not read; so what is told, where nothing is deeper than `above`, may be less deep than it is (or
   * -Infinity), never deeper.
   */
  depthAt(x: number, y: number, z: number, pose: BodyPose, above = -Infinity): number {
    if (!this.pieces) this.build();
    const py = y / pose.squash;
    const h = Math.max(py, 0) / pose.height;
    const px = (x - pose.leanX * h * h * pose.height) * pose.root;
    const pz = (z - pose.leanZ * h * h * pose.height) * pose.root;
    let deep = -Infinity;
    for (const piece of this.pieces as { part: number; field: PieceField; ball: number[] }[]) {
      const e = pose.back[piece.part];
      const qx = e[0] * px + e[4] * py + e[8] * pz + e[12];
      const qy = e[1] * px + e[5] * py + e[9] * pz + e[13];
      const qz = e[2] * px + e[6] * py + e[10] * pz + e[14];
      const b = piece.ball;
      const dx = qx - b[0];
      const dy = qy - b[1];
      const dz = qz - b[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > b[3] * b[3] && b[3] - Math.sqrt(d2) + BALL_SLACK <= Math.max(deep, above)) continue;
      const d = piece.field.at(qx, qy, qz);
      if (d > deep) deep = d;
    }
    return deep;
  }
}

/** A piece's grid as kept (see KEPT_DB). */
interface KeptField {
  ox: number;
  oy: number;
  oz: number;
  nx: number;
  ny: number;
  nz: number;
  depth: Float32Array;
}

/** A built shape as kept (see KEPT_DB): how fast its grids change at most, and each piece's part, ball and grid. */
interface KeptShape {
  gridSteep: number;
  pieces: ({ part: number; ball: number[] } & KeptField)[];
}

/** This file's own code as served, as a short text (once a page): a shape kept from other code is built afresh. */
let codeKey: Promise<string> | null = null;

/** What a shape built from `geometries` is kept by (see KEPT_DB): this file's code, and their numbers (each one's points,
 * which part each corner goes with and how much, and its faces), hashed two ways over every byte; '' where it cannot be
 * told (the code not to be had), and nothing is kept. */
async function keyOf(geometries: THREE.BufferGeometry[]): Promise<string> {
  codeKey ??= fetch(import.meta.url, { cache: 'no-store' })
    .then((reply) => (reply.ok ? reply.text() : ''))
    .then((text) => (text ? hashOf([new TextEncoder().encode(text)]) : ''), () => '');
  const code = await codeKey;
  if (!code) return '';
  const arrays: ArrayBufferView[] = [];
  for (const g of geometries) {
    for (const name of ['position', 'aPart0', 'aPart1', 'aWeight']) {
      const a = g.getAttribute(name);
      if (a) arrays.push(a.array as unknown as ArrayBufferView);
    }
    if (g.index) arrays.push(g.index.array as unknown as ArrayBufferView);
  }
  return `${code}:${hashOf(arrays)}`;
}

/** Every byte of `arrays`, hashed two ways (FNV-1a, and a multiply-and-shift of another seed), as hex. */
function hashOf(arrays: ArrayBufferView[]): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (const v of arrays) {
    const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
    for (let i = 0; i < bytes.length; i++) {
      a = Math.imul(a ^ bytes[i], 16777619);
      b = Math.imul(b ^ bytes[i], 2246822519) ^ (b >>> 13);
    }
    a = Math.imul(a ^ bytes.length, 16777619);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

let keptDb: Promise<IDBDatabase | null> | null = null;
/** The kept shapes' store (see KEPT_DB), or null where the browser keeps none (a private window). */
function openKept(): Promise<IDBDatabase | null> {
  keptDb ??= new Promise((done) => {
    try {
      const open = indexedDB.open(KEPT_DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(KEPT_STORE);
      open.onsuccess = () => done(open.result);
      open.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
  return keptDb;
}

/** The shape kept by `key`, or null. */
async function keptShape(key: string): Promise<KeptShape | null> {
  const db = await openKept();
  if (!db) return null;
  return new Promise((done) => {
    try {
      const get = db.transaction(KEPT_STORE).objectStore(KEPT_STORE).get(key);
      get.onsuccess = () => done((get.result as KeptShape | undefined) ?? null);
      get.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
}

/** `shape` kept by `key`; those kept from other code, of no more use, let go. */
async function keepShape(key: string, shape: KeptShape): Promise<void> {
  const db = await openKept();
  if (!db) return;
  const code = key.split(':')[0];
  await new Promise<void>((done) => {
    try {
      const tx = db.transaction(KEPT_STORE, 'readwrite');
      const store = tx.objectStore(KEPT_STORE);
      const keys = store.getAllKeys();
      keys.onsuccess = () => {
        for (const k of keys.result) if (String(k).split(':')[0] !== code) store.delete(k);
      };
      store.put(shape, key);
      tx.oncomplete = tx.onerror = tx.onabort = () => done();
    } catch {
      done();
    }
  });
}

/**
 * Someone as they are this moment, for their shape to be measured against (see BodyShape.depthAt): their squash and lean
 * (CharacterMaterial's softBody), their height, and each part turned back to as built (its matrix's inverse, as numbers).
 * Taken when it is measured (Character.depthAtWorld), once a frame.
 */
export class BodyPose {
  squash = 1;
  /** The square root of the squash: what undoes its narrowing. */
  root = 1;
  leanX = 0;
  leanZ = 0;
  height = 1;
  /** How much a part's turn back can stretch a distance, at most (1: each piece turned only, as they are; see steepness). */
  stretch = 1;
  readonly back: number[][] = Array.from({ length: MAX_PARTS }, () => new THREE.Matrix4().elements.slice());

  set(squash: number, lean: THREE.Vector2, height: number, parts: readonly THREE.Matrix4[]): void {
    this.squash = Math.max(squash, 0.3);
    this.root = Math.sqrt(this.squash);
    this.leanX = lean.x;
    this.leanZ = lean.y;
    this.height = height;
    this.stretch = 1;
    for (const part of PIECES) {
      _m.copy(parts[part]).invert();
      const back = this.back[part];
      for (let i = 0; i < 16; i++) back[i] = _m.elements[i];
      this.stretch = Math.max(this.stretch, stretchOf(back));
    }
  }
}

/** How much the turn (and growth) of matrix `e` (its elements) can stretch a distance, at most: 1 for a turn alone (its
 * three ways square to one another, each its own length); otherwise no more than the root of the sum of its numbers'
 * squares, as all its ways together could at most. */
export function stretchOf(e: ArrayLike<number>): number {
  const a = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
  const b = e[4] * e[4] + e[5] * e[5] + e[6] * e[6];
  const c = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
  const ab = e[0] * e[4] + e[1] * e[5] + e[2] * e[6];
  const bc = e[4] * e[8] + e[5] * e[9] + e[6] * e[10];
  const ca = e[8] * e[0] + e[9] * e[1] + e[10] * e[2];
  // (Square ways, each as long: so much, exactly; within what rounding leaves.)
  const most = Math.max(a, b, c);
  if (Math.abs(a - b) < 1e-9 * most && Math.abs(b - c) < 1e-9 * most && Math.abs(ab) + Math.abs(bc) + Math.abs(ca) < 1e-9 * most) {
    return Math.sqrt(most) * (1 + 1e-9);
  }
  return Math.sqrt(a + b + c);
}

/** A piece's faces as built, three corners each (nine numbers), from the model and what it wears: each face in the piece
 * its corners are most of (as CharacterMaterial blends them). */
function piecesFaces(geometries: THREE.BufferGeometry[], piece: number): number[] {
  const out: number[] = [];
  for (const g of geometries) {
    const position = g.getAttribute('position');
    const part0 = g.getAttribute('aPart0');
    const part1 = g.getAttribute('aPart1');
    const weight = g.getAttribute('aWeight');
    const partOf = (i: number) => {
      const p0 = part0 ? Math.round(part0.getX(i)) : PART.BODY;
      const p1 = part1 ? Math.round(part1.getX(i)) : p0;
      return weight && weight.getX(i) > 0.5 ? p1 : p0;
    };
    const index = g.index;
    const count = index ? index.count : position.count;
    const at = (k: number) => (index ? index.getX(k) : k);
    for (let k = 0; k + 2 < count; k += 3) {
      const a = at(k);
      const b = at(k + 1);
      const c = at(k + 2);
      const pa = partOf(a);
      const pb = partOf(b);
      const pc = partOf(c);
      if ((pa === pb || pa === pc ? pa : pb === pc ? pb : pa) !== piece) continue;
      for (const v of [a, b, c]) out.push(position.getX(v), position.getY(v), position.getZ(v));
    }
  }
  return out;
}

/**
 * `faces` with every hole closed: each run of edges only one face has (where a piece goes into another, out of sight:
 * their body's open top inside their head, an ear's foot, the joint of an ear that bends) closed by a fan of faces round
 * its middle, turned as the faces round it are. So each piece is whole, and what is inside it can be told (see insideOf).
 * (Corners are taken as one where they are within a tenth of a millimetre: a model's corners are doubled along its seams.)
 */
function capped(faces: number[]): number[] {
  const ids = new Map<string, number>();
  const points: number[] = [];
  const idOf = (i: number) => {
    const key = `${Math.round(faces[i] * 1e4)},${Math.round(faces[i + 1] * 1e4)},${Math.round(faces[i + 2] * 1e4)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = points.length / 3;
      ids.set(key, id);
      points.push(faces[i], faces[i + 1], faces[i + 2]);
    }
    return id;
  };
  // Each edge, the way the first face to have it goes round it, and how many have it.
  const edges = new Map<string, { from: number; to: number; n: number }>();
  for (let f = 0; f < faces.length; f += 9) {
    const corners = [idOf(f), idOf(f + 3), idOf(f + 6)];
    for (let e = 0; e < 3; e++) {
      const u = corners[e];
      const v = corners[(e + 1) % 3];
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      const was = edges.get(key);
      if (was) was.n++;
      else edges.set(key, { from: u, to: v, n: 1 });
    }
  }
  const open = [...edges.values()].filter((e) => e.n === 1);
  if (!open.length) return faces;
  // The open edges, run by run (those that meet), each closed by a fan round its middle.
  const near = new Map<number, number[]>();
  for (const e of open) {
    (near.get(e.from) ?? near.set(e.from, []).get(e.from) ?? []).push(e.to);
    (near.get(e.to) ?? near.set(e.to, []).get(e.to) ?? []).push(e.from);
  }
  const runOf = new Map<number, number>();
  const middles: number[][] = [];
  for (const start of near.keys()) {
    if (runOf.has(start)) continue;
    const run = middles.length;
    const corners: number[] = [];
    const stack = [start];
    while (stack.length) {
      const v = stack.pop() as number;
      if (runOf.has(v)) continue;
      runOf.set(v, run);
      corners.push(v);
      for (const w of near.get(v) ?? []) if (!runOf.has(w)) stack.push(w);
    }
    const middle = [0, 0, 0];
    for (const v of corners) for (let k = 0; k < 3; k++) middle[k] += points[3 * v + k] / corners.length;
    middles.push(middle);
  }
  const out = faces.slice();
  for (const e of open) {
    const m = middles[runOf.get(e.from) as number];
    // (The face that has it goes from -> to; the fan's goes to -> from: turned as it is.)
    out.push(points[3 * e.to], points[3 * e.to + 1], points[3 * e.to + 2], points[3 * e.from], points[3 * e.from + 1], points[3 * e.from + 2], m[0], m[1], m[2]);
  }
  return out;
}

/** The ball round `faces`: the middle of the box round them, and as far as the farthest corner is from it. */
function ballOf(faces: number[]): number[] {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < faces.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], faces[i + k]);
      hi[k] = Math.max(hi[k], faces[i + k]);
    }
  }
  const c = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2);
  let r = 0;
  for (let i = 0; i < faces.length; i += 3) r = Math.max(r, Math.hypot(faces[i] - c[0], faces[i + 1] - c[1], faces[i + 2] - c[2]));
  return [c[0], c[1], c[2], r];
}

/** A piece's grid (see PieceField) from its faces, whole (see capped). */
function fieldOf(faces: number[]): PieceField {
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < faces.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], faces[i + k]);
      hi[k] = Math.max(hi[k], faces[i + k]);
    }
  }
  lo = lo.map((v) => v - MARGIN);
  hi = hi.map((v) => v + MARGIN);
  const n = [0, 1, 2].map((k) => Math.max(2, Math.ceil((hi[k] - lo[k]) / CELL) + 1));
  const [nx, ny, nz] = n;
  const dist = nearestOf(faces, lo, n);
  spread(dist, nx, ny, nz);
  const inside = insideOf(faces, lo, n);
  const depth = new Float32Array(dist.length);
  for (let i = 0; i < depth.length; i++) depth[i] = inside[i] ? dist[i] : -dist[i];
  return new PieceField(lo[0], lo[1], lo[2], nx, ny, nz, depth);
}

/** How far each point of a grid (from `lo`, `n` points each way) is from the nearest of `faces`, where it is nearer one
 * than BAND (exactly); elsewhere, Infinity (see spread). */
function nearestOf(faces: number[], lo: number[], n: number[]): Float32Array {
  const [nx, ny, nz] = n;
  const near2 = new Float32Array(nx * ny * nz).fill(Infinity);
  const reach2 = BAND * BAND;
  for (let f = 0; f < faces.length; f += 9) {
    const ax = faces[f];
    const ay = faces[f + 1];
    const az = faces[f + 2];
    const bx = faces[f + 3];
    const by = faces[f + 4];
    const bz = faces[f + 5];
    const cx = faces[f + 6];
    const cy = faces[f + 7];
    const cz = faces[f + 8];
    const x0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - BAND - lo[0]) / CELL));
    const x1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) + BAND - lo[0]) / CELL));
    const y0 = Math.max(0, Math.ceil((Math.min(ay, by, cy) - BAND - lo[1]) / CELL));
    const y1 = Math.min(ny - 1, Math.floor((Math.max(ay, by, cy) + BAND - lo[1]) / CELL));
    const z0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - BAND - lo[2]) / CELL));
    const z1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) + BAND - lo[2]) / CELL));
    for (let z = z0; z <= z1; z++) {
      const pz = lo[2] + z * CELL;
      for (let y = y0; y <= y1; y++) {
        const py = lo[1] + y * CELL;
        let i = nx * (y + ny * z) + x0;
        for (let x = x0; x <= x1; x++, i++) {
          const d2 = toFace2(lo[0] + x * CELL, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz);
          if (d2 < near2[i] && d2 <= reach2) near2[i] = d2;
        }
      }
    }
  }
  for (let i = 0; i < near2.length; i++) near2[i] = Math.sqrt(near2[i]);
  return near2;
}

/** How far (squared) a point is from a face (a, b, c): from the nearest point of it (inside it, on an edge, or a corner). */
function toFace2(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const acx = cx - ax;
  const acy = cy - ay;
  const acz = cz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
  const bpx = px - bx;
  const bpy = py - by;
  const bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const ex = apx - v * abx;
    const ey = apy - v * aby;
    const ez = apz - v * abz;
    return ex * ex + ey * ey + ez * ez;
  }
  const cpx = px - cx;
  const cpy = py - cy;
  const cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const ex = apx - w * acx;
    const ey = apy - w * acy;
    const ez = apz - w * acz;
    return ex * ex + ey * ey + ez * ez;
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    const ex = bpx - w * (cx - bx);
    const ey = bpy - w * (cy - by);
    const ez = bpz - w * (cz - bz);
    return ex * ex + ey * ey + ez * ez;
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  const ex = apx - abx * v - acx * w;
  const ey = apy - aby * v - acy * w;
  const ez = apz - abz * v - acz * w;
  return ex * ex + ey * ey + ez * ez;
}

/** The ways to a point's neighbours in a grid, and how far each is (in cells), those before it as the grid is passed
 * through (z, then y, then x, each rising); the rest are these turned round. */
const BEFORE: [number, number, number, number][] = [];
for (let dz = -1; dz <= 1; dz++) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dz < 0 || (dz === 0 && dy < 0) || (dz === 0 && dy === 0 && dx < 0)) BEFORE.push([dx, dy, dz, Math.hypot(dx, dy, dz)]);
    }
  }
}

/** `dist` (a grid's, `nx` by `ny` by `nz`) filled in where it is Infinity, as far as its nearest known point and the way
 * there through its neighbours: one pass through the grid and one back (a little further than it is, never nearer). */
function spread(dist: Float32Array, nx: number, ny: number, nz: number): void {
  const sy = nx;
  const sz = nx * ny;
  // Each neighbour before a point: how far on through the grid it is, and how far off (metres).
  const on = BEFORE.map(([dx, dy, dz]) => dx + sy * dy + sz * dz);
  const off = BEFORE.map(([, , , len]) => len * CELL);
  const count = on.length;
  for (const back of [false, true]) {
    const s = back ? -1 : 1;
    for (let zz = 0; zz < nz; zz++) {
      const z = back ? nz - 1 - zz : zz;
      for (let yy = 0; yy < ny; yy++) {
        const y = back ? ny - 1 - yy : yy;
        const inner = z > 0 && z < nz - 1 && y > 0 && y < ny - 1;
        for (let xx = 0; xx < nx; xx++) {
          const x = back ? nx - 1 - xx : xx;
          const i = x + sy * y + sz * z;
          let d = dist[i];
          if (inner && x > 0 && x < nx - 1) {
            // (Inside the grid's edge, every neighbour is there.)
            for (let k = 0; k < count; k++) {
              const e = dist[i + s * on[k]] + off[k];
              if (e < d) d = e;
            }
          } else {
            for (let k = 0; k < count; k++) {
              const X = x + s * BEFORE[k][0];
              const Y = y + s * BEFORE[k][1];
              const Z = z + s * BEFORE[k][2];
              if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz) continue;
              const e = dist[X + sy * Y + sz * Z] + off[k];
              if (e < d) d = e;
            }
          }
          dist[i] = d;
        }
      }
    }
  }
}

/**
 * Which points of a grid (from `lo`, `n` points each way) are inside `faces` (whole: see capped): by how many times a
 * line from each crosses into the faces less out of them (each face's turn says which), along each of the three ways,
 * two of the three agreeing. (Counted so, a part of a piece inside another part of it, as an ear's root in its head,
 * is inside once, not out again; and faces turned inside out, the piece's own volume below 0, are taken the other way.)
 */
function insideOf(faces: number[], lo: number[], n: number[]): Uint8Array {
  const total = n[0] * n[1] * n[2];
  const votes = new Uint8Array(total);
  // Which way the faces turn: out (the volume they close above 0), or in.
  let volume = 0;
  for (let f = 0; f < faces.length; f += 9) {
    const ax = faces[f];
    const ay = faces[f + 1];
    const az = faces[f + 2];
    const bx = faces[f + 3];
    const by = faces[f + 4];
    const bz = faces[f + 5];
    const cx = faces[f + 6];
    const cy = faces[f + 7];
    const cz = faces[f + 8];
    volume += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  const turn = volume >= 0 ? 1 : -1;
  for (let a = 0; a < 3; a++) {
    const u = (a + 1) % 3;
    const v = (a + 2) % 3;
    const nu = n[u];
    const nv = n[v];
    const crossings: number[][] = Array.from({ length: nu * nv }, () => []);
    for (let f = 0; f < faces.length; f += 9) {
      // The face's corners along the line's way (a) and across it (u, v), read where they lie.
      const au = faces[f + u];
      const av = faces[f + v];
      const aa = faces[f + a];
      const bu = faces[f + 3 + u];
      const bv = faces[f + 3 + v];
      const ba = faces[f + 3 + a];
      const cu = faces[f + 6 + u];
      const cv = faces[f + 6 + v];
      const ca = faces[f + 6 + a];
      // The face's turn along this way: in (below 0) as a line goes along it, or out.
      const na = (bu - au) * (cv - av) - (bv - av) * (cu - au);
      if (na === 0) continue;
      const det = na;
      const u0 = Math.max(0, Math.ceil((Math.min(au, bu, cu) - lo[u] - JITTER_U) / CELL));
      const u1 = Math.min(nu - 1, Math.floor((Math.max(au, bu, cu) - lo[u] - JITTER_U) / CELL));
      const v0 = Math.max(0, Math.ceil((Math.min(av, bv, cv) - lo[v] - JITTER_V) / CELL));
      const v1 = Math.min(nv - 1, Math.floor((Math.max(av, bv, cv) - lo[v] - JITTER_V) / CELL));
      for (let iu = u0; iu <= u1; iu++) {
        const qu = lo[u] + iu * CELL + JITTER_U;
        for (let iv = v0; iv <= v1; iv++) {
          const qv = lo[v] + iv * CELL + JITTER_V;
          // Where the line (qu, qv) meets the face, as much of each corner as it is (all of them at least 0: it does).
          const wa = ((bu - qu) * (cv - qv) - (bv - qv) * (cu - qu)) / det;
          const wb = ((cu - qu) * (av - qv) - (cv - qv) * (au - qu)) / det;
          const wc = 1 - wa - wb;
          if (wa < 0 || wb < 0 || wc < 0) continue;
          crossings[iu + nu * iv].push(wa * aa + wb * ba + wc * ca, na > 0 ? -1 : 1);
        }
      }
    }
    const step = [1, n[0], n[0] * n[1]];
    for (let iu = 0; iu < nu; iu++) {
      for (let iv = 0; iv < nv; iv++) {
        const list = crossings[iu + nu * iv];
        if (!list.length) continue;
        const order = Array.from({ length: list.length / 2 }, (_, k) => k).sort((p, q) => list[2 * p] - list[2 * q]);
        let k = 0;
        let winding = 0;
        for (let ia = 0; ia < n[a]; ia++) {
          const at = lo[a] + ia * CELL;
          while (k < order.length && list[2 * order[k]] < at) winding += list[2 * order[k++] + 1];
          if (winding * turn > 0) votes[ia * step[a] + iu * step[u] + iv * step[v]]++;
        }
      }
    }
  }
  const inside = new Uint8Array(total);
  for (let i = 0; i < total; i++) inside[i] = votes[i] >= 2 ? 1 : 0;
  return inside;
}

const _m = new THREE.Matrix4();
