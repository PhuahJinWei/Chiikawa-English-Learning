import type { Act } from '../content/types.ts';
import { castWith, partnerOfDay, type PartnerId } from '../learn/partners.ts';
import type { Face, FriendId, Gesture } from '../stage/types.ts';
import { stage } from './stage.ts';
import { app, save } from './state.svelte.ts';

/**
 * How each partner shows the same moments, in character (none of them talks; src/learn/partners.ts). ちいかわ as
 * written; うさぎ is never down for long, so worry comes out as a start of surprise and a nod as a hop; モモンガ makes
 * the most of every feeling, so worry comes out as tears and a hop as a cheer.
 */
const STYLE: Record<PartnerId, { faces?: Partial<Record<Face, Face>>; gestures?: Partial<Record<Gesture, Gesture>> }> = {
  chiikawa: {},
  usagi: { faces: { worried: 'shocked', teary: 'shocked' }, gestures: { nod: 'hop' } },
  momonga: { faces: { worried: 'teary' }, gestures: { hop: 'cheer' } },
};

/** Who plays ちいかわ's part on stage now: today's partner, or Chiikawa where the partner has a part of their own. */
let buddy: FriendId = 'chiikawa';

/**
 * Chooses today's partner if it has not been chosen yet today, and saves it. Call it where the day starts (the Today
 * screen, the app's start), never inside reactive code: it writes to her progress.
 */
export function choosePartner(): { id: PartnerId; first: boolean } {
  const before = app.progress.partner;
  const r = partnerOfDay(app.progress, app.today);
  if (app.progress.partner !== before) save();
  return r;
}

/** Today's partner as chosen, without choosing (safe anywhere): Chiikawa until one has been chosen today. */
export function todaysPartner(): { id: PartnerId; first: boolean } {
  const p = app.progress.partner;
  return p && p.day === app.today ? { id: p.id, first: p.first } : { id: 'chiikawa', first: false };
}

/** A scene's cast with ちいかわ's part played by today's partner (src/learn/partners.ts, `castWith`). */
export function withPartner(cast: readonly FriendId[]): FriendId[] {
  const r = castWith(cast, todaysPartner().id);
  buddy = r.buddy;
  return r.cast;
}

/** Who plays ちいかわ's part in the scene on stage now. */
export const partnerOnStage = (): FriendId => buddy;

/** In stage directions ちいかわ stands for her partner: the act as today's partner plays it. */
function asPlayed(a: Act): Act {
  if (a.who !== 'chiikawa' || buddy === 'chiikawa') return a;
  const style = STYLE[buddy as PartnerId] ?? {};
  return {
    ...a,
    who: buddy,
    face: a.face && (style.faces?.[a.face] ?? a.face),
    gesture: a.gesture && (style.gestures?.[a.gesture] ?? a.gesture),
  };
}

/** Friends act out a moment. Gestures are not awaited (some loop). Mouths stay still: see the voice rule. */
export function act(acts: Act[] | undefined): void {
  for (const a of (acts ?? []).map(asPlayed)) {
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
