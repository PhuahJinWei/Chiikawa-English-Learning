/**
 * The 3D stage: the friends from the Chiikawa RPG (copied into ./rpg, see the "eigo-friends" notes there), on a soft
 * meadow, behind the StageApi contract (./types.ts).
 *
 * Using it:
 *   const stage = createStage();
 *   await stage.mount(containerEl);          // the canvas fills the container; resizes with it
 *   await stage.setCast(['hachiware', 'chiikawa']);
 *   await stage.play('hachiware', 'nod');    // one-shots resolve when done; loops when stopped or replaced
 *
 * - setCast may come before or after mount. Friends stand left to right in the order given; with three, the middle
 *   one stands a little further back. Up to three; extras are ignored. Friends already on stage walk to new places.
 * - Assets load relative to the page (models/…, models/faces/…, draco/…), so the page must be the app's root
 *   document (hash or in-memory routing; no history-API sub-paths).
 * - Friends look at the learner by default. lookAt(friend) turns them partly toward the other friend.
 * - The RPG's own speech bubbles are hushed; the app draws its own above headAnchor().
 * - Development only: `stage.__advance(seconds)` steps and draws by fixed time (see the end of createStage).
 */
import * as THREE from 'three';
import type { Face, FriendId, Gesture, Mark, ScreenPoint, StageApi } from './types';
import type { ActionId } from './rpg/characters/Actions';
import { Character, HEAD_LOOK, type FrameContext, type HeadLook } from './rpg/characters/Character';
import { sharedUniforms } from './rpg/characters/CharacterMaterial';
import { DEFINITIONS } from './rpg/characters/definitions';
import { EmoteSystem } from './rpg/characters/Emotes';
import { groundShadows } from './rpg/characters/GroundShadows';
import { loadCharacterModel } from './rpg/characters/Model';
import { updatePen } from './rpg/world/Ink';
import { buildBackdrop } from './Backdrop';

export type { StageApi } from './types';

/** Each gesture is the RPG action of the same name (nod, shake and listen are this app's own: Actions.ts). */
const GESTURE_ACTION: Record<Gesture, ActionId> = {
  wave: 'wave',
  hop: 'hop',
  cheer: 'cheer',
  bow: 'bow',
  startled: 'startled',
  nod: 'nod',
  shake: 'shake',
  listen: 'listen',
  look: 'look',
  sit: 'sit',
  doze: 'doze',
  eat: 'eat',
  drink: 'drink',
  read: 'read',
  cry: 'cry',
  hula: 'hula',
};

/** Gestures that end by themselves (types.ts); all others loop until stopped or replaced. The RPG's own `look` and
 * `drink` end by themselves, so the stage starts them again until stopped. */
const ONE_SHOT: ReadonlySet<Gesture> = new Set(['wave', 'hop', 'cheer', 'bow', 'startled', 'nod', 'shake']);

/** Lens (degrees, top to bottom): long enough that the friends look drawn rather than photographed. */
const LENS = 26;
/** How far the camera looks down on them (radians): enough to see the ground they stand on. */
const PITCH = THREE.MathUtils.degToRad(4);
/** Room above the tallest friend's head for the app's speech bubbles, as a share of that friend's height. */
const HEADROOM = 0.62;
/** Ground showing under their feet, as a share of the tallest friend's height. */
const FLOOR = 0.12;
/** Space at each side of the friends, and between them (metres). */
const SIDE_MARGIN = 0.3;
const GAP = 0.1;
/** Three friends stand in a slight arc: the middle one this much further back, the sides this much forward. */
const ARC = 0.13;
/** Friends turn toward a point this share of the way from them to the camera, so two or three face a little
 * toward each other. */
const TOWARD = 0.42;
/** Never draws faster than this (milliseconds between frames): 60 frames a second on a 120 Hz screen. */
const MIN_FRAME_MS = 12;
/** After this long with nothing happening (no gesture, talking, walking or touch), the stage draws 20 frames a second
 * instead of 60: friends only breathe and blink then, and the phone stays cooler (PLAN.md risks, REVIEW 4.12). */
const IDLE_AFTER_MS = 6000;
const IDLE_FRAME_MS = 50;
/** A lost GPU that has not come back after this long on screen means the flat stage takes over (REVIEW 4.8). */
const LOST_MS = 3000;
/** A friend further than this from their new place is put there, not walked there (metres). */
const WALK_MOST = 1.6;
/** A glance toward the learner's finger lasts this long (seconds). */
const GLANCE_FOR = 1.5;
/** Where glances and screen points are looked at: on an upright plane this far in front of the friends (metres). */
const LOOK_PLANE_Z = 1.1;
const POP_TIME = 0.32;

