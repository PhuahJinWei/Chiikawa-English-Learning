import type { Act } from '../content/types.ts';
import type { FriendId } from '../stage/types.ts';
import { stage } from './stage.ts';

/** Friends act out a moment. Gestures are not awaited (some loop). Mouths stay still: see the voice rule. */
export function act(acts: Act[] | undefined): void {
  for (const a of acts ?? []) {
    if (a.face) stage.setFace(a.who, a.face);
    if (a.mark) stage.mark(a.who, a.mark);
    if (a.gesture) void stage.play(a.who, a.gesture);
    stage.lookAt(a.who, 'learner');
  }
}

/** Back to standing calmly: no gesture, own face. */
export function calm(ids: readonly FriendId[]): void {
  for (const id of ids) {
    stage.stop(id);
    stage.setFace(id, null);
    stage.setTalking(id, false);
  }
}

export const shuffle = <T>(xs: readonly T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
