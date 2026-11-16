import { said } from './parse.ts';
import type { Line } from './types.ts';

/**
 * The app's own words, in both languages. Each switches from Japanese to English once she has learned the
 * exchanges in `needs` (src/learn/shift.ts). Only words already taught are ever shown in English, and every word
 * taught here is used somewhere in the app (REVIEW 2.6).
 */
export interface UiText {
  ja: string;
  line: Line;
  needs: string[];
}

const ui = (src: string, ja: string, needs: string[]): UiText => ({ ja, line: said(src, ja), needs });

export const UI = {
  /** Before a clip plays (Meet, Catch, Answer). */
  listen: ui('Listen.', '聞いてね', ['listen']),
  /** Her turn to repeat (Shadow, Answer). */
  sayIt: ui('Say it.', '言ってみて', ['say-it']),
  /** Her turn to answer (Answer). */
  yourTurn: ui('Your turn!', 'あなたの番！', ['say-it']),
  /** Restart buttons. */
  again: ui('One more time.', 'もう一回', ['again']),
  next: ui('Next!', '次へ', ['next']),
  /** Before the repetitions in Shadow: Hachiware asks, she answers with the button. */
  ready: ui('Ready?', '準備できた？', ['ready']),
  ok: ui('OK!', 'いいよ！', ['ready']),
  good: ui('Good!', 'いいね！', ['good']),
  great: ui('Great!', 'すごい！', ['good']),
  goodJob: ui('Good job!', 'よくできたね！', ['good']),
  /** End of the repetitions in Shadow. */
  done: ui('Done!', '終わり！', ['done']),
  allDone: ui('All|done!', '全部終わり！', ['done']),
  /** When a new phrase is shown in Meet. */
  look: ui('Look!', '見て！', ['look']),
  /** The quit question's buttons. */
  yes: ui('Yes.', 'はい', ['understand']),
  no: ui('No.', 'いいえ', ['understand']),
  /** The replay button: asking again IS the phrase she is learning. */
  sorry: ui('Sorry,|what?', 'もう一回聞く', ['sorry-what']),
  /** The end of the daily lesson is a little conversation: Hachiware hands over the stamp... */
  hereYouGo: ui('Here you go.', 'はい、どうぞ！', ['thank-you']),
  /** ...she thanks him... */
  thanks: ui('Thank you!', 'ありがとう！', ['thank-you']),
  /** ...he says goodbye... */
  seeYou: ui('See you!', 'またね！', ['bye']),
  /** ...and so does she (at night: Good night!). */
  bye: ui('Bye!', 'バイバイ！', ['bye']),
  night: ui('Good night!', 'おやすみなさい！', ['good-night']),
  /** Hachiware's greeting on the Today screen. Never "Good night!": that is only for parting (REVIEW 3.3). */
  hi: ui('Hi!', 'こんにちは！', ['hi']),
  /** The same "Hi!" in the evening, when a Japanese reader expects こんばんは. */
  evening: ui('Hi!', 'こんばんは！', ['hi']),
  morning: ui('Good morning!', 'おはよう！', ['good-morning']),
} satisfies Record<string, UiText>;

export type UiKey = keyof typeof UI;
