import { heard, said } from '../parse.ts';
import type { StepDef } from '../types.ts';

/**
 * Part 6 (written, approved and voiced 2026-11-17): more "and". She forgets it, and only four phrases had it ("And
 * you?" twice, "Mondays and Fridays", "drawing and taking pictures"). Each of these joins sentences she already knows,
 * so "and" is the one new piece: two things (〜と), or two sentences (〜て、そして: the "and@then" block).
 */
export const PART6: StepDef[] = [
  {
    id: 'chicken-and-rice', topic: 'table',
    from: 'what-do-you-want-to-eat',
    title: 'チキンとごはん',
    when: '"and" で、2つまとめて頼めるよ。',
    hear: [heard('What|do you@after|want to|*eat?', '何が食べたい？')],
    say: [said('Chicken|and|rice,|please.', 'チキンとごはんをお願いします。')],
  },
  {
    id: 'work-saturdays-and-sundays', topic: 'me',
    from: 'off-mondays-and-fridays',
    title: '土曜日と日曜日は仕事',
    cue: '週末も働いていることを伝えたい',
    when: '"off"（休み）を "work"（働く）に変えると、働く曜日も言えるよ。',
    say: [said('I|work|on Saturdays|and|Sundays.', '土曜日と日曜日は働いています。')],
  },
  {
    id: 'name-and-from-japan', topic: 'me',
    from: 'my-name-is',
    title: '名前と出身',
    cue: '自己紹介で、名前と出身を続けて言いたい',
    when: '2つの文を "and" でつなぐと、自己紹介が1回で言えるよ。',
    say: [said("My name is|Yuki,|and@then|I'm|from|Japan.", '私の名前はユキで、日本から来ました。')],
  },
  {
    id: 'bakery-and-drawing', topic: 'me',
    from: 'what-do-you-do',
    title: '仕事と趣味',
    cue: '自己紹介で、仕事と好きなことを続けて言いたい',
    when: '仕事と趣味も "and" でつなげられるよ。',
    say: [said('I|work|at a bakery,|and@then|I|like|drawing.', 'パン屋で働いていて、絵を描くのが好きです。')],
  },
  {
    id: 'tired-and-hungry', topic: 'feelings',
    from: 'im-tired',
    title: '疲れたし、お腹もすいた',
    cue: 'たくさん歩いて、疲れたしお腹もすいた…',
    when: '"I\'m tired." と "I\'m hungry." を "and" で1つにすると、"I\'m" は1回でいいよ。',
    say: [said("I'm|tired|and@then|hungry.", '疲れたし、お腹もすきました。')],
    scene: { heard: [{ who: 'chiikawa', face: 'worried' }], replies: [[{ who: 'chiikawa', gesture: 'sit', face: 'teary' }]] },
  },
  {
    id: 'beach-and-pictures', topic: 'chat',
    from: 'went-to-the-beach',
    title: 'ビーチで写真を撮った',
    when: 'したことを2つ "and" でつなぐと、"I" は1回でいいよ。',
    hear: [heard('What|did you|do|*today?', '今日は何をしたの？')],
    say: [said('I|went|to@place|the beach|and@then|took|pictures.', 'ビーチに行って、写真を撮りました。')],
  },
];
