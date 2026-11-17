# えいごフレンズ

A private English-speaking trainer for one Japanese learner, taught by the friends from the Chiikawa RPG models.
Listening and speaking only; the plan and the reasoning behind it are in [PLAN.md](PLAN.md).

The review of the first version and what has been fixed since are in [REVIEW.md](REVIEW.md).

**On the web:** https://phuahjinwei.github.io/Chiikawa-English-Learning/, published from `main` by GitHub Actions
(one-time setup on GitHub: Settings → Pages → Build and deployment → Source: "GitHub Actions").

Not affiliated with or endorsed by the Chiikawa rights holders. Non-commercial, made for one person.

## Run it

```bash
npm install
npm run dev          # http://localhost:5180
```

Development-only pages: `/review.html` (every line and block to listen to, with readings, meanings, phonemes and
pitch; the rows at the top are the readings to settle by ear), `/stage-test.html` (every friend, gesture, face and
mark), `/icon-maker.html` (makes the icons from `art/portrait_hoshi.png` into `public/icons/`). Add `?as=ios` or
`?as=line` to the app's address to see the install guide as an iPhone or LINE user would.

## Check and build

How much to check (about 40 seconds in all): after every change, `npm test` and `npm run check` (about 10 s);
before pushing, `npm run build` and `npm run smoke` as well.

```bash
npm run build        # type check (0 warnings allowed) + tests + production build with the offline service worker
npm run preview      # serve the build at http://localhost:4173
```

Smoke tests in WebKit, Safari's engine (after `npm run build`; the first two lines once, about 180 MB for WebKit):

```bash
cd tools/smoke && npm install && npx playwright install webkit && cd ../..
npm run smoke        # serves dist/ under /eigo-friends/ and checks start-up, lesson, backup, offline, sideways, start-up panel, and that Today and the tour fit the home-screen app
```

WebKit on Windows has no Web Audio and cannot play MP3, so sound itself is only reported there ("info"), never
tested. Sound on her iPhone is the self-check's job (Settings → 動作チェック → 結果を送る).

## Reviewing the content

Open **`content-sheet.html`** (double-click it): every step of the learning path in teaching order, with what she
hears, what she says, what she hears back, the step it is built from, the words that are new, and the Japanese. Filter
to **Drafts** to see what is waiting for you, and give feedback by the **#** number. Below the path, the short
conversations (**C1**, **C2**, ...) show each line and which steps it needs. `content-sheet.csv` is the same
table for Excel. Both are made from `src/content`, so don't edit them: run `npm run sheet` after any content change
(a test fails while they are out of date).

## Adding content

The course is one path. The steps are written in `src/content/course/part1.ts` to `part7.ts`; the order she learns
them in is the list in `src/content/course/order.ts` (two new steps a day by default, and more with もっと覚える after the lesson), and a new step goes in that
list too (a test fails if a step is missing from it or named twice). Each step is one thing she learns: `hear` + `say` (she answers), `say` alone with a `cue` (she starts; `then` is what she may hear back), or
`hear` alone (she only understands). `from` names the earlier step it is built from: the test then checks it reuses
that step's words and brings at most two new word blocks. `topic` puts it on a notebook shelf and decides which friend
acts on stage (`src/content/topics.ts`); only Hachiware talks. Replies to the same line in other steps, and replies
like "OK!" or "Yes.", are never offered as wrong answers; add `fits` only for other replies that also fit.

1. Write the step with `status: 'draft'`. New words go in `src/content/blocks.ts`; then run
   `node tools/audio/phonemes.mjs` (a few seconds, no audio) so the readings can be checked against what the voice
   will say.
2. `npm test` and `npm run sheet`, then review in the sheet. Drafts are never taught and never get audio.
3. Once the content is decided: change `draft` to `approved`, and only then make the audio (one voice, Heart, on
   this PC; nothing online), then remove the status:
   ```bash
   cd tools/audio && npm install && node make-audio.mjs
   ```
   The app teaches a step once it has no draft status and every line has its audio. Listen on `/review.html`.
4. Push to `main`. GitHub Actions builds and publishes; the phone picks up the new version the next time it opens
   online.

## Giving her notes the Heart voice

