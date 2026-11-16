import type { FriendId } from '../stage/types.ts';

/** Each friend's name and accent colour (their pack's highlight marker). */
export const FRIENDS: Record<FriendId, { name: string; accent: string; accent2: string }> = {
  hachiware: { name: 'ハチワレ', accent: '#cfe8fa', accent2: '#86bfe9' },
  chiikawa: { name: 'ちいかわ', accent: '#fcdce3', accent2: '#f2a7b6' },
  usagi: { name: 'うさぎ', accent: '#fbebc4', accent2: '#efc762' },
  kurimanju: { name: 'くりまんじゅう', accent: '#f1dcc6', accent2: '#d6a173' },
  shisa: { name: 'シーサー', accent: '#fbdcc6', accent2: '#f0a46e' },
  momonga: { name: 'モモンガ', accent: '#dce9f8', accent2: '#a6c4ea' },
  rakko: { name: 'ラッコ', accent: '#dce7dd', accent2: '#9db99f' },
  furuhonya: { name: '古本屋', accent: '#eadcf2', accent2: '#c4a3d8' },
};

export function accentStyle(id: FriendId): string {
  return `--accent:${FRIENDS[id].accent};--accent-2:${FRIENDS[id].accent2}`;
}
