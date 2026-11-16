import type { FriendId, StageApi } from '../stage/types.ts';
import { createStage } from '../stage/index.ts';
import { createFlatStage } from './stage-flat.ts';

/**
 * The one stage the whole app shares: the 3D friends from the RPG. If 3D cannot start on the phone (no WebGL, or the
 * models fail to load), the flat 2D stage takes over, so lessons always work.
 *
 * Stage trouble must never break a lesson: a call for a friend who is still loading waits until the cast is ready,
 * and a call for a friend who is not on stage at all is ignored.
 */
let impl: StageApi;
let lastCast: readonly FriendId[] = [];
let castReady: Promise<void> = Promise.resolve();
export const stageInfo = { kind: '3d' as '3d' | 'flat', problem: '' };

let host: HTMLElement | null = null;

try {
  impl = createStage();
  // 3D that breaks later (drawing keeps failing, the GPU is lost for good) also hands over (REVIEW 4.8).
  const first = impl;
  impl.onFatal?.((e) => {
    if (impl === first) void fallBack(e);
  });
} catch (e) {
  impl = createFlatStage();
  stageInfo.kind = 'flat';
  stageInfo.problem = String(e);
}

async function fallBack(e: unknown) {
  console.warn('3D stage failed, using the flat stage', e);
  try {
    impl.dispose();
  } catch {
    // already gone
  }
  impl = createFlatStage();
  stageInfo.kind = 'flat';
  stageInfo.problem = String(e);
  if (host) await impl.mount(host);
  await impl.setCast(lastCast);
}

/** Runs a call on a friend now, or once the cast they belong to has loaded; ignores friends not on stage. */
function onFriend(id: FriendId, call: () => void): void {
  try {
    call();
  } catch {
    if (lastCast.includes(id)) {
      void castReady.then(() => {
        try {
          call();
        } catch {
          // left the stage meanwhile
        }
      });
    }
  }
}

export const stage: StageApi = {
  async mount(container) {
    host = container;
    try {
      await impl.mount(container);
    } catch (e) {
      await fallBack(e);
    }
  },
  setCast(ids) {
    lastCast = ids;
    castReady = (async () => {
      try {
        await impl.setCast(ids);
      } catch (e) {
        if (stageInfo.kind === '3d') await fallBack(e);
      }
    })();
    return castReady;
  },
  play(id, g) {
    try {
      return impl.play(id, g);
    } catch {
      if (!lastCast.includes(id)) return Promise.resolve();
      return castReady.then(() => impl.play(id, g)).catch(() => {});
    }
  },
  stop: (id) => onFriend(id, () => impl.stop(id)),
  setFace: (id, f) => onFriend(id, () => impl.setFace(id, f)),
  mark: (id, m) => onFriend(id, () => impl.mark(id, m)),
  setTalking: (id, on) => onFriend(id, () => impl.setTalking(id, on)),
  lookAt: (id, t) => onFriend(id, () => impl.lookAt(id, t)),
  followPointer: (on) => impl.followPointer(on),
  headAnchor(id) {
    try {
      return impl.headAnchor(id);
    } catch {
      return null;
    }
  },
  onFrame(cb) {
    // Survives a switch to the flat stage.
    let off = impl.onFrame(cb);
    const was = impl;
    const check = setInterval(() => {
      if (impl !== was) {
        off();
        off = impl.onFrame(cb);
        clearInterval(check);
      }
    }, 1000);
    return () => {
      clearInterval(check);
      off();
    };
  },
  setPaused: (p) => impl.setPaused(p),
  measureFps: (s) => impl.measureFps(s),
  dispose: () => impl.dispose(),
};
