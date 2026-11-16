import { heard, said } from '../parse.ts';
import type { StepDef } from '../types.ts';

/**
 * Part 3 (written, reviewed, approved and voiced 2026-11-17): numbers to twelve, the time, and the days of the week.
 * They are the parts she swaps in and out of longer sentences: with these, "I work from seven to four" (part 4) can
 * become any hours, and plans and meeting times can be understood.
 */
const HOW_MANY = heard('*How many?', 'いくつ？');
const WHAT_DAY = heard('What day|is it?@time', '今日は何曜日？');

export const PART3: StepDef[] = [
  // ── Numbers, three at a time.
  {
    id: 'one-two-three', topic: 'basics',
    title: '1・2・3',
    when: '数は、時間にも日にちにも買い物にも使うよ。まずは1から3！',
    hear: [HOW_MANY],
    say: [said('One.', '1つです。'), said('Two.', '2つです。'), said('Three.', '3つです。')],
  },
  {
    id: 'four-five-six', topic: 'basics',
    title: '4・5・6',
    when: '"four" は「フォー」とのばして、"five" の最後は軽く「ヴ」。',
    hear: [HOW_MANY],
    say: [said('Four.', '4つです。'), said('Five.', '5つです。'), said('Six.', '6つです。')],
  },
  {
    id: 'seven-eight-nine', topic: 'basics',
    title: '7・8・9',
    when: '"seven" は最初を強く。"eight" の最後の t は、ほとんど聞こえないよ。',
    hear: [HOW_MANY],
    say: [said('Seven.', '7つです。'), said('Eight.', '8つです。'), said('Nine.', '9つです。')],
  },
  {
    id: 'ten-eleven-twelve', topic: 'basics',
    title: '10・11・12',
    when: '12まで言えれば、「〜時」は全部言えるよ！',
    hear: [HOW_MANY],
    say: [said('Ten.', '10個です。'), said('Eleven.', '11個です。'), said('Twelve.', '12個です。')],
  },

  // ── The time.
  {
    id: 'what-time-is-it', topic: 'basics',
    title: '何時ですか？',
    cue: '今、何時か知りたい',
    when: '時間を聞くときはこれ。答えは "It\'s 〜." で返ってくるよ。',
    say: [said('What time|is it?@time', '今、何時ですか？')],
    then: [heard("It's@time|*three.", '3時だよ。')],
  },
  {
    id: 'what-time-do-you-start', topic: 'me',
    title: '何時から？',
    when: '"at 〜" は「〜時に」。仕事が始まる時間を答えよう。',
    hear: [heard('What time|do you@after|*start?', '何時に始まるの？')],
    say: [said('At|seven.', '7時です。')],
  },
  {
    id: 'see-you-at-eight', topic: 'home',
    title: '8時にね',
    when: '待ち合わせの時間を言われたら、数字を聞き取ろう。わかったら "OK!"',
    hear: [heard('See you|at|*eight!', '8時にね！')],
    say: [said('OK!', 'わかりました！')],
  },

  // ── The days of the week.
  {
    id: 'monday-to-wednesday', topic: 'basics',
    title: '月・火・水',
    when: '曜日は、予定の話でよく使うよ。最後の "day" は軽く言おう。',
    hear: [WHAT_DAY],
    say: [said('Monday.', '月曜日です。'), said('Tuesday.', '火曜日です。'), said('Wednesday.', '水曜日です。')],
  },
  {
    id: 'thursday-friday', topic: 'basics',
    title: '木・金',
    when: '"Thursday" の最初は、舌を軽くかんで「サー」。',
    hear: [WHAT_DAY],
    say: [said('Thursday.', '木曜日です。'), said('Friday.', '金曜日です。')],
  },
  {
    id: 'saturday-sunday', topic: 'basics',
    title: '土・日',
    when: '週末の2日。"Saturday" は「セァダデイ」のように聞こえるよ。',
    hear: [WHAT_DAY],
    say: [said('Saturday.', '土曜日です。'), said('Sunday.', '日曜日です。')],
  },
];
