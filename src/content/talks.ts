import type { TalkDef, TalkTurn } from './types.ts';

/**
 * Short conversations (会話してみよう, 2026-11-17): phrases she has learned, strung into a little scene, so she
 * practises keeping a conversation going and starting one, not only answering a single line.
 *
 * Every line is a line of a step of the path, so no new audio is needed: `them(step, english)` is a line she hears
 * in that step, and `me(step, english)` a line she says in it, written exactly as in the step. Either may give its own
 * Japanese when the step's does not fit the moment. A conversation comes up once she has learned all its steps (and
 * said her own lines at least once), one a day in today's lesson, and whenever she likes in 練習. In the order they
 * become ready. Review them in the content sheet (npm run sheet). Drafts (`status: 'draft'`) are not in the app.
 */
const them = (step: string, en: string, ja?: string): TalkTurn => ({ who: 'them', step, en, ...(ja ? { ja } : {}) });
const me = (step: string, en: string, ja?: string): TalkTurn => ({ who: 'me', step, en, ...(ja ? { ja } : {}) });

export const TALK_DEFS: readonly TalkDef[] = [
  {
    id: 'here-you-go',
    topic: 'basics',
    title: 'これ、あげる',
    cue: '友だちが何か持ってきてくれた',
    turns: [them('hi', 'Hey!'), me('hi', 'Hi!'), them('thank-you', 'This is for you.'), me('thank-you', 'Thank you!')],
  },
  {
    id: 'hello-bye',
    topic: 'basics',
    title: '道で会ったら',
    cue: '道で友だちに会った',
    turns: [
      them('hi', 'Hello!'),
      me('hi', 'Hi!'),
      them('how-are-you', 'How are you?'),
      me('how-are-you', 'Good, thank you.'),
      them('bye', 'See you later!'),
      me('bye', 'Bye!'),
    ],
  },
  {
    id: 'slowly',
    topic: 'family',
    title: 'ゆっくり話してもらう',
    cue: '話しかけられたけど、速くて聞き取れない…',
    turns: [
      them('where-from', 'Where are you from?'),
      me('slowly', 'Slowly, please.'),
      them('where-from', 'Where from?'),
      me('where-from', 'Japan.'),
    ],
  },
  {
    id: 'arriving',
    topic: 'family',
    title: 'おうちに着いたら',
    cue: '友だちの家に着いた！',
    turns: [
      them('welcome', 'Welcome!'),
      me('welcome', 'Thank you!'),
      them('come', 'Come in!'),
      me('this-is-for-you', 'This is for you.'),
      them('youre-welcome', 'Thank you so much!'),
      me('youre-welcome', "You're welcome."),
      them('sit', 'Have a seat.'),
    ],
  },
  {
    id: 'breakfast',
    topic: 'table',
    title: '朝ごはん',
    cue: '朝、起きてきたら…',
    turns: [
      them('good-morning', 'Morning!'),
      me('good-morning', 'Good morning!'),
      them('have-you-eaten', 'Eat already?'),
      me('have-you-eaten', 'Not yet.'),
      them('lets-eat', 'Time to eat!'),
    ],
  },
  {
    id: 'try-this',
    topic: 'table',
    title: 'いただきます',
    cue: 'テーブルに料理がいっぱい！',
    turns: [
      them('try-this', 'Try this!'),
      me('thank-you', 'Thank you!'),
      them('like-it', 'Is it tasty?'),
      me('like-it', "It's good!"),
      them('some-more', 'Want some more?'),
      me('some-more', 'Yes, please.'),
    ],
  },
  {
    id: 'good-night',
    topic: 'home',
    title: 'おやすみ',
    cue: '夜、そろそろ寝る時間',
    turns: [
      them('tired', 'Are you tired?'),
      me('tired', 'A little.'),
      them('good-night', 'Good night!'),
      me('good-night', 'Good night!'),
      them('good-night', 'Sleep well!'),
    ],
  },
  {
    id: 'first-meeting',
    topic: 'family',
    title: 'はじめまして',
    cue: '友だちの親せきのおばさんに、初めて会った！',
    turns: [
      me('auntie', 'Hi, Auntie!'),
      them('nice-to-meet-you', 'Hello! Nice to meet you!'),
      me('nice-to-meet-you', 'You too!'),
      them('where-from', 'Where are you from?'),
      me('where-from', 'Japan.'),
      them('welcome', 'Welcome to Malaysia!'),
      me('welcome', 'Thank you!'),
    ],
  },
  {
    id: 'after-dinner',
    topic: 'table',
    title: 'ごちそうさま',
    cue: 'お腹いっぱい食べた！',
    turns: [
      them('full', 'Are you full?'),
      me('full', "I'm full."),
      me('gochisousama', 'Thank you! It was delicious!'),
      // The family answers thanks with "Welcome!": here it means どういたしまして.
      them('welcome', 'Welcome!', 'どういたしまして！'),
    ],
  },
  {
    id: 'a-drink',
    topic: 'table',
    title: '飲み物',
    cue: '何か聞かれたけど、聞き取れなかった…',
    turns: [
      them('a-drink', 'Want a drink?'),
      me('sorry-what', 'Sorry, what?'),
      them('a-drink', 'What do you want to drink?'),
      me('a-drink', 'Water, please.'),
    ],
  },
  {
    id: 'can-i-help',
    topic: 'home',
    title: 'お手伝い',
    cue: 'ごはんのあと、お皿洗いを手伝いたい',
    turns: [me('can-i-help', 'Can I help?'), them('no-need', 'No need!'), me('thank-you', 'Thank you!')],
  },

  // ── Written and approved 2026-11-17: the phrases from #52 on, which were in no conversation. Only lines that
  // already have their audio. Her own facts: a bakery, 7 to 4, five days a week, off on Mondays and Fridays, drawing
  // and taking pictures, two younger brothers.
  {
    id: 'excuse-me-toilet',
    topic: 'home',    title: 'トイレはどこ？',
    cue: 'レストランで、トイレに行きたくなった',
    turns: [
      me('excuse-me', 'Excuse me.'),
      me('toilet', 'Where is the toilet?'),
      // A waiter, so not the step's casual こっちだよ！
      them('come', 'This way!', 'こちらです。'),
      me('thank-you', 'Thank you!'),
    ],
  },
  {
    id: 'my-work',
    topic: 'me',    title: '仕事のこと',
    cue: '仕事について聞かれた',
    turns: [
      them('what-do-you-do', 'What do you do?'),
      me('what-do-you-do', 'I work at a bakery.'),
      them('start-at-seven', 'What time do you start?'),
      me('start-at-seven', 'I start at seven.'),
      me('work-five-days', 'I work five days a week.'),
      me('off-mondays-and-fridays', "I'm off on Mondays and Fridays."),
    ],
  },
  {
    id: 'hobbies-and-family',
    topic: 'me',    title: '好きなことと家族',
    cue: '趣味や兄弟のことを聞かれた',
    turns: [
      them('like-both', "What's your hobby?"),
      me('like-both', 'I like drawing and taking pictures.'),
      them('two-younger-brothers', 'Do you have any brothers or sisters?'),
      me('two-younger-brothers', 'I have two younger brothers.'),
    ],
  },
  {
    id: 'getting-to-know',
    topic: 'family',    title: '自己紹介',
    cue: '友だちのいとこに、初めて会った！',
    turns: [
      them('nice-to-meet-you-too', 'Nice to meet you!'),
      me('nice-to-meet-you-too', 'Nice to meet you too!'),
      them('my-name-is', "What's your name?"),
      me('name-and-from-japan', "My name is Yuki, and I'm from Japan."),
      them('do-you-like-malaysia', 'Do you like Malaysia?'),
      me('do-you-like-malaysia', 'Yes, I love it!'),
    ],
  },
  {
    id: 'a-gift-from-japan',
    topic: 'family',    title: '日本のおみやげ',
    cue: '友だちの家に着いた。おみやげを渡したい',
    turns: [
      them('thank-you-for-having-me', 'Welcome!'),
      me('thank-you-for-having-me', 'Thank you for having me!'),
      them('how-was-your-trip', 'How was your trip?'),
      me('how-was-your-trip', 'It was good!'),
      me('from-japan', 'This is for you. From Japan!'),
      them('youre-welcome', 'Thank you so much!'),
    ],
  },
  {
    id: 'asking-again',
    topic: 'chat',    title: 'もう一回お願い',
    cue: '聞かれたことが、わからなかった…',
    turns: [
      them('where-do-you-live', 'Where do you live?'),
      me('sorry-i-dont-understand', "Sorry, I don't understand."),
      me('one-more-time-please', 'One more time, please.'),
      them('where-do-you-live', 'Where do you live?'),
      me('where-do-you-live', 'In Japan.'),
    ],
  },
  {
    id: 'spicy-but-good',
    topic: 'table',    title: '辛いけど、おいしい',
    cue: 'みんなで夕ごはん。辛い料理も出てきた',
    turns: [
      them('a-little-its-good', 'Is it spicy?'),
      me('a-little-its-good', "A little. It's good!"),
      me('i-like-this', 'I like this!'),
      them('no-thank-you-im-full', 'Want some more?'),
      me('no-thank-you-im-full', "No, thank you. I'm full."),
    ],
  },
  {
    id: 'too-spicy-dish',
    topic: 'table',    title: '辛すぎる！',
    cue: 'すすめられた料理が、とても辛かった！',
    turns: [
      them('try-this', 'Try this!'),
      me('thank-you', 'Thank you!'),
      me('too-spicy', "It's too spicy for me!"),
      them('im-ok', 'Are you OK?'),
      me('im-ok', "I'm OK, thank you."),
      me('can-i-have-some-water', 'Can I have some water?'),
      them('can-i-have-this', 'Sure!'),
    ],
  },
  {
    id: 'a-short-rest',
    topic: 'feelings',    title: 'ひと休み',
    cue: '暑い中を歩いて、疲れた…',
    turns: [
      me('im-tired', "I'm tired."),
      them('sit', 'Have a seat.'),
      me('thank-you', 'Thank you!'),
      me('im-thirsty', "I'm thirsty."),
      them('a-drink', 'What do you want to drink?'),
      me('a-drink', 'Water, please.'),
    ],
  },
  {
    id: 'hi-uncle',
    topic: 'family',    title: 'おじさんにあいさつ',
    cue: '友だちのお父さんに会った',
    turns: [
      me('auntie', 'Hi, Uncle!'),
      them('how-are-you', 'How are you?'),
      me('how-are-you', 'Good, thank you.'),
      me('how-about-you', 'How about you?'),
      them('ask-how-are-you', 'Good, thank you.'),
    ],
  },
  {
    id: 'what-to-eat',
    topic: 'table',    title: '何を食べる？',
    cue: '夕ごはん。知らない料理もある',
    turns: [
      them('what-do-you-want-to-eat', 'What do you want to eat?'),
      me('what-do-you-want-to-eat', 'Anything is fine!'),
      me('what-is-this', 'What is this?'),
      them('what-is-this', "It's chicken."),
      me('can-i-have-this', 'Can I have this?'),
      them('can-i-have-this', 'Sure!'),
    ],
  },
  {
    id: 'helping-out',
    topic: 'home',    title: '手伝ってくれる？',
    cue: '友だちのお母さんに、手伝いを頼まれた',
    turns: [
      them('help-me', 'Can you help me?'),
      me('help-me', 'Sure!'),
      them('no-problem', 'Sorry!'),
      me('no-problem', 'No problem!'),
      them('youre-welcome', 'Thank you so much!'),
      me('youre-welcome', "You're welcome."),
    ],
  },
  {
    id: 'going-out',
    topic: 'home',    title: 'おでかけ',
    cue: '出かける時間になった',
    turns: [
      them('im-ready', 'Are you ready?'),
      me('im-ready', "I'm ready!"),
      me('lets-go-she', "Let's go!"),
      me('where-are-we-going', 'Where are we going?'),
      them('where-are-we-going', 'To the beach!'),
    ],
  },
  {
    id: 'beach-tomorrow',
    topic: 'home',    title: '明日の予定',
    cue: '夜、明日の予定を聞いた',
    turns: [
      them('tomorrow-the-beach', "Tomorrow we're going to the beach."),
      me('tomorrow-the-beach', 'Sounds good!'),
      me('want-to-take-pictures', 'I want to take pictures.'),
      me('what-time-tomorrow', 'What time tomorrow?'),
      them('what-time-tomorrow', 'At nine.'),
      them('i-understand', 'Got it?'),
      me('i-understand', 'I understand.'),
    ],
  },
  {
    id: 'a-present',
    topic: 'chat',    title: 'プレゼント',
    cue: '昨日の買い物で、友だちにプレゼントを買った',
    turns: [
      me('yesterday-went-shopping', 'Yesterday, I went shopping.'),
      me('this-is-for-you', 'This is for you.'),
      them('youre-welcome', 'Thank you so much!'),
      me('ask-like-it', 'Do you like it?'),
      them('ask-like-it', 'Yes, I love it!'),
      me('im-happy', "I'm happy!"),
    ],
  },
  {
    id: 'how-was-today',
    topic: 'chat',    title: '今日あったこと',
    cue: '夜、今日は何をしたのか聞かれた',
    turns: [
      them('beach-and-pictures', 'What did you do today?'),
      me('beach-and-pictures', 'I went to the beach and took pictures.'),
      me('today-was-fun', 'Today was fun!'),
      them('good-night', 'Sleep well!'),
      me('good-night-see-you-tomorrow', 'Good night! See you tomorrow!'),
    ],
  },
  {
    id: 'japan-talk',
    topic: 'chat',    title: '日本に来たことある？',
    cue: 'どこから来たのか聞かれた',
    turns: [
      them('im-from-japan', 'Where are you from?'),
      me('im-from-japan', "I'm from Japan."),
      me('been-to-japan', 'Have you been to Japan?'),
      them('been-to-japan', 'Not yet.'),
    ],
  },
  {
    id: 'going-home',
    topic: 'family',    title: '帰る日',
    cue: '日本に帰る日。友だちの家族とお別れ',
    turns: [
      // On leaving, "Thank you for having me!" is お世話になりました, not the step's 迎えてくださって (arriving).
      me('thank-you-for-having-me', 'Thank you for having me!', 'お世話になりました！'),
      them('welcome', 'Welcome!', 'どういたしまして！'),
      me('it-was-fun', 'It was fun!'),
      them('bye', 'See you!'),
      me('see-you-next-year', 'See you next year!'),
      me('come-again-next-year', "I'll come again next year!"),
    ],
  },
];
