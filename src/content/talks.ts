import type { TalkDef, TalkTurn } from './types.ts';

/**
 * Short conversations (会話してみよう, 2026-11-17): phrases she has learned, strung into a little scene, so she
 * practises keeping a conversation going and starting one, not only answering a single line.
 *
 * Every line is a line of a step of the path, so no new audio is needed: `them(step, english)` is a line she hears
 * in that step, and `me(step, english)` a line she says in it, written exactly as in the step. A conversation comes
 * up once she has learned all its steps (and said her own lines at least once), one a day in today's lesson, and
 * whenever she likes in 練習. In the order they become ready. Review them in the content sheet (npm run sheet).
 */
const them = (step: string, en: string): TalkTurn => ({ who: 'them', step, en });
const me = (step: string, en: string): TalkTurn => ({ who: 'me', step, en });

export const TALK_DEFS: readonly TalkDef[] = [
  {
    id: 'here-you-go',
    topic: 'basics',
    title: 'はい、どうぞ',
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
    cue: '友だちのお父さん・お母さんに初めて会った！',
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
      them('welcome', 'Welcome!'),
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
];
