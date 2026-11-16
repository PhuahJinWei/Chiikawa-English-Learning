import type { FriendId } from '../stage/types.ts';
import type { Progress } from './progress.ts';
import { englishLevel } from './shift.ts';

/**
 * Her study partner on stage, beside Hachiware, who does all the talking (2026-11-17, your idea). The partner learns
 * beside her: worried when she misses, happy when she gets it, acting out what she says. Chiikawa is the first; the
 * others join as her English level goes up (one level for every ten phrases learned), and from then on they take
 * turns, one partner a day. In the lessons' stage directions ちいかわ stands for whoever is her partner that day
 * (`castWith`; src/app/scene.ts plays it).
 */
export type PartnerId = 'chiikawa' | 'usagi' | 'momonga';

/** Who joins at which English level, in the order they join. */
export const PARTNERS: readonly { id: PartnerId; level: number }[] = [
  { id: 'chiikawa', level: 1 },
  { id: 'usagi', level: 2 },
  { id: 'momonga', level: 3 },
];

export const isPartner = (x: unknown): x is PartnerId => PARTNERS.some((f) => f.id === x);

/** The partners who have joined at this English level, in the order they joined. */
export const joinedAt = (level: number): PartnerId[] => PARTNERS.filter((f) => f.level <= level).map((f) => f.id);

/** Who joins next, and at which level (none once everyone has joined). */
export const nextToJoin = (level: number): { id: PartnerId; level: number } | null =>
  PARTNERS.find((f) => f.level > level) ?? null;

/** The partners who joined between two levels (her level went up during a lesson). */
export const joinedBetween = (before: number, after: number): PartnerId[] =>
  PARTNERS.filter((f) => f.level > before && f.level <= after).map((f) => f.id);

/**
 * Today's partner, chosen the first time it is asked for on a new day and kept for the rest of the day. A friend who
 * has joined but never been her partner comes first: that is their first day (`first`), when Hachiware introduces
 * them. Otherwise it is the next one in turn after the last partner. Records the choice in `p`.
 */
export function partnerOfDay(p: Progress, today: number): { id: PartnerId; first: boolean } {
  const joined = joinedAt(englishLevel(p).level);
  const kept = p.partner;
  // A restored backup can lower her level: a partner who has not joined at that level is chosen again.
  if (kept && kept.day === today && joined.includes(kept.id)) return { id: kept.id, first: kept.first };
  const fresh = joined.find((id) => !p.partnered.includes(id));
  const id = fresh ?? joined[(joined.indexOf(kept?.id ?? 'chiikawa') + 1) % joined.length];
  // Chiikawa is there from the very first day: only the friends who join later are introduced.
  const first = !!fresh && fresh !== 'chiikawa';
  p.partner = { id, day: today, first };
  if (!p.partnered.includes(id)) p.partnered.push(id);
  return { id, first };
}

/**
 * A scene's cast with ちいかわ's part played by `partner`, and who plays it. When the partner already has a part of
 * their own in the scene (a phrase from their own topic, say), Chiikawa keeps hers, so no one is on stage twice.
 */
export function castWith(cast: readonly FriendId[], partner: PartnerId): { cast: FriendId[]; buddy: FriendId } {
  const buddy: FriendId = partner !== 'chiikawa' && !cast.includes(partner) && cast.includes('chiikawa') ? partner : 'chiikawa';
  return { cast: cast.map((id) => (id === 'chiikawa' ? buddy : id)), buddy };
}
