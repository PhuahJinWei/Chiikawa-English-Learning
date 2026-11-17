import { heard, said } from '../parse.ts';
import type { StepDef } from '../types.ts';

/**
 * Part 7 (written, approved and voiced 2026-11-17): the everyday phrases the whole-app review found missing. Reactions that keep a
 * conversation going ("Wow!", "I see.", "That's nice!"), words for describing things ("It's hot!", "It's cute!"),
 * two phrases for learning and for her hobby ("What is this in English?", "Can I take a picture?"), what she may
 * hear back when she asks "What do you do?", and the tens, for ages and prices. "Really?" is left out: the voice
 * never rises on a question, and "Really." said flat sounds doubtful. Questions about her that need her own facts
 * (given 2026-11-17: 25 as a placeholder age, her second visit, one week) are at the end.
 */
export const PART7: StepDef[] = [
  // ── Reactions.
  {
    id: 'wow', topic: 'chat',
    title: 'わあ！',
    when: '何かを見せてもらったら、まず "Wow!"。これだけで気持ちが伝わるよ。',
    hear: [heard('*Look!', '見て！'), heard('*Look|at this!', 'これ見て！')],
    say: [said('Wow!', 'わあ、すごいですね！')],
  },
  {
    id: 'i-see', topic: 'chat',
    title: 'なるほど',
    when: '教えてもらって「わかった」と伝えるあいづち。"Yes." より自然だよ。',
    hear: [heard("It's|*chicken.", 'チキンだよ。')],
    say: [said('I see.', 'なるほど。')],
  },
  {
    id: 'thats-nice', topic: 'chat',
    title: 'すてきですね',
    cue: '友だちが、うれしい知らせを教えてくれた',
    when: '相手のいい話には "That\'s nice!"。聞いているよ、という気持ちも伝わるよ。',
    say: [said("That's|nice!", 'すてきですね！')],
  },

  // ── Describing things: "It's good!" with the last word changed.
  {
    id: 'its-hot', topic: 'feelings',
    from: 'like-it',
    title: '暑い！',
    cue: '外に出たら、とても暑い！',
    when: '"It\'s good!" の "good" を変えるだけ。マレーシアでは毎日使えるよ。',
    say: [said("It's|hot!", '暑いです！')],
  },
  {
    id: 'its-cold', topic: 'feelings',
    from: 'its-hot',
    title: '寒い！',
    cue: 'お店のエアコンが強くて、寒い…',
    when: '"hot" の反対は "cold"。エアコンの強いお店で使えるよ。',
    say: [said("It's|cold!", '寒いです！')],
  },
  {
    id: 'its-cute', topic: 'feelings',
    from: 'its-hot',
    title: 'かわいい！',
    cue: 'かわいいものを見つけた！',
    when: '「かわいい」は "cute"。物にも動物にも使えるよ。',
    say: [said("It's|cute!", 'かわいいです！')],
  },
  {
    id: 'its-beautiful', topic: 'feelings',
    from: 'its-hot',
    title: 'きれい！',
    cue: '景色がとてもきれい！',
    when: '景色や写真をほめるときは "beautiful"。',
    say: [said("It's|beautiful!", 'きれいです！')],
  },

  // ── For learning, and for her hobby.
  {
    id: 'in-english', topic: 'chat',
    from: 'what-is-this',
    title: '英語で何て言う？',
    cue: '目の前の物を、英語で何と言うのか知りたい',
    when: '"What is this?" に "in English" をつけると、英語での言い方を教えてもらえるよ。',
    say: [said('What|is this|in English?', 'これは英語で何と言いますか？')],
  },
  {
    id: 'can-i-take-a-picture', topic: 'home',
    from: 'can-i-help',
    title: '写真を撮ってもいい？',
    cue: '写真を撮りたい。撮ってもいいか聞きたい',
    when: '人やお店の中を撮る前に、ひとこと聞くと安心だよ。',
    say: [said('Can I|take a picture?', '写真を撮ってもいいですか？')],
    then: [heard('*Sure!', 'もちろん！')],
  },

  // ── What she may hear back when she asks "What do you do?".
  {
    id: 'im-a-teacher', topic: 'chat',
    title: '相手の仕事',
    when: '"What do you do?" と聞くと、こんな答えが返ってくるよ。',
    hear: [heard("I'm|*a teacher.", '先生をしているよ。'), heard('I|work|*at a bank.', '銀行で働いているよ。')],
  },

  // ── The tens, for ages and prices.
  {
    id: 'twenty-thirty-forty', topic: 'basics',
    title: '20・30・40',
    when: '年齢や値段で使うよ。"twenty-five"（25）のように、後ろに1〜9をつければ間の数も言える。',
    hear: [heard('*How many?', 'いくつ？')],
    say: [said('Twenty.', '20個です。'), said('Thirty.', '30個です。'), said('Forty.', '40個です。')],
  },
  {
    id: 'fifty-hundred', topic: 'basics',
    title: '50・100',
    when: '"fifty" は "fifteen"（15）と似ているから、最初を強く言おう。100は "a hundred"。',
    hear: [heard('*How many?', 'いくつ？')],
    say: [said('Fifty.', '50個です。'), said('A hundred.', '100個です。')],
  },

  // ── Questions the family will ask. Her facts (2026-11-17): second visit, staying one week; 25 is a placeholder
  // age, for privacy, as Yuki is for her name.
  {
    id: 'first-time-in-malaysia', topic: 'family',
    title: 'マレーシアは初めて？',
    when: '旅行者によく聞く質問。2回目なら "My second time."',
    hear: [heard('Is this|*your first time|in Malaysia?', 'マレーシアは初めて？')],
    say: [said('My second time.', '2回目です。')],
  },
  {
    id: 'how-long-staying', topic: 'family',
    title: 'どのくらいいるの？',
    when: '滞在の長さを聞かれたら、長さだけ答えれば大丈夫。',
    hear: [heard('How long|are you@after|*staying?', 'どのくらいいるの？')],
    say: [said('One week.', '1週間です。')],
  },
  {
    id: 'how-old', topic: 'me',
    title: '年齢を聞かれたら',
    when: 'マレーシアでは、年齢を気軽に聞かれることがあるよ。25は例。自分の年齢に変えて言おう！',
    hear: [heard('How old|are you?@after', '何歳？')],
    say: [said("I'm|twenty-five.", '25歳です。')],
  },
];