/** Looking at the learner or at a point on screen: the head only, the body keeps facing its way. */
const HEAD_ONLY: HeadLook = { ...HEAD_LOOK, turn: null };
const GLANCE: HeadLook = { ...HEAD_LOOK, turn: null, rate: 8 };
/** Looking at another friend, the body turns toward them by at most this much from its own way (radians), and the
 * head the rest: never so far round that the learner sees their back (in the arc of three, the middle one stands a
 * little behind the others). */
const BODY_TOWARD_FRIEND = 0.6;

type LookTarget = 'learner' | FriendId | THREE.Vector3 | null;

interface Playing {
  gesture: Gesture;
  action: ActionId;
  resolve: () => void;
}

interface Friend {
  readonly id: FriendId;
  readonly ch: Character;
  onStage: boolean;
  /** Where they stand and which way they face there. */
  readonly slot: { x: number; z: number; yaw: number };
  walking: boolean;
  look: LookTarget;
  glanceUntil: number;
  readonly glanceAt: THREE.Vector3;
  playing: Playing | null;
  talking: boolean;
  /** Seconds into their pop onto the stage; POP_TIME or more once in. */
  pop: number;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _ndc = new THREE.Vector3();

function isFriendLook(look: LookTarget): look is FriendId {
  return typeof look === 'string' && look !== 'learner';
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t)) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

