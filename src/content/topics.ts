import type { Topic, TopicId } from './types.ts';

/**
 * Topics: the notebook's shelves, and who acts on stage beside Hachiware (only he talks). A step's topic is a label,
 * not its place in the path: the path itself (src/content/course) mixes topics in teaching order.
 */
export const TOPICS: Readonly<Record<TopicId, Topic>> = {
  app: { id: 'app', title: 'アプリのことば', cast: ['hachiware', 'chiikawa'] },
  basics: { id: 'basics', title: 'まずはこれだけ', cast: ['hachiware', 'chiikawa'] },
  table: { id: 'table', title: 'ごはんの時間', cast: ['hachiware', 'kurimanju', 'chiikawa'] },
  family: { id: 'family', title: '友だちの家族と', cast: ['hachiware', 'shisa', 'chiikawa'] },
  home: { id: 'home', title: 'おうちで', cast: ['hachiware', 'rakko', 'chiikawa'] },
  chat: { id: 'chat', title: '話しかけてみよう', cast: ['hachiware', 'usagi', 'chiikawa'] },
  feelings: { id: 'feelings', title: '気持ちを言う', cast: ['hachiware', 'momonga', 'chiikawa'] },
  me: { id: 'me', title: '自分のこと', cast: ['hachiware', 'shisa', 'chiikawa'] },
};
