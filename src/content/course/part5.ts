import { heard, said } from '../parse.ts';
import type { StepDef } from '../types.ts';

/**
 * Part 5, all drafts (2026-11-17), for review in the content sheet before any audio is made: everyday talk beyond
 * greetings. Food and what she wants ("Can I have this?"), plans ("I want to go shopping."), what happened ("I went
 * shopping."), and asking about the other person ("How about you?"). The examples are things anyone might do on a
 * visit, not facts about her; frames come first ("I want to…", "I went…", "Can I have…"), so new words can be
 * dropped into them later.
 */
const TODAY = heard('What|did you|do|*today?', '今日は何をしたの？');

export const PART5: StepDef[] = [
  // ── Food, and what she wants.
  {
    id: 'what-do-you-want-to-eat', topic: 'table', status: 'draft',
    title: '何が食べたい？',
    when: '食べたいものを聞かれたら、名前に "please" をつけるだけ。決められないときは "Anything!"',
    hear: [heard('What|do you@after|want to|*eat?', '何が食べたい？')],
    say: [said('Chicken,|please.', 'チキンをお願いします。'), said('Anything!', '何でも大丈夫です！')],
  },
  {
    id: 'can-i-have-this', topic: 'table', status: 'draft',
    title: 'これをください',
    cue: 'メニューを指さして、これを頼みたい',
    when: '"Can I have 〜?" は「〜をもらえますか？」。ほしいものを頼む、ていねいな言い方。',
    say: [said('Can I|have|this?', 'これをもらえますか？')],
    then: [heard('*Sure!', 'もちろん！')],
  },
  {
    id: 'can-i-have-some-water', topic: 'table', status: 'draft',
    from: 'can-i-have-this',
    title: 'お水をください',
    cue: 'のどがかわいた。お水がほしい',
    when: '"this" をほしいものに変えるだけ。"some water" で「お水を少し」。',
    say: [said('Can I|have|some|water?', 'お水をもらえますか？')],
  },
  {
    id: 'i-like-this', topic: 'table', status: 'draft',
    from: 'whats-your-hobby',
    title: 'これ、好き',
    cue: '食べてみたら、とてもおいしい！',
    when: '"I like 〜." は食べ物にも使えるよ。指さして "I like this!"',
    say: [said('I|like|this!', 'これ、好きです！')],
  },
  {
    id: 'too-spicy', topic: 'table', status: 'draft',
    from: 'spicy',
    title: '辛すぎる',
    cue: '食べてみたら、辛すぎた！',
    when: '"too 〜" は「〜すぎる」。無理しないで、正直に伝えて大丈夫。',
    say: [said("It's|too|spicy!", '辛すぎます！')],
  },
  {
    id: 'im-thirsty', topic: 'feelings', status: 'draft',
    from: 'im-hungry',
    title: 'のどがかわいた',
    cue: '暑くて、のどがかわいた',
    when: '"hungry" を "thirsty" に変えると「のどがかわいた」。',
    say: [said("I'm|thirsty.", 'のどがかわきました。')],
  },

  // ── Plans.
  {
    id: 'what-tomorrow', topic: 'home', status: 'draft',
    title: '明日は何がしたい？',
    when: '"I want to 〜." は「〜したいです」。したいことを伝えよう。',
    hear: [heard('What|do you@after|want to|do|*tomorrow?', '明日は何がしたい？')],
    say: [said('I|want to|go|shopping.', '買い物に行きたいです。')],
  },
  {
    id: 'want-to-take-pictures', topic: 'home', status: 'draft',
    from: 'what-tomorrow',
    title: '写真を撮りたい',
    cue: 'きれいな場所。写真を撮りたい！',
    when: '"I want to" のあとを変えれば、したいことを何でも言えるよ。',
    say: [said('I|want to|take pictures.', '写真を撮りたいです。')],
  },
  {
    id: 'where-are-we-going', topic: 'home', status: 'draft',
    title: 'どこに行くの？',
    cue: 'みんなで出かけるみたい。行き先を知りたい',
    when: '行き先を聞くときはこれ。答えは "To 〜." で返ってくるよ。',
    say: [said('Where|are we|going?', 'どこに行くんですか？')],
    then: [heard('To|*the beach!', 'ビーチだよ！')],
  },
  {
    id: 'tomorrow-the-beach', topic: 'home', status: 'draft',
    title: '明日の予定を聞く',
    when: '予定を言われたら、「いつ」と「どこ」を聞き取ろう。賛成なら "Sounds good!"',
    hear: [heard('*Tomorrow,|we|go|to|*the beach.', '明日はビーチに行くよ。')],
    say: [said('Sounds good!', 'いいですね！')],
  },
  {
    id: 'what-time-tomorrow', topic: 'home', status: 'draft',
    from: 'what-time-is-it',
    title: '明日は何時？',
    cue: '明日、何時に出発するのか知りたい',
    when: '"What time" のあとに "tomorrow" をつけるだけ。',
    say: [said('What time|tomorrow?', '明日は何時ですか？')],
    then: [heard('At|*nine.', '9時だよ。')],
  },

  // ── What happened.
  {
    id: 'what-did-you-do-today', topic: 'chat', status: 'draft',
    title: '今日は何をしたの？',
    when: '"went" は "go"（行く）の「行った」の形。終わったことを話すときに使うよ。',
    hear: [TODAY],
    say: [said('I|went|shopping.', '買い物に行きました。')],
  },
  {
    id: 'went-to-the-beach', topic: 'chat', status: 'draft',
    from: 'what-did-you-do-today',
    title: 'ビーチに行った',
    when: '"I went to 〜." で「〜に行きました」。場所を変えれば、どこでも言えるよ。',
    hear: [TODAY],
    say: [said('I|went|to|the beach.', 'ビーチに行きました。')],
  },
  {
    id: 'took-pictures', topic: 'chat', status: 'draft',
    from: 'what-did-you-do-today',
    title: '写真を撮った',
    when: '"took" は "take"（撮る）の「撮った」の形。',
    hear: [TODAY],
    say: [said('I|took|pictures.', '写真を撮りました。')],
  },
  {
    id: 'yesterday-went-shopping', topic: 'chat', status: 'draft',
    from: 'what-did-you-do-today',
    title: '昨日のことを話す',
    cue: '昨日のことを話したい',
    when: '文のはじめに "Yesterday," をつけると「昨日、〜」。',
    say: [said('Yesterday,|I|went|shopping.', '昨日、買い物に行きました。')],
  },
  {
    id: 'tomorrow-want-shopping', topic: 'chat', status: 'draft',
    from: 'what-tomorrow',
    title: '明日したいことを話す',
    cue: '明日したいことを、自分から伝えたい',
    when: '文のはじめに "Tomorrow," をつけると「明日、〜」。',
    say: [said('Tomorrow,|I|want to|go|shopping.', '明日、買い物に行きたいです。')],
  },

  // ── Asking about the other person.
  {
    id: 'how-about-you', topic: 'chat', status: 'draft',
    title: 'あなたは？',
    cue: '自分が答えたあと、相手にも同じことを聞きたい',
    when: '何を聞かれても、答えたあとにこれをつければ、会話が続くよ。',
    say: [said('How about you?', 'あなたはどうですか？')],
  },
  {
    id: 'been-to-japan', topic: 'chat', status: 'draft',
    title: '日本に来たことある？',
    cue: '相手が日本に来たことがあるか、聞いてみたい',
    when: '"Have you been to 〜?" は「〜に行ったことはありますか？」。',
    say: [said('Have you|been to|Japan?', '日本に来たことはありますか？')],
    then: [heard('*Not yet.', 'まだないよ。')],
  },
  {
    id: 'ask-what-do-you-do', topic: 'chat', status: 'draft',
    from: 'what-do-you-do',
    title: '仕事を聞く',
    cue: '相手の仕事を聞きたい',
    when: '聞かれたことばは、自分から聞くときにも使えるよ。',
    say: [said('What|do you@after|do?', 'お仕事は何ですか？')],
  },
];
