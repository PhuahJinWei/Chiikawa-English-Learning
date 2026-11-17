/**
 * The order she learns the steps in: the learning path. The steps themselves are written in part1.ts to part7.ts,
 * grouped by when they were written; this list alone decides the order (2026-11-17, so introductions could move up
 * without moving any step between files). Two new steps a day by default, so each line below is about one day.
 *
 * Rules (tests/content.test.ts): every step is here exactly once; a step built from another (`from`) comes after it
 * and adds at most two word blocks she has not met before at that point.
 */
export const ORDER: readonly string[] = [
  // ── Days 1–2: the first words.
  'hi', 'sorry-what',
  'thank-you', 'are-you-ok',

  // ── Days 3–5: meeting people, early, since she greets new people from the start.
  'nice-to-meet-you', 'whats-your-name',
  'where-from', 'how-are-you',
  'what-do-you-do', 'do-you-speak-english',

  // ── Days 6–16: getting by as a guest.
  'bye', 'understand',
  'slowly', 'some-more',
  'good-morning', 'good-night',
  'im-from-japan', 'hi-nice-to-meet-you',
  'welcome', 'come',
  'have-you-eaten', 'like-it',
  'again', 'dont-know',
  'this-is-for-you', 'sit',
  'toilet', 'youre-welcome',
  'lets-eat', 'try-this',
  'name-and-you', 'ask-name',
  // Asking back, early (moved up from days 49 and 50 on 2026-11-17: these keep a conversation going).
  'how-about-you', 'ask-what-do-you-do',
  'im-a-teacher', // added 2026-11-17

  // ── Days 17–26: the rest of the first phrases (all in the app before part 2).
  'its-ok', 'wait',
  'dont-understand', 'good',
  'full', 'ready',
  'spicy', 'look',
  'wow', // added 2026-11-17
  'lets-go', 'tired',
  'next', 'auntie',
  'done', 'gochisousama',
  'listen', 'a-drink',
  'say-it', 'can-i-help',
  'can-i-take-a-picture', // added 2026-11-17
  'no-need', 'excuse-me',

  // ── Days 27–31: numbers, the time and the days, which the sentences about her work need.
  'one-two-three', 'four-five-six',
  'seven-eight-nine', 'ten-eleven-twelve',
  'what-time-is-it', 'what-time-do-you-start',
  'monday-to-wednesday', 'thursday-friday',
  'saturday-sunday', 'see-you-at-eight',

  // ── Days 32–39: about herself, built up a piece at a time.
  'start-at-seven', 'work-seven-to-four',
  'work-five-days', 'work-hours-and-days',
  'work-all', 'off-on-mondays',
  'off-mondays-and-fridays', 'work-saturdays-and-sundays', // more "and" (2026-11-17)
  'whats-your-hobby',
  'like-taking-pictures', 'like-both',
  'do-you-have-brothers', 'two-younger-brothers',
  'my-name-is', 'name-and-from-japan', 'bakery-and-drawing', // more "and" (2026-11-17)
  'where-do-you-live',
  'do-you-like-malaysia', 'how-was-your-trip',
  'first-time-in-malaysia', 'how-long-staying', // added 2026-11-17

  // ── Days 40–49: longer answers, built from the short ones.
  'nice-to-meet-you-too', 'and-you',
  'thank-you-so-much', 'im-ok',
  'one-more-time-please', 'i-understand',
  'no-thank-you-im-full', 'see-you-tomorrow',
  'good-night-see-you-tomorrow', 'its-delicious',
  'its-hot', 'its-cold', 'its-cute', 'its-beautiful', 'thats-nice', // added 2026-11-17
  'sorry-i-dont-know', 'thank-you-for-having-me',
  'from-japan', 'sorry-i-dont-understand',
  'im-full-thank-you', 'im-ready',
  'a-little-its-good', 'no-problem',

  // ── Days 50–57: food and feelings, and asking things herself.
  'what-do-you-want-to-eat', 'chicken-and-rice', // more "and" (2026-11-17)
  'can-i-have-this',
  'can-i-have-some-water', 'i-like-this',
  'too-spicy', 'im-hungry',
  'me-too', 'im-thirsty',
  'im-tired', 'im-happy', 'tired-and-hungry', // more "and" (2026-11-17)
  'ask-how-are-you', 'ask-like-it',
  'what-is-this', 'i-see', 'in-english', // added 2026-11-17
  'help-me',
  'lets-go-she', 'what-tomorrow',

  // ── Days 58–64: plans, what happened, and saying goodbye.
  'want-to-take-pictures', 'where-are-we-going',
  'tomorrow-the-beach', 'what-time-tomorrow',
  'what-did-you-do-today', 'went-to-the-beach',
  'took-pictures', 'beach-and-pictures', // more "and" (2026-11-17)
  'yesterday-went-shopping',
  'tomorrow-want-shopping', 'it-was-fun',
  'today-was-fun', 'been-to-japan',
  'twenty-thirty-forty', 'fifty-hundred', 'how-old', // added 2026-11-17
  'see-you-next-year', 'come-again-next-year',
];