Her notes (ノート → メモ) play in Heart when their English matches a lesson line; anything else is read by the
iPhone's own English voice until you voice it. (Every note gets a katakana reading on the phone, with nothing to do on
your side: `src/app/reading.ts`.)

1. Ask her which English in her notes she wants in the lessons' voice (in the app, ▶ 聞く on a note says
   「iPhoneの声」 when it has no Heart clip yet).
2. Add those lines to `NOTE_CLIPS` in `src/content/notes.ts`, exactly as they should be spoken.
3. Generate the audio: `cd tools/audio && node make-audio.mjs`.
4. Push to `main`. After the update, those notes play in Heart.

## Where things are

| Path | What |
| --- | --- |
| `content-sheet.html`, `.csv` | The content for review (made by `npm run sheet`; don't edit) |
| `src/content/` | The learning path (`course/`), short conversations made of its lines (`talks.ts`), word blocks with readings (`blocks.ts`) and the voice's phonemes for them (`phonemes.json`), topics, the app's own words (Japanese and English), the English you voiced from her notes (`notes.ts`); `index.ts` turns the path into what the app uses |
| `src/learn/` | Review schedule, daily lesson builder, practice, saved progress (including the lesson in progress and her notes), notes, backups, the Japanese → English shift, sound-alike wrong choices for the listening quiz (`contrast.ts`), katakana readings from the voice's sounds (`reading.ts`), her study partner of the day (`partners.ts`) |
| `src/app/` | Screens (Svelte): Today, Notebook, Practice, Settings, Backup and the lesson (Meet, Catch, Answer, Talk, Finish); sound with two ways of playing and self-recovery (`audio.svelte.ts`), pause and tap priority (`script.svelte.ts`); screen wake lock; errors (`errors.ts`); updates and offline status (`updates.ts`); readings for her notes, with the pronunciation engine loaded when a note needs it (`reading.ts`); install guide, self-check, first-run tour |
| `src/stage/` | The 3D friends, copied from the Chiikawa RPG (`rpg/`) behind a small interface (`types.ts`), and the meadow they stand in (`Backdrop.ts`) |
| `public/audio/` | Generated English clips: one per line and per block, Heart voice, natural speed only |
| `art/` | Source art: the star portrait the icons are made from |
| `tools/audio/` | The audio generator (Kokoro, runs locally); `phonemes.mjs` writes the phonemes the readings are checked against, without audio; `say-as.mjs` respells words the voice misreads; `pitch.mjs` measures each clip's pitch for the review page |
| `tools/sheet/` | Makes the content sheet |
| `tools/sketch/` | Draws the hand-drawn outlines into `src/app/sketch.css` (don't edit that file: change the tool, then `npm run sketch`; a test fails while it is out of date) |
| `tools/build/` | Service worker (content versions; unchanged files are reused on update) and dev-only save helper |
| `tools/smoke/` | WebKit smoke tests (Playwright, its own install) |
| `tests/` | Unit tests: content rules (how steps link up, highlights, quiz meanings, readings, audio), the content sheet, the hand-drawn outlines, schedule and lessons, lesson bookkeeping, conversations, sound recovery, backups, note readings (held to the hand-made ones) |

## Licence

えいごフレンズ is free software under the GNU General Public License, version 3 or later (GPL-3.0-or-later): see
[LICENSE](LICENSE). Anyone may use, share and change it under that licence, which comes with no warranty. The app says
so at the bottom of 設定, with a link to this repository. Chiikawa and its characters belong to their creator, ナガノ
(Nagano), and are not covered by the licence.

## Third-party code

What the published app contains besides its own code:

| Code | Licence | Where |
| --- | --- | --- |
| three.js | MIT | the 3D friends |
| Svelte | MIT | the screens (compiled into the app) |
| phonemizer.js (Xenova) | Apache-2.0 | note readings: loaded only when a note needs one (`src/app/reading.ts`) |
| eSpeak NG, inside phonemizer.js | GPL-3.0-or-later | the same |

eSpeak NG is the pronunciation engine for note readings. It is under GPL-3.0-or-later, which is why the app is too: a
program that includes GPL code is shared under the GPL, with its source. Its source is at
https://github.com/espeak-ng/espeak-ng, and the build the app uses at https://github.com/xenova/phonemizer.js. The
Heart voice (Kokoro) is used only on your PC to make the audio files; it is not part of the app.