export function createStage(): StageApi {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(LENS, 1, 0.1, 200);
  camera.position.set(0, 1.2, 6);
  const backdrop = buildBackdrop();
  scene.background = backdrop.background;
  scene.fog = backdrop.fog;
  scene.add(backdrop.group);
  const shadows = groundShadows();
  scene.add(shadows.group);

  const emotes = new EmoteSystem();
  emotes.camera = camera;
  // The RPG's characters say their lines in bubbles over their heads (cheering, crying, talking): never here. The
  // app shows its own bubbles.
  emotes.hush = () => true;

  const ctx: FrameContext = {
    camera,
    viewHeight: 1,
    pixelRatio: 1,
    // A flat meadow: everyone stands on level ground and may stand anywhere.
    groundHeight: () => 0,
    clamp: () => {},
    // No trees' shade and no fire. Both must still be answered: a character's firelight starts at full strength
    // (and casts a long shadow from their feet) until it is told there is none, as the RPG's main.ts does.
    shade: () => 0,
    firelight: (_x, _y, _z, _seen, _dt, out) => {
      for (const light of out) light.set(0, 0, 0, 0);
      return 0;
    },
  };

  const friends = new Map<FriendId, Friend>();
  let cast: FriendId[] = [];
  /** Bumped on every setCast, so an older call whose models load late does not undo a newer one. */
  let castVersion = 0;
  const frameCallbacks = new Set<() => void>();

  // Where the camera is going, and where it is (eased there).
  const camTo = new THREE.Vector3(0, 1.2, 6);
  const lookTo = new THREE.Vector3(0, 0.6, 0);
  const lookNow = new THREE.Vector3(0, 0.6, 0);
  let cameraPlaced = false;

  let renderer: THREE.WebGLRenderer | null = null;
  let container: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let width = 0;
  let height = 0;
  let paused = false;
  let running = false;
  let lastDraw = -Infinity;
  let pointerOn = false;
  let disposed = false;
  const timer = new THREE.Timer();
  /** When something last happened on stage (performance.now()). */
  let lastActive = 0;
  /** Frames in a row that threw. */
  let badFrames = 0;
  let lost = false;
  let lostTimer = 0;
  const fatalCallbacks = new Set<(e: unknown) => void>();

  // ----- layout -----

  /** Where each friend of `ids` stands: left to right as listed; three in a slight arc, the middle one further back. */
  function layout(ids: readonly FriendId[]): { x: number; z: number }[] {
    const widths = ids.map((id) => friends.get(id)!.ch.width);
    const total = widths.reduce((a, b) => a + b, 0) + GAP * Math.max(0, ids.length - 1);
    let x = -total / 2;
    return ids.map((_, i) => {
      const w = widths[i];
      const at = { x: x + w / 2, z: ids.length === 3 ? (i === 1 ? -ARC : ARC) : 0 };
      x += w + GAP;
      return at;
    });
  }

  /** Where the camera stands to frame `ids` with room for bubbles above, at the container's aspect. */
  function frameCast(): void {
    const shown = cast.map((id) => friends.get(id)!).filter(Boolean);
    if (!shown.length) return;
    const tallest = Math.max(...shown.map((f) => f.ch.height));
    let minX = Infinity;
    let maxX = -Infinity;
    for (const f of shown) {
      minX = Math.min(minX, f.slot.x - f.ch.width / 2);
      maxX = Math.max(maxX, f.slot.x + f.ch.width / 2);
    }
    const spanX = maxX - minX + 2 * SIDE_MARGIN;
    const bottom = -FLOOR * tallest;
    const top = tallest * (1 + HEADROOM);
    const spanY = top - bottom;
    const aspect = width > 0 && height > 0 ? width / height : 1;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(LENS) / 2);
    const distance = Math.max(spanY / (2 * tanHalf), spanX / (2 * tanHalf * aspect));
    const centreX = (minX + maxX) / 2;
    // Their feet stay near the bottom: height to spare (a wide group on a squarish stage) goes to the bubbles' room.
    const seen = 2 * distance * tanHalf;
    const centreY = bottom + seen / 2;
    lookTo.set(centreX, centreY, 0);
    camTo.set(centreX, centreY + distance * Math.sin(PITCH), distance * Math.cos(PITCH));
    if (!cameraPlaced) {
      camera.position.copy(camTo);
      lookNow.copy(lookTo);
      cameraPlaced = true;
    }
    // Each faces a point between the group and the camera, so they turn a little toward each other.
    for (const f of shown) {
      const towardZ = camTo.z * TOWARD;
      f.slot.yaw = Math.atan2(centreX - f.slot.x, towardZ - f.slot.z);
    }
  }

  // ----- looking -----

  /** The point on the look plane under a point on screen (CSS pixels from the canvas's top-left corner). */
  function screenToWorld(x: number, y: number, out: THREE.Vector3): THREE.Vector3 {
    const w = width || 1;
    const h = height || 1;
    _ndc.set((x / w) * 2 - 1, -((y / h) * 2 - 1), 0.5).unproject(camera);
    const dir = _ndc.sub(camera.position).normalize();
    const t = Math.abs(dir.z) > 1e-4 ? (LOOK_PLANE_Z - camera.position.z) / dir.z : 5;
    return out.copy(camera.position).addScaledVector(dir, Math.max(0.5, t));
  }

  function applyLook(f: Friend, now: number): void {
    if (f.glanceUntil > now) {
      f.ch.watch(f.glanceAt, GLANCE);
      return;
    }
    const look = f.look;
    if (look === null) f.ch.watch(null);
    else if (look === 'learner') f.ch.watch(camera.position, HEAD_ONLY);
    else if (look instanceof THREE.Vector3) f.ch.watch(look, HEAD_ONLY);
    else {
      const other = friends.get(look);
      if (other && other.onStage && other !== f) {
        const at = other.ch.getAnchor('head', _w);
        // Their body turns part of the way (see BODY_TOWARD_FRIEND), their head the rest.
        const way = Math.atan2(at.x - f.ch.position.x, at.z - f.ch.position.z);
        const off = Math.atan2(Math.sin(way - f.slot.yaw), Math.cos(way - f.slot.yaw));
        f.ch.setFacing(f.slot.yaw + THREE.MathUtils.clamp(off, -BODY_TOWARD_FRIEND, BODY_TOWARD_FRIEND));
        f.ch.watch(at, HEAD_ONLY);
      } else {
        f.ch.watch(camera.position, HEAD_ONLY);
      }
    }
  }

  function onPointer(e: PointerEvent): void {
    lastActive = performance.now();
    if (!pointerOn || !renderer) return;
    if (e.type === 'pointermove' && e.buttons === 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    screenToWorld(e.clientX - rect.left, e.clientY - rect.top, _v);
    const until = performance.now() / 1000 + GLANCE_FOR;
    for (const f of friends.values()) {
      if (!f.onStage) continue;
      f.glanceAt.copy(_v);
      f.glanceUntil = until;
    }
  }

  // ----- gestures -----

  function settle(f: Friend): void {
    const p = f.playing;
    f.playing = null;
    p?.resolve();
  }

  function startTalkIfIdle(f: Friend): void {
    if (f.talking && !f.walking && f.ch.actionId === null) f.ch.play('talk');
  }

  // ----- the frame -----

  function step(dt: number): void {
    const now = performance.now() / 1000;
    for (const f of friends.values()) {
      if (!f.onStage) continue;
      const ch = f.ch;
      // Walking to a new place in the line-up, then turning back to face their way.
      if (f.walking) {
        const dx = f.slot.x - ch.position.x;
        const dz = f.slot.z - ch.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.03) {
          f.walking = false;
          ch.setDesiredVelocity(_v.set(0, 0, 0));
        } else {
          const speed = Math.min(ch.walkSpeed, d * 3.2 + 0.15);
          ch.setDesiredVelocity(_v.set((dx / d) * speed, 0, (dz / d) * speed));
        }
      }
      // Standing, they face their own way: told every frame, as a walker still slowing down faces the way they go.
      // (Looking at another friend, applyLook turns them part of the way toward them instead.)
      if (!f.walking && !isFriendLook(f.look)) ch.setFacing(f.slot.yaw);
      applyLook(f, now);
      ch.talkingOverride = f.talking;
      startTalkIfIdle(f);
      ch.update(dt, ctx);
      // A looping gesture the RPG ends by itself (look, drink) starts again; a one-shot that has ended is done.
      const p = f.playing;
      if (p && ch.actionId !== p.action && !f.walking) {
        if (ONE_SHOT.has(p.gesture)) settle(f);
        else ch.play(p.action);
      }
      if (f.pop < POP_TIME) {
        f.pop += dt;
        const s = Math.max(0.01, easeOutBack(f.pop / POP_TIME));
        ch.root.scale.setScalar(s);
      }
    }
    // The camera eases to where it frames them.
    const k = 1 - Math.exp(-dt * 5);
    camera.position.lerp(camTo, k);
    lookNow.lerp(lookTo, k);
    camera.lookAt(lookNow);
    camera.updateMatrixWorld();
    updatePen(camera, camera.position.distanceTo(lookNow), ctx.viewHeight, ctx.pixelRatio);
    for (const f of friends.values()) {
      if (!f.onStage) continue;
      f.ch.updateOutline(ctx);
      f.ch.updateFade(ctx, dt, 0);
    }
    emotes.update(dt);
    shadows.gather();
  }

  function draw(): void {
    if (!renderer) return;
    renderer.render(scene, camera);
    // The marks over heads (!, ?, ♪, ♥, zzz), over the finished picture.
    emotes.beforeOverlay(null);
    const clear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(emotes.overlay, camera);
    renderer.autoClear = clear;
  }

  function busy(now: number): boolean {
    if (now - lastActive < IDLE_AFTER_MS) return true;
    for (const f of friends.values()) if (f.onStage && (f.talking || f.walking)) return true;
    return false;
  }

  function frame(now: number): void {
    if (now - lastDraw < (busy(now) ? MIN_FRAME_MS : IDLE_FRAME_MS)) return;
    lastDraw = now;
    timer.update(now);
    // A long gap (the app was away) is not one long step.
    const dt = Math.min(timer.getDelta(), 0.05);
    try {
      step(dt);
      draw();
      badFrames = 0;
    } catch (e) {
      // One bad frame can be a hiccup; three in a row means 3D is broken on this phone.
      if (++badFrames >= 3) fatal(e);
      return;
    }
    for (const cb of frameCallbacks) {
      try {
        cb();
      } catch (e) {
        console.warn('A stage frame callback failed', e);
      }
    }
  }

  /** 3D cannot go on: stop drawing and tell the app, which switches to the flat stage (src/app/stage.ts). */
  function fatal(e: unknown): void {
    if (disposed || paused) return;
    paused = true;
    updateRunning();
    for (const cb of fatalCallbacks) cb(e);
  }

  function watchLost(): void {
    if (!lost || lostTimer || document.hidden) return;
    lostTimer = window.setTimeout(() => {
      lostTimer = 0;
      if (lost && !document.hidden) fatal(new Error('The 3D graphics were lost and did not come back'));
      else watchLost();
    }, LOST_MS);
  }

  function updateRunning(): void {
    if (!renderer) return;
    const shouldRun = !paused && !document.hidden && !disposed;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) {
      timer.reset();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
    }
  }

  function onVisibility(): void {
    updateRunning();
    watchLost();
  }

  function resize(): void {
    if (!renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!(w > 0 && h > 0)) return;
    width = w;
    height = h;
    // No more than twice the screen's own pixels: sharp enough, and kinder to a phone's battery.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(sharedUniforms.uResolution.value);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    ctx.viewHeight = h;
    ctx.pixelRatio = ratio;
    frameCast();
  }

  function need(id: FriendId): Friend {
    const f = friends.get(id);
    if (!f) throw new Error(`${id} is not on the stage yet (call setCast first)`);
    return f;
  }

  async function friendFor(id: FriendId): Promise<Friend> {
    const had = friends.get(id);
    if (had) return had;
    const def = DEFINITIONS[id];
    const model = await loadCharacterModel(def.model);
    const again = friends.get(id);
    if (again) return again;
    const ch = new Character(def, model);
    ch.attach(scene, emotes);
    ch.setShown(false);
    const f: Friend = {
      id,
      ch,
      onStage: false,
      slot: { x: 0, z: 0, yaw: 0 },
      walking: false,
      look: 'learner',
      glanceUntil: 0,
      glanceAt: new THREE.Vector3(),
      playing: null,
      talking: false,
      pop: POP_TIME,
    };
    friends.set(id, f);
    return f;
  }

  /** Resolves after the next drawn frame: at once if nothing is being drawn, and after a moment at most (a page in
   * the background draws nothing until it comes back). */
  function nextFrame(): Promise<void> {
    if (!running) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        off();
        clearTimeout(fallback);
        resolve();
      };
      const off = api.onFrame(done);
      const fallback = window.setTimeout(done, 250);
    });
  }

  const api: StageApi = {
    async mount(el: HTMLElement): Promise<void> {
      if (disposed) throw new Error('This stage was disposed');
      if (renderer) return;
      container = el;
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.touchAction = 'manipulation';
      canvas.setAttribute('aria-hidden', 'true');
      el.appendChild(canvas);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
      renderer.setClearColor(backdrop.background);
      // iOS can take the GPU away, often while the app is in the background. three.js rebuilds when it is given back.
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        lost = true;
        watchLost();
      });
      canvas.addEventListener('webglcontextrestored', () => {
        lost = false;
        clearTimeout(lostTimer);
        lostTimer = 0;
      });
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(el);
      resize();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pointerdown', onPointer, { passive: true, capture: true });
      window.addEventListener('pointermove', onPointer, { passive: true, capture: true });
      timer.connect(document);
      updateRunning();
    },

    async setCast(ids: readonly FriendId[]): Promise<void> {
      const version = ++castVersion;
      const wanted = [...new Set(ids)].slice(0, 3);
      const loaded = await Promise.all(wanted.map(friendFor));
      if (version !== castVersion || disposed) return;
      const leaving = cast.filter((id) => !wanted.includes(id));
      for (const id of leaving) {
        const f = friends.get(id)!;
        f.onStage = false;
        f.walking = false;
        f.talking = false;
        f.ch.talkingOverride = false;
        f.ch.stopAction();
        settle(f);
        f.ch.setShown(false);
      }
      cast = wanted;
      const places = layout(wanted);
      loaded.forEach((f, i) => {
        f.slot.x = places[i].x;
        f.slot.z = places[i].z;
      });
      frameCast();
      for (const f of loaded) {
        const ch = f.ch;
        if (f.onStage) {
          // Already here: walk over to the new place (or, far off, be put there).
          const d = Math.hypot(f.slot.x - ch.position.x, f.slot.z - ch.position.z);
          if (d > WALK_MOST) ch.teleport(f.slot.x, f.slot.z, f.slot.yaw);
          else if (d > 0.03) f.walking = true;
          else ch.setFacing(f.slot.yaw);
        } else {
          // Arriving: popped in where they stand.
          ch.teleport(f.slot.x, f.slot.z, f.slot.yaw);
          ch.setShown(true);
          ch.root.scale.setScalar(0.01);
          f.pop = 0;
          f.onStage = true;
          f.look = 'learner';
          f.glanceUntil = 0;
        }
      }
      await nextFrame();
    },

    play(id: FriendId, gesture: Gesture): Promise<void> {
      const f = need(id);
      settle(f);
      if (!f.onStage) return Promise.resolve();
      const action = GESTURE_ACTION[gesture];
      return new Promise<void>((resolve) => {
        f.playing = { gesture, action, resolve };
        f.ch.play(action);
      });
    },

    stop(id: FriendId): void {
      const f = friends.get(id);
      if (!f) return;
      settle(f);
      f.ch.stopAction();
    },

    setFace(id: FriendId, face: Face | null): void {
      need(id).ch.lineFace = face;
    },

    mark(id: FriendId, mark: Mark): void {
      const f = need(id);
      if (!f.onStage) return;
      // Drifting marks (♪, ♥, zzz) go toward the middle of the stage, not off its edge.
      emotes.spawn(mark, f.ch, f.slot.x > 0.05 ? -1 : 1);
    },

    setTalking(id: FriendId, on: boolean): void {
      const f = need(id);
      f.talking = on;
      f.ch.talkingOverride = on;
      if (on) startTalkIfIdle(f);
      else if (f.ch.actionId === 'talk') f.ch.stopAction();
    },

    lookAt(id: FriendId, target: 'learner' | FriendId | ScreenPoint | null): void {
      const f = need(id);
      f.glanceUntil = 0;
      if (target !== null && typeof target === 'object') {
        f.look = screenToWorld(target.x, target.y, new THREE.Vector3());
      } else {
        f.look = target === id ? 'learner' : target;
      }
      // (Looking at the learner, at the screen or ahead, their body turns back to face its own way: see step.)
    },

    followPointer(on: boolean): void {
      pointerOn = on;
      if (!on) for (const f of friends.values()) f.glanceUntil = 0;
    },

    headAnchor(id: FriendId): ScreenPoint | null {
      const f = friends.get(id);
      if (!f || !f.onStage || !width || !height) return null;
      f.ch.getAnchor('top', _v);
      _v.y += 0.03;
      _v.project(camera);
      return { x: ((_v.x + 1) / 2) * width, y: ((1 - _v.y) / 2) * height };
    },

    onFrame(cb: () => void): () => void {
      frameCallbacks.add(cb);
      return () => frameCallbacks.delete(cb);
    },

    setPaused(on: boolean): void {
      paused = on;
      updateRunning();
    },

    measureFps(seconds: number): Promise<number> {
      return new Promise((resolve) => {
        const start = performance.now();
        let frames = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          off();
          clearTimeout(fallback);
          const elapsed = (performance.now() - start) / 1000;
          resolve(elapsed > 0 ? frames / elapsed : 0);
        };
        const off = api.onFrame(() => {
          frames++;
          lastActive = performance.now(); // measure the full rate, not the idle one
          if (performance.now() - start >= seconds * 1000) finish();
        });
        // Paused or in the background, nothing is drawn: answer anyway.
        const fallback = window.setTimeout(finish, seconds * 1000 + 600);
      });
    },

    onFatal(cb: (e: unknown) => void): () => void {
      fatalCallbacks.add(cb);
      return () => fatalCallbacks.delete(cb);
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      clearTimeout(lostTimer);
      fatalCallbacks.clear();
      castVersion++;
      updateRunning();
      renderer?.setAnimationLoop(null);
      running = false;
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onPointer, { capture: true });
      window.removeEventListener('pointermove', onPointer, { capture: true });
      timer.disconnect();
      for (const f of friends.values()) {
        settle(f);
        f.ch.detach();
        f.ch.face.texture.dispose();
      }
      friends.clear();
      frameCallbacks.clear();
      shadows.group.removeFromParent();
      backdrop.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        renderer = null;
      }
    },
  };

  // Anything the app asks the friends to do wakes the stage up to its full frame rate.
  for (const key of ['setCast', 'play', 'stop', 'setFace', 'mark', 'setTalking', 'lookAt'] as const) {
    const call = api[key] as (...args: unknown[]) => unknown;
    (api as unknown as Record<string, (...args: unknown[]) => unknown>)[key] = (...args) => {
      lastActive = performance.now();
      return call(...args);
    };
  }

  // Development only (the stage test page): moves the stage on by `seconds` in steps of a 60th, and draws, whatever
  // the browser's frames are doing (a hidden or background page draws few or none), to check poses by eye.
  if (import.meta.env.DEV) {
    Object.defineProperty(api, '__advance', {
      value(seconds: number): void {
        const steps = Math.max(1, Math.round(seconds * 60));
        for (let i = 0; i < steps; i++) step(1 / 60);
        draw();
        for (const cb of frameCallbacks) cb();
      },
    });
  }

  return api;
}
