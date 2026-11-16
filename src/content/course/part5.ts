import { heard, said } from '../parse.ts';
import type { StepDef } from '../types.ts';

/**
 * Part 5 (written, reviewed, approved and voiced 2026-11-17): everyday talk beyond greetings. Food and what she wants
 * ("Can I have this?"), plans ("I want to go shopping."), what happened ("I went shopping."), and asking about the
 * other person ("How about you?"). The examples are things anyone might do on a visit, not facts about her; frames
 * come first ("I want to…", "I went…", "Can I have…"), so new words can be dropped into them later.
 */
const TODAY = heard('What|did you|do|*today?', '今日は何をしたの？');

export const PART5: StepDef[] = [
  // ── Food, and what she wants.
  {
    id: 'what-do-you-want-to-eat', topic: 'table',
    title: '何が食べたい？',
    when: '食べたいものを聞かれたら、名前に "please" をつけるだけ。決められないときは "Anything is fine!"',
    hear: [heard('What|do you@after|want to|*eat?', '何が食べたい？')],
    say: [said('Chicken,|please.', 'チキンをお願いします。'), said('Anything|is fine!', '何でも大丈夫です！')],
  },
  {
    id: 'can-i-have-this', topic: 'table',
    title: 'これをください',
    cue: '食卓のおかずを指さして、これを食べたい',
    when: '"Can I have 〜?" は「〜をもらえますか？」。ほしいものを頼む、ていねいな言い方。',
    say: [said('Can I|have@get|this?', 'これをもらえますか？')],
    then: [heard('*Sure!', 'もちろん！')],
  },
  {
    id: 'can-i-have-some-water', topic: 'table',
    from: 'can-i-have-this',
    title: 'お水をください',
    cue: 'のどがかわいた。お水がほしい',
    when: '"this" をほしいものに変えるだけ。"some water" は、ただの「お水」。飲み物や食べ物の前に、よく "some" をつけるよ。',
    say: [said('Can I|have@get|some|water?', 'お水をもらえますか？')],
  },
  {
    id: 'i-like-this', topic: 'table',
    from: 'whats-your-hobby',
    title: 'これ、好き',
    cue: '食べてみたら、とてもおいしい！',
    when: '"I like 〜." は食べ物にも使えるよ。指さして "I like this!"',
    say: [said('I|like|this!', 'これ、好きです！')],
  },
  {
    id: 'too-spicy', topic: 'table',
    from: 'spicy',
    title: '辛すぎる',
    cue: '食べてみたら、辛すぎた！',
    when: '"too 〜" は「〜すぎる」。"for me"（私には）をつけると、料理のせいではなく自分の好みの話になって、作った人に失礼にならないよ。',
    say: [said("It's|too@much|spicy|for me!", '私には辛すぎます！')],
  },
  {
    id: 'im-thirsty', topic: 'feelings',
    from: 'im-hungry',
    title: 'のどがかわいた',
    cue: '暑くて、のどがかわいた',
    when: '"hungry" を "thirsty" に変えると「のどがかわいた」。',
    say: [said("I'm|thirsty.", 'のどがかわきました。')],
  },

  // ── Plans.
  {
    id: 'what-tomorrow', topic: 'home',
    title: '明日は何がしたい？',
    when: '"I want to 〜." は「〜したいです」。したいことを伝えよう。',
    hear: [heard('What|do you@after|want to|do|*tomorrow?', '明日は何がしたい？')],
    say: [said('I|want to|go|shopping.', '買い物に行きたいです。')],
  },
  {
    id: 'want-to-take-pictures', topic: 'home',
    from: 'what-tomorrow',
    title: '写真を撮りたい',
    cue: 'きれいな場所。写真を撮りたい！',
    when: '"I want to" のあとを変えれば、したいことを何でも言えるよ。',
    say: [said('I|want to|take pictures.', '写真を撮りたいです。')],
  },
  {
    id: 'where-are-we-going', topic: 'home',
    title: 'どこに行くの？',
    cue: 'みんなで出かけるみたい。行き先を知りたい',
    when: '行き先を聞くときはこれ。答えは "To 〜." で返ってくるよ。',
    say: [said('Where|are we|going?', 'どこに行くんですか？')],
    then: [heard('To@place|*the beach!', 'ビーチだよ！')],
  },
  {
    id: 'tomorrow-the-beach', topic: 'home',
    title: '明日の予定を言われたら',
    when: '予定を言われたら、「いつ」と「どこ」を聞き取ろう。賛成なら "Sounds good!"',
    hear: [heard("*Tomorrow|we're|going|to@place|*the beach.", '明日はビーチに行くよ。')],
    say: [said('Sounds good!', 'いいですね！')],
  },
  {
    id: 'what-time-tomorrow', topic: 'home',
    from: 'what-time-is-it',
    title: '明日は何時？',
    cue: '明日、何時に出発するのか知りたい',
    when: '"What time" のあとに "tomorrow" をつけるだけ。',
    say: [said('What time|tomorrow?', '明日は何時ですか？')],
    then: [heard('At|*nine.', '9時だよ。')],
  },

  // ── What happened.
  {
    id: 'what-did-you-do-today', topic: 'chat',
    title: '今日は何をしたの？',
    when: '"went" は "go"（行く）の「行った」の形。終わったことを話すときに使うよ。',
    hear: [TODAY],
    say: [said('I|went|shopping.', '買い物に行きました。')],
  },
  {
    id: 'went-to-the-beach', topic: 'chat',
    from: 'what-did-you-do-today',
    title: 'ビーチに行った',
    when: '"I went to 〜." で「〜に行きました」。場所を変えれば、どこでも言えるよ。',
    hear: [TODAY],
    say: [said('I|went|to@place|the beach.', 'ビーチに行きました。')],
  },
  {
    id: 'took-pictures', topic: 'chat',
    from: 'what-did-you-do-today',
    title: '写真を撮った',
    when: '"took" は "take"（撮る）の「撮った」の形。',
    hear: [TODAY],
    say: [said('I|took|pictures.', '写真を撮りました。')],
  },
  {
    id: 'yesterday-went-shopping', topic: 'chat',
    from: 'what-did-you-do-today',
    title: '昨日のことを話す',
    cue: '昨日のことを話したい',
    when: '文のはじめに "Yesterday," をつけると「昨日、〜」。',
    say: [said('Yesterday,|I|went|shopping.', '昨日、買い物に行きました。')],
  },
  {
    id: 'tomorrow-want-shopping', topic: 'chat',
    from: 'what-tomorrow',
    title: '明日したいことを話す',
    cue: '明日したいことを、自分から伝えたい',
    when: '文のはじめに "Tomorrow," をつけると「明日、〜」。',
    say: [said('Tomorrow,|I|want to|go|shopping.', '明日、買い物に行きたいです。')],
  },

  // ── Asking about the other person.
  {
    id: 'how-about-you', topic: 'chat',
    title: 'あなたは？',
    cue: '自分が答えたあと、相手にも同じことを聞きたい',
    when: '名前や仕事、趣味を聞かれて答えたあとにこれをつければ、相手のことも聞けて、会話が続くよ。',
    say: [said('How about you?', 'そちらはどうですか？')],
  },
  {
    id: 'been-to-japan', topic: 'chat',
    title: '日本に来たことある？',
    cue: '相手が日本に来たことがあるか、聞いてみたい',
    when: '"Have you been to 〜?" は「〜に行ったことはありますか？」。',
    say: [said('Have you|been to|Japan?', '日本に来たことはありますか？')],
    then: [heard('*Not yet.', 'まだないよ。')],
  },
  {
    id: 'ask-what-do-you-do', topic: 'chat',
    from: 'what-do-you-do',
    title: '仕事を聞く',
    cue: '相手の仕事を聞きたい',
    when: '聞かれたことばは、自分から聞くときにも使えるよ。',
    say: [said('What|do you@after|do?', 'お仕事は何ですか？')],
  },
];
