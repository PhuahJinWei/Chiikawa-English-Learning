import { heard, said } from '../parse.ts';
import type { StepDef } from '../types.ts';

/**
 * Part 4 (written, reviewed, approved and voiced 2026-11-17): talking about herself.
 * The earlier parts make her a polite guest; these let her say who she is, and build longer sentences from short
 * ones, a piece at a time ("I work at a bakery." → "…from seven to four" → "…five days a week" → all of it).
 *
 * The facts are hers (you gave them on 2026-11-17): she works at a bakery from 7 to 4, five days a week, with Mondays
 * and Fridays off; she likes drawing and taking pictures; she has two younger brothers. Her name is not in the app:
 * "Yuki" stands in for it, and the step tells her to say her own. Her city is left out (your choice).
 *
 * The numbers come from part 3, so the work sentences are frames she can change: "from seven to four" is the same
 * blocks as "from eight to six".
 */
const NAME = heard("What's|*your name?", 'お名前は？');
const HOBBY = heard("What's|*your hobby?", '趣味は何？');
const BROTHERS = heard('Do you|have|any|*brothers|or|*sisters?', '兄弟はいる？');

export const PART4: StepDef[] = [
  // ── Her name.
  {
    id: 'whats-your-name', topic: 'me',
    title: '名前を聞かれたら',
    when: '初めて会う人によく聞かれるよ。"Yuki" は例の名前。自分の名前に変えて答えよう！',
    hear: [NAME],
    say: [said("I'm|Yuki.", 'ユキです。')],
  },
  {
    id: 'my-name-is', topic: 'me',
    from: 'whats-your-name',
    title: '私の名前は',
    when: '"I\'m 〜." より少しかしこまった言い方。自己紹介のはじめに使えるよ。ふだんは "I\'m 〜." で大丈夫。',
    hear: [NAME],
    say: [said('My name is|Yuki.', '私の名前はユキです。')],
  },
  {
    id: 'name-and-you', topic: 'me',
    from: 'whats-your-name',
    title: '名前を答えて、聞き返す',
    when: '答えたあとに "And you?" をつけると、相手の名前も聞けるよ。',
    hear: [NAME],
    say: [said("I'm|Yuki.|And you?", 'ユキです。そちらは？')],
  },
  {
    id: 'ask-name', topic: 'me',
    from: 'whats-your-name',
    title: '名前を聞く',
    cue: '相手の名前を知りたい',
    when: '聞かれたことばは、自分から聞くときにも使えるよ。',
    say: [said("What's|your name?", 'お名前は何ですか？')],
  },

  // ── Her work: one short sentence, then a piece at a time, up to the whole of it.
  {
    id: 'what-do-you-do', topic: 'me',
    title: '仕事を聞かれたら',
    when: '"What do you do?" は「お仕事は？」という意味。「いま何してるの？」ではないよ。',
    hear: [heard('What|do you@after|*do?', 'お仕事は何？'), heard('Where|do you@after|*work?', 'どこで働いてるの？')],
    say: [said('I|work|at a bakery.', 'パン屋で働いています。')],
  },
  {
    id: 'start-at-seven', topic: 'me',
    from: 'what-time-do-you-start',
    title: '7時からです',
    when: '"At seven." を文にすると "I start at seven."。数字を変えれば、どんな時間でも言えるよ。',
    hear: [heard('What time|do you@after|*start?', '何時に始まるの？')],
    say: [said('I|start|at|seven.', '7時から始まります。')],
  },
  {
    id: 'work-seven-to-four', topic: 'me',
    from: 'what-do-you-do',
    title: '7時から4時まで',
    cue: '仕事の時間を伝えたい',
    when: '"to 〜" は「〜まで」。"from seven to four" で「7時から4時まで」。',
    say: [said('I|work|from|seven|to|four.', '7時から4時まで働いています。')],
  },
  {
    id: 'work-five-days', topic: 'me',
    from: 'what-do-you-do',
    title: '週に5日',
    cue: '週に何日働いているか伝えたい',
    when: '"a week" は「1週間に」。"five days a week" で「週に5日」。',
    say: [said('I|work|five|days|a week.', '週に5日働いています。')],
  },
  {
    id: 'work-hours-and-days', topic: 'me',
    from: 'work-seven-to-four',
    title: '時間と日数をつなげる',
    cue: '仕事の時間と日数を、まとめて伝えたい',
    when: '覚えた2つをつなげるだけ。長い文も、短い文の組み合わせだよ！',
    say: [said('I|work|from|seven|to|four,|five|days|a week.', '7時から4時まで、週に5日働いています。')],
  },
  {
    id: 'work-all', topic: 'me',
    from: 'work-hours-and-days',
    title: '仕事のことを全部言う',
    cue: '仕事のことを、くわしく話したい',
    when: '"at a bakery" を入れれば、仕事の自己紹介のできあがり！',
    say: [said('I|work|at a bakery|from|seven|to|four,|five|days|a week.', 'パン屋で、7時から4時まで、週に5日働いています。')],
  },

  // ── Her days off.
  {
    id: 'off-on-mondays', topic: 'me',
    title: '休みの日',
    cue: '休みの日を伝えたい',
    when: '"I\'m off on 〜s." で「毎週〜曜日は休みです」。"I\'m off!" だけだと「もう行くね」の意味になるから、曜日までセットで！',
    say: [said("I'm|off|on Mondays.", '月曜日は休みです。')],
  },
  {
    id: 'off-mondays-and-fridays', topic: 'me',
    from: 'off-on-mondays',
    title: '月曜日と金曜日が休み',
    cue: '休みの日を、2つ伝えたい',
    when: '"and" でつなげば、2つの曜日を言えるよ。',
    say: [said("I'm|off|on Mondays|and|Fridays.", '月曜日と金曜日は休みです。')],
  },

  // ── Her hobbies.
  {
    id: 'whats-your-hobby', topic: 'me',
    title: '趣味を聞かれたら',
    when: '好きなことを聞かれたら、"I like 〜." で答えよう。',
    hear: [HOBBY],
    say: [said('I|like|drawing.', '絵を描くのが好きです。')],
  },
  {
    id: 'like-taking-pictures', topic: 'me',
    from: 'whats-your-hobby',
    title: '写真を撮るのが好き',
    when: '"I like" のあとを変えるだけで、好きなことをいくつでも言えるよ。',
    hear: [HOBBY],
    say: [said('I|like|taking pictures.', '写真を撮るのが好きです。')],
  },
  {
    id: 'like-both', topic: 'me',
    from: 'like-taking-pictures',
    title: '好きなことを2つ言う',
    when: '"and" でつなげば、2つまとめて言えるよ。',
    hear: [HOBBY],
    say: [said('I|like|drawing|and|taking pictures.', '絵を描くのと、写真を撮るのが好きです。')],
  },

  // ── Her family.
  {
    id: 'do-you-have-brothers', topic: 'me',
    title: '兄弟を聞かれたら',
    when: '家族のことは、よく聞かれる話題。"I have 〜." で「〜がいます」。',
    hear: [BROTHERS],
    say: [said('I|have|two|brothers.', '兄弟が2人います。')],
  },
  {
    id: 'two-younger-brothers', topic: 'me',
    from: 'do-you-have-brothers',
    title: '弟が2人います',
    when: '"younger" は「年下の」。"younger brothers" で「弟たち」。',
    hear: [BROTHERS],
    say: [said('I|have|two|younger|brothers.', '弟が2人います。')],
  },

  // ── More questions she will be asked.
  {
    id: 'do-you-speak-english', topic: 'me',
    title: '英語は話せる？',
    when: 'よく聞かれる質問。"A little." と答えれば、ゆっくり話してくれるはず。',
    hear: [heard('Do you|*speak English?', '英語は話せる？'), heard('Can you|*speak English?', '英語、話せる？')],
    say: [said('A little.', '少しだけです。')],
  },
  {
    id: 'do-you-like-malaysia', topic: 'me',
    title: 'マレーシアは好き？',
    when: '好きかどうか聞かれたら、"Yes, I love it!" で気持ちが伝わるよ。',
    hear: [heard('Do you|like|*Malaysia?', 'マレーシアは好き？')],
    say: [said('Yes,|I|love it!', 'はい、大好きです！')],
  },
  {
    id: 'where-do-you-live', topic: 'me',
    title: 'どこに住んでるの？',
    when: '"in 〜" は「〜に」。国の名前だけで十分だよ。',
    hear: [heard('Where|do you@after|*live?', 'どこに住んでるの？')],
    say: [said('In|Japan.', '日本に住んでいます。')],
  },
  {
    id: 'how-was-your-trip', topic: 'family',
    title: 'ここまでの旅はどうだった？',
    when: '着いたときによく聞かれるよ。"It was 〜." は「〜でした」。',
    hear: [heard('How was|*your trip?', 'ここまでの旅、どうだった？')],
    say: [said('It was|good!', 'よかったです！')],
  },
];
