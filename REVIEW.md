# えいごフレンズ: review of the first version

Reviewed 2026-11-16, before anything was committed or published. Nothing in the app was changed by this review.

**How it was done.** Four passes: my own walkthrough of the running app at phone size, and three independent reviews (app logic, iPhone behaviour, teaching and Japanese). I re-checked each reviewer's main claims against the code before listing them here.

**Labels.** *Confirmed* means seen by running the app or the code. *Predicted* means expected on an iPhone from documented Safari behaviour, which nobody can confirm until it runs on one.

## Review of the audit's fixes (2026-11-18)

A review of the code audit's own changes (below) found 15 problems. All are fixed:

- **A missed quiz could still be forgotten, or marked on the wrong quiz.** The lesson screen kept misses by the step's place, outside the saved lesson. So 今日はここまでにする then 続きから forgot a miss. もう知ってる on an earlier phrase moved it onto another quiz, which was then graded wrong though she answered it right (a review went back to box 1). A restart also noted whichever line the new try played, not the one she missed. Now a miss is recorded the moment it happens, with the line she heard, in the saved lesson (run.ts, missStep).
- **Auto-next stopped** when a clip she had started before answering was still playing. Only a clip she starts after answering holds the step now.
- **もう一度読み込む** missed a fixed version the phone was already downloading, and cut a slow download off after 4 seconds; either way it reloaded into the broken version. It made her wait 4 seconds with no sign of anything happening even when there was nothing newer, and it could reload the app after it had started. Now it waits for the download (20 seconds at most), reloads at once when there is nothing newer, shows 読み込み中…, and leaves a started app alone. In WebKit with the real service worker, a fix still downloading when she tapped now loads 2 seconds after the tap; nothing newer reloads in 0.4 seconds (was 4). The take-over message is defined once (src/worker-message.ts), and tests check that the panel sends it and the worker obeys it.
- **Backups:**
  - **Her own fullest backup was refused.** The 4 MB limit was smaller than a record the app lets her keep: about 5 MB with every note full. The limit is now worked out from the note limits (about 6 MB).
  - **Safari unpacked a pasted text whole before checking its size.** It is now read in 1 KB pieces; in WebKit, peak memory rose 11 MB instead of about 190.
  - **The unfinished lesson inside a backup had no limits.** A hand-made one could freeze the paste box for seconds. It is now limited and read in one pass.
  - **The size test could not fail.** It can now.
- **A restore or fresh start that could not be saved** left the app running on the unsaved record, and showed the failure in the green box that means success. Now nothing changes unless it is saved, and a failure shows in the warning colour.
- **The publish workflow:** REVIEW's fallback advice below could not have worked, because a job's own permissions replace the ones at the top. The build job's own block is gone, and so is the configure-pages step (nothing used its result), so the build job can only read the code.
- Smaller: a condition in finishStep that could never be false, and half a test that checked nothing.

**Checked:** 15 new tests (142 in all); type check, build, WebKit smoke test; the backup and the start-up panel also in WebKit as above. Not yet on an iPhone.

## Code audit (2026-11-17)

Mechanical checks (dependency audit, a search for code-injection patterns and unused code) and two independent reads: the lesson logic and saved data, and security, privacy and offline code. Clean: no known vulnerabilities, nothing pasted or restored can run as code, nothing leaves the phone, no secrets in the repo. Ten defects were found and fixed:

1. **A broken release could not fix itself:** the start-up panel's もう一度読み込む only reloaded the same version, while a fixed one waited to be told to take over by an app that had not started. The button now asks for a newer version, tells a waiting or arriving one to take over, and reloads when it has (reworked 2026-11-18, above). Not tried against a real broken release.
2. **A miss in a quiz could be erased** by restarting the step or going back and forward: the next try counted as a first try. The lesson now remembers which quiz steps she missed (since 2026-11-18 in the saved lesson, above).
3. **Reviews due on the same day had no fixed order:** the sort's tie-break contradicted itself, so the order, and which 30 of more than 30 survived, depended on the browser (25 listening and 5 speaking in one test). Now oldest first, then path order, a phrase's two steps together.
4. **Marking every new phrase もう知ってる earned no stamp,** and Today offered a second lesson. It counts as an answer now.
5. **Retries came after the closing conversation.** They go before it.
6. **The quiz's auto-next cut her off** when she tapped ▶ or a word to hear it again after answering. Her tap now holds the step until 次へ.
7. **もっと覚える after 4 a.m.** started a round that took the new day's stamp and left its reviews out of reach. It now starts that day's lesson.
8. **Restore trusted its input too much:** a backup could unpack to hundreds of megabytes (now refused above a limit; changed 2026-11-18, above), and a hand-edited one could hold numbers the schedule cannot use, or bloat storage (fractions, infinities, text where numbers belong, endless tables: now rounded, bounded or dropped). A restore that could not be saved no longer says 「記録を戻しました！」 (and since 2026-11-18 changes nothing).
9. **A save in a format this version does not know** was replaced by an empty one at the next save. It is now kept aside first, like an unreadable save.
10. **The publish workflow** gave the job that installs dependencies the right to publish. Only the deploy job has it now. The first push after this will show whether GitHub accepts the narrower permissions. If a job fails for lack of a permission, add the one it names to that job's own `permissions:`; a job's own list replaces the one at the top. (The advice here until 2026-11-18, to restore the lines at the top, would not have helped.)

One unused function (sameSentence) was removed. Not code: your email is in every commit, the learner's job, hours and family are in public content, and in Safari (not the installed app) other sites published under the same GitHub Pages account share its storage.

**Checked:** 5 new tests (tests/audit.test.ts), 127 in all; type check, build, WebKit smoke test.

## Buttons: size and place (2026-11-17)

About 150 buttons on 22 screens were measured at both home-screen sizes.

- **Nothing under 44px:** in 設定, 1 / 2 / 3 went from 42×36 to 52×44 and 標準 / 予備 to 44px tall; the notebook's ▶ from 40 to 44px, with 8px between it and the row (was 2px, so a tap could open the phrase instead of playing it); the notebook's two tabs from 42 to 46px; in the memo editor the ✕ beside another meaning and 「＋ ほかの意味を追加」 to 44px; the licence link has a 44px tap area. Only a one-word block ("Hi", 42px wide) is narrower, as wide as its word.
- **The lesson's bottom buttons are one height, 64px:** 答え合わせ was 60px, the three ratings 56px, the stamp's buttons 64px, and "Next!" with its reading and Japanese 76px, so the row jumped by up to 16px between steps.
- **The memo's bin is in the header,** beside ✕ with 18px between them, not next to 保存する: it deletes at once (with 元に戻す), so it should not sit by the button she taps most.
- **Checked:** every button measured again on both sizes, screenshots, type check, 122 tests, build, WebKit smoke test.

## Which stage she is in (2026-11-17)

You found it hard to tell which stage of a lesson you were in. The name was 15px brown text with a small icon, the same for every stage, and nothing marked a change.

- **A coloured label:** the stage's name and icon are a pill in the stage's own colour: yellow for 新しいフレーズ, blue for 聞き取りクイズ, green for 答えてみよう and 言ってみよう, cream for 会話してみよう. The progress bar fills in the same colour.
- **A pop on a change:** when the stage's name changes from the step before, the pill pops once (not with Reduce Motion).
- **Hachiware says it:** on a change he names the stage first and leaves a moment to read it: 「次は聞き取りクイズ。「相手」の英語だよ」, 「次は、声に出して答えよう。「相手」が話しかけてくるよ」, 「次は、自分から言ってみよう。こんなとき、何て言う？」. A new phrase and a conversation already open by naming themselves. The same stage again keeps his short line.
- **Checked:** a six-step lesson through every stage, captured in Edge at iPhone 13 size; type check, 122 tests, build, WebKit smoke test.

## Recording her own voice: removed (2026-11-17)

You asked to remove 自分の声を録音する completely: she should not have to record herself. The buttons in 答えてみよう and in conversations are gone, with the recorder's code; the app never asks for the microphone. The sections below that describe recording (added earlier the same day) are history.

## A lesson with less tapping and a better order (2026-11-17)

You found yourself tapping 次へ too often, even after a right answer. A day-31 lesson counted 68 taps if she gets everything right, 15 of them 次へ after a right quiz answer, and about 100 seconds of built-in pauses.

- **The quiz goes on by itself:** right the first time, it shows the English and its meaning for about a second (after a reply quiz, until the right reply has played), then moves to the next step. After a miss it waits for 次へ, since that is when she needs to look. ← 前へ and ⏸ work as before, and 設定 has 「クイズに正解したら自動で次へ」 to turn it off.
- **Shorter pauses:** a clip starts 0.4 s after a step opens (was 1 s), and the 言えた / 迷った / 言えなかった buttons work 0.7 s after the model has played (was 2.2 s). About 40 seconds less waiting in a lesson.
- **Reviews are mixed:** listening and speaking alternate where both are due, instead of every quiz and then every speaking step, and a phrase's two steps are a whole pass apart.
- **New phrases come early:** after a warm-up of 5 reviews, not after all of them. Their quizzes come a third of the way through the remaining reviews and their speaking steps two thirds through, so each is checked a while after it was taught.
- **The conversation is last:** it closes the lesson, after any extra practice.
- **Kept:** 次へ in 新しいフレーズ (she studies there at her own pace), 答え合わせ and the rating (the phone cannot tell when she has finished speaking), 続ける in conversations, and "Thank you!" and "Bye!" at the stamp.
- **Checked:** two new tests for the order; in Edge, a quiz answered right the first time went on by itself after 1.2 s, one with a miss waited, and with the setting off both waited; type check, 122 tests, build, WebKit smoke test.

## Design pass: five fixes (2026-11-17)

From a look at every screen at iPhone 13 size, with the colours' contrast measured.

- **The reply quiz fits:** in 「こう聞かれたら、何て答える？」 the ♪ card is one slim row (the 相手 label with the ♪ marks beside it), so the three replies show whole under it. Before, the card slid under the bubble and the third reply was cut, on an iPhone 13 too. Conversations use the same slim row for a line she is about to answer.
- **No stray line on list pages:** ノート, 練習 and 設定 showed a short brown curve at both top corners. The build's minifier turned `border-image: none` into an empty value, which browsers ignore; the frame is now taken off through its variable.
- **Small text is darker:** the secondary brown went from #8a6a55 to #785946, so it measures 5.2:1 on the yellow buttons (was 4.0) and 5.6 to 6.3 elsewhere. The stamp's day letters and number are #c8405e (4.8:1, was 3.4), and 完了 ✓ is #347a31 (5.3:1).
- **Today's additions are drawn like the rest:** the memo and phrase menus have the panel's hand-drawn top edge, the 元に戻す note is a white sticker, and the search box's ✕, the ✕ beside another meaning and 「＋ ほかの意味を追加」 have drawn outlines.
- **Pink means one thing:** pink stays the model answer's colour. What went wrong or takes something away (a wrong choice, 言えなかった, delete, 練習をやめる, warnings, recording) is a warm peach, #ffd2c2.
- **Checked:** the same screens captured again, the seven conveniences walked again, type check, tests, build and the WebKit smoke test (36 of 36 on its own; run straight after the long captures, its browser crashed in one check, as once before).

## Seven more conveniences (2026-11-17)

From a look for what was still missing; you chose all seven.

- **Search in the notebook:** a box under the two tabs finds learned phrases (title, English or Japanese, including other phrasings and replies) and memos (English, Japanese, other meanings).
- **Choosing a conversation:** 練習 → 会話 now opens a list: おまかせ (three she has not done for a while, as before) or any one conversation she is ready for.
- **Practising one topic:** 練習 → テーマで選ぶ lists the topics she has learned phrases in; one tap practises 8 of that topic's phrases.
- **Undo after deleting a memo:** deleting (the memo's menu, or the bin in the editor) no longer asks first. A dark note 「メモを削除しました　元に戻す」 stays for 6 seconds and puts the memo back where it was.
- **Recording in conversations:** on her turn in 会話してみよう, the same 「自分の声を録音する」 as in 答えてみよう; after 答え合わせ, 「自分の声を聞く」.
- **A memo from a lesson:** the ⏸ menu has 「このフレーズをメモに追加」 for the phrase of the current step.
- **Hold a learned phrase:** a menu with ▶ 聞く, 練習する, メモに追加, 詳しく見る, as memos have.
- **Checked:** all seven walked in Edge at iPhone SE size with a day-31 profile and a pretend microphone; type check, tests, build, WebKit smoke test (its memo check now deletes, undoes, and deletes again). Not tried on a real iPhone.

## Memos: lighter hint, more meanings, a menu, and a delete that sticks (2026-11-17)

Five things you asked for, and one bug found on the way.

- **Empty boxes look empty:** the hint text in a memo's boxes is thin and pale instead of bold and dark.
- **Other meanings:** under メモ（日本語）, 「＋ ほかの意味を追加」 adds a box for another meaning (up to 5, each with ✕ to remove it). The list shows them numbered 2, 3, … under the first. They are kept in backups; empty boxes are not saved.
- **Deleting from the editor:** a bin button now sits beside 保存する. No scrolling. (It first asked in that same row; later the same day the question was replaced by 元に戻す, see above.)
- **A menu on each memo:** ⋯ at the right of a memo, or holding the memo for half a second, opens 書き直す, ▶ 聞く, メモを削除 (asks once) and 閉じる. A short tap still opens the editor.
- **メモを送る is gone,** with its code and test. The README's steps for voicing a note no longer rely on it.
- **Bug fixed: a memo deleted in the editor came back** the next time the app opened. The closing editor saved once more and wrote the note back. It was there before today's changes; the smoke test now checks that a deleted memo is gone from what is saved.
- **Checked:** walked in Edge at iPhone SE size (new memo, extra meanings saved, both ways of deleting, hold and tap), type check, tests, build, WebKit smoke test. Holding a memo on a real iPhone is not tried.

## The rest of the list: drafts, earlier questions, her own voice (2026-11-17)

You said to go ahead with everything left from the whole-app review.

- **12 new phrases** (drafted, then approved by you the same day; voiced and in the app):
  - Reactions: "Wow!" (to "Look!"), "I see." (to "It's chicken."), "That's nice!". "Really?" is left out: the voice never rises on a question, and "Really." said flat sounds doubtful.
  - Describing things, each "It's good!" with one word changed: "It's hot!", "It's cold!", "It's cute!", "It's beautiful!".
  - For learning and her hobby: "What is this in English?", and "Can I take a picture?" with "Sure!" back.
  - What she may hear when she asks "What do you do?": "I'm a teacher." / "I work at a bank." (to understand only). Once approved, a conversation can use her question.
  - The tens, for ages and prices: "Twenty. / Thirty. / Forty." and "Fifty. / A hundred.".
- **3 more drafts, with the facts you gave** (her second visit, one week, and 25 as a placeholder age for privacy, to be swapped for her own like the name Yuki): "Is this your first time in Malaysia?" → "My second time."; "How long are you staying?" → "One week."; "How old are you?" → "I'm twenty-five.". All 15 were approved, voiced (40 new clips) and put in the app; the path is now 149 steps.
- **Asking back comes early:** "How about you?" and "What do you do?" moved from about days 49 and 50 to day 17, right after "What's your name?". No audio changed.
- **"And" in conversations:** C15 自己紹介 now has "My name is Yuki, and I'm from Japan.", and C27 今日あったこと has "I went to the beach and took pictures." (both lines already had audio).
- **Her own voice:** in 答えてみよう there is a small 「自分の声を録音する」 button. Only if she taps it, the iPhone asks for the microphone; her answer is recorded until 答え合わせ (20 seconds at most), and after the model has played, 「自分の声を聞く」 plays it back beside the model's ▶. The recording is kept in memory for that step only, never saved or sent. The microphone is released before the model plays. Checked in Edge with a pretend microphone at both phone sizes (record, play back, a clean next step). **Not tried on a real iPhone**, where the microphone is the risky part: if sound turns quiet or moves to the earpiece after recording, tell me.
- **Checked:** type check, 120 tests, build, and the WebKit smoke test.

## More "and": 6 new phrases (2026-11-17)

You said she often forgets "and". Only 4 of the 128 phrases had it, and two of those are the fixed "And you?".

- **6 drafts**, #70, #77, #78, #103, #113 and #127 in the content sheet (Status: Draft). Each joins sentences she already knows and comes right after what it builds on, so "and" is the one new piece:
  - Two things, like 〜と: "I work on Saturdays and Sundays." (#70, after "I'm off on Mondays and Fridays."), and "Chicken and rice, please." (#103, answering "What do you want to eat?").
  - Two sentences, like 〜て or そして: "My name is Yuki, and I'm from Japan." (#77), "I work at a bakery, and I like drawing." (#78), "I'm tired and hungry." (#113), and "I went to the beach and took pictures." (#127, answering "What did you do today?").
- **New word blocks:** rice, on Saturdays, Sundays, and a second meaning of "and" (〜て／そして) for joining sentences, so tapping "and" in those four shows that meaning. Their readings were checked against the voice's phonemes; no audio was made.
- **In the listening quiz,** a shorter phrase she knows, such as "I'm tired.", can come up as the wrong meaning, so she has to catch the "and" part.
- **Approved the same day, voiced (9 new clips) and in the app.** The steps after #69 moved down in the numbering, because the new ones sit between them.
- **Checked:** tests (120 of 120: the path, the built-from rule, readings, highlights) and the type check; the sheet was regenerated.

## Lesson cards on small iPhones (2026-11-17)

You asked me to fix cards sliding under Hachiware's bubble in lessons. I walked two lessons at both home-screen sizes and measured every moment of every step: a first lesson, and one with the tallest cards (the longest lines she hears and says, quizzes answered with long replies, a new phrase with three phrasings and two replies, a long conversation).

- **What was wrong:** it was not only a few pixels on an SE. Of 263 moments on an SE, 105 hid the top of a card by more than the 12px fade at the top of the page, 88 of them outside conversations, and 4 at the end of a quiz or step, the screen she looks at before 次へ. On an iPhone 13: 48 of 231, 32 outside conversations, 2 at an end. The worst was a "what would you answer?" quiz once answered: the question card stayed mostly hidden, because the page kept the place it had scrolled to for the choices.
- **When cards go away** (a quiz's choices, once it is answered), the page now scrolls back to its first card.
- **A "what would you answer?" quiz, once answered,** shows its question in one row, so the right answer shows whole under it, as 答えてみよう does after 答え合わせ.
- **On short screens** (under 700px tall, such as an SE's home-screen app) the friends' strip in lessons is 20% of the screen instead of 24%: 129px instead of 155px on an SE, which gives the cards 26px more.
- **After:** no quiz or step ends with a card half hidden on either phone. Moments with a card's top hidden, outside conversations: SE 88 to 31, iPhone 13 32 to 9. What is left is scrolling by design: while she chooses among long replies, the page shows the choices and the replay button, so the question card (still only ♪ ♪ ♪) scrolls up, on an SE out of sight; and when the model of her longest sentence ("I work at a bakery from seven to four, five days a week.") appears, its situation card scrolls up. Conversations scroll up like a chat, as before.
- **Checked:** the same two lessons walked again in Edge at both sizes (WebKit on this PC has no sound, so its lessons stop at 「音が出なかったみたい」 and cannot be walked), the type check, 120 tests, and the WebKit smoke test (36 of 36). Not checked on a real iPhone.

## 18 more conversations, C12 to C29 (2026-11-17)

You said "Yes, draft them". The 11 conversations in the app used only phrases #1 to #51, so nothing she learns from about day 26 on came up in one.

- **18 conversations, C12 to C29**, at the end of the content sheet's conversation table. You approved all of them the same day, and they are in the app: each comes up once she has learned the phrases it uses, like the first 11. They needed no new audio: every line already had its clip.
- **What they cover:** 44 of the 77 phrases from #52 on, mostly as her own small talk: her work (C13), hobbies and brothers (C14), introducing herself (C15), arriving with a gift (C16), asking again (C17), food (C18, C19, C22), feelings (C20), greeting Uncle and asking back (C21), helping (C23), going out and plans (C24, C25), a present (C26), the day's news and good night (C27), Japan (C28), and the day she leaves (C29).
- **Not in any conversation yet:** numbers, the time and the days as answers (#53 to #62), the in-between sentences that build up to her longer ones (#64, #66 to #68, #70, #71, #73), and #80, #81, #86, #88, #89, #93, #104, #105, #114, #119 and #123.
- **Would need a new line:** "What do you do?" asked back (#98) has no answer with audio. A conversation with it needs the other person's answer, for example "I'm a teacher.", which would need audio once you approve it.
- **Three lines have their own Japanese here,** because their step's does not fit the moment: a waiter's "This way!" is こちらです。 (C12); on the day she leaves, "Thank you for having me!" is お世話になりました！ and the family's "Welcome!" is どういたしまして！ (C29, as in C9).
- **Checked:** every line is found in its step and said by the right person, all 29 conversations are in the order they become ready and in the app (tests, 120 of 120), and C29's lines show the Japanese written for them. The sheet was regenerated.

## Fit on the home-screen app, and the pace of new phrases (2026-11-17)

You chose these two from the fresh look at the whole app.

**Fit.** Screens had been checked at the screen's full height (844px on an iPhone 13, 667px on an SE). The home-screen app is shorter, because the status bar takes its share, and on an iPhone 13 the home bar takes 34px more at the bottom: 390×797 and 375×647. At those sizes Today's stamps were cut off on both phones, and the tour's 次へ was below the screen on an SE.

- **Today:** the friends' scene now gives up exactly the room the cards below lack, so the cards and the button always show whole, whatever the day holds and whatever the phone and its fonts. It never grows past its usual size (44% of the screen) and never shrinks under 210px. Below that the cards would scroll, but no Today screen needs that on these two phones. On an iPhone 13 the scene keeps its full size (351px) except on a reminder day (about 340px); on an SE it is about 225 to 265px.
- **Tighter cards:** the compact spacing that only an SE had is now used up to 820px tall, which covers the home-screen app of every iPhone but the Plus and Max sizes. Today's counts (新しいフレーズ 2　復習 19問　練習 5問　会話 1) fit on one line, and when they do not, the line breaks between counts, never inside one.
- **Backup reminder:** it was a card of its own, so on reminder days it went below the screen. Now Hachiware says 「おつかれさま！記録をバックアップしよう。」, and the lesson card shows 記録のバックアップ（前回から1週間） with あとで and 保存する in place of the next phrases, which come back after either. The longer explanation is on the backup page.
- **Tour:** its buttons stay at the bottom and only the card can scroll; on these phones each page fits without scrolling. Page 2's last line is shorter: 「覚えたフレーズで「会話してみよう」もします。やめたいときは⏸を押してください。」
- **Checked:** the WebKit smoke test now also opens the app at both home-screen sizes, with the home bar's safe area: every tour page, the first Today, and three Today screens from a month of lessons made by the app's own lesson code (a normal day, after today's lesson, and a reminder day). 36 of 36 pass. In Safari before installing, an SE's page is only 548px tall, and there Today scrolls by about 50px.

**Pace.** A lesson taught the set number of new phrases (2) only while fewer than 14 reviews were due, then 1, and none from 24. That happened from about day 9, and the minutes it saved went to practice that does not move the schedule. Now a lesson teaches its new phrases as long as the reviews, any conversation and the new phrases fit in about ten minutes, and none while more reviews are due than one lesson holds (30). Lessons stay about 9 to 10 minutes. With the app's own lesson code over 200 days:

| A learner who does every daily lesson | All 128 phrases met, before | After |
|---|---|---|
| Gets 85% of reviews right | day 105 | day 71 |
| Gets 70% right | day 164 | day 104 |
| Gets 97% right | about day 92 | day 64 |
| 3 new phrases a day, 85% right | day 93 | day 61 |
| 1 new phrase a day | day 129 | day 128 |

The 70% learner's lessons average about 10.4 minutes, as before, because missed questions come back at the end. もっと覚える is unchanged.

## The stage's framing, small moments, and the quiz's wrong answers (2026-11-17)

You asked whether the friends should walk around, and whether the zoom was right.

- **Framing:** the stage now knows what the app lays over it (the greeting bubble over its top, the panel's rounded edge over its bottom) and frames the friends in the part left showing.
  - **Today:** their faces never go under the greeting. At most the top quarter of the tallest friend (ears, Hachiware's hat) may tuck under a tall bubble on a small iPhone, and their feet now show above the panel with a little ground.
  - **Lessons:** a closer shot. Up to a fifth of them goes under the panel's edge, so their faces show about 27% bigger. My first estimate (a third bigger, from the empty sky over them) was wrong: most of that sky is room the ! and ? marks need, 0.4 m above their heads, so it stays. With three friends the group's width already sets their size, and then the shot is not cropped.
  - **The celebration** at the end of a lesson shows them whole, as Today does. The self-check page's strip uses the closer shot.
- **Small moments on Today:** every 15 to 25 seconds, one of these: they look at each other, her partner hops, Hachiware waves, her partner sits for a while, has a snack at lunchtime (11:00 to 14:00), or naps late in the evening (after 21:00, eyes shut, zzz). Nothing with Reduce Motion on, and not under the first-run tour. They stay where they stand: walking about would keep the stage drawing at full speed (it slows to 20 frames a second when still, to save battery) and take them under the bubble. In lessons they stay still, since their reactions are her feedback.
- **A new friend walks in:** on a friend's first day as her partner (うさぎ at level 2, モモンガ at level 3), they walk in from the edge of the stage instead of popping in, then get their heart.
- **The quiz's wrong answers:** they came from the phrases she had learned, then from anywhere in the course, so a beginner could get "I have two younger brothers." as a wrong reply to "Thank you!". Now, once the phrases she knows run out, they come from the next 8 phrases in her path, so they are at her level. The same quiz now offers "Hi!", "Thank you!" and "Bye!".
- **Checked:** Today on an iPhone SE and 13 (with a four-line greeting), a lesson with two and with three friends, the self-check strip, sitting, eating and napping, Usagi walking in on her first day, and the quiz with a beginner's progress; tests (119, two new), type check, build, and the WebKit smoke test (28 of 28). Not checked on a real iPhone.

## Polish: notes (メモ) and the phrase sheet (2026-11-17)

You asked whether the notes and memo screens look good. The phrase list and sheet did; the memo list was the weakest screen. This pass changes only how they look.

- **Memo list:** a note is short in the list: at most two lines of English, two of its reading (smaller and lighter now), then two of her own Japanese, which is darker and has room between its lines, since it is what she scans for. The editor still shows everything. A question with no English yet shows 「英語で何て言う？」 as a small tag above her question in bold.
- **Which voice reads a note** is said once in the memo shelf's intro (「レッスンにない英語は、iPhoneの声で読みます」), not by a tiny 「iPhoneの声」 tag on every note.
- **Memo editor:** the 聞く button says which voice it will use (iPhoneの声 or レッスンの声), so the loose line under the reading is gone. Deleting is a quiet link with a bin icon instead of a pink button as big as 保存する; it still asks first. The reading box's caption is 13px (it was 12px). The labels 英語 and メモ（日本語） were already 14px, so they are unchanged.
- **Phrase sheet:** progress uses the same green bars as the notebook list, under a 覚えた度 title, instead of rows of circles with no name.
- **Checked:** the memo list (a short note, a long LINE message, a question with no English, a note saved from a phrase), the editor and the phrase sheet at iPhone 13 size; tests (117), type check, build, and the WebKit smoke test (28 of 28, including writing, reading back, changing and deleting a note).

## Polish: Today, Practice, Notebook, Settings (2026-11-17)

You asked whether the design looks good, modern and neat. The lesson screens did; the four tab screens were plainer and less tidy. This pass changes only how they look.

- **Today:** the new phrases show as small labels that never break in the middle, with one line under them: 「新しいフレーズ 2・復習 1問・練習 1問」. The level and the week's stamps are one card, with a dashed line between them and even text sizes. The level's two lines are now one: 「あと10フレーズでレベル2、うさぎが仲間に！」. After the lesson, the card shows the next phrases; 「今日のスタンプをもらいました。」 only appears when none are left, since 完了 ✓ and the stamp already say it.
- **Fits a small iPhone:** on an iPhone SE the friends' scene is a little shorter (41% of the screen instead of 44%) and the spacing tighter, so both cards show whole above the button, before and after the lesson, with no scrolling. The line heights are now set, not left to the font, so the iPhone's rounded font measures the same as here.
- **Practice:** each choice has an icon in a coloured circle (the lesson's own for listening, speaking and conversations). One choice is suggested (おすすめ): 苦手なフレーズ once she has missed a phrase, otherwise 全部まぜて. It is the one yellow sticker button; the others are light, like the quiz's choices.
- **Notebook:** each phrase (and each note) is one card with the lessons' round ▶, which turns yellow while it plays. A small key, 「●●○ 覚えた度」, explains the bars beside each phrase.
- **Settings:** a setting with a note puts its control under both, lined up on the left, and the notes have room between their lines.
- **Line breaks:** the notes and page intros on these screens break only between phrases (「…『もっと覚える』で、／いくつでも先に進めます。」), never mid-word.
- **Small text raised:** the smallest text on these screens is now 13 to 14px (it was 11 to 13px).
- **Checked:** the screens at iPhone 13 and SE sizes; tests (117), type check, build, and the WebKit smoke test (28 of 28). Not checked on a real iPhone.

## もっと覚える: no daily limit on new phrases (2026-11-17)

You asked whether she can move ahead on the same day. She could not: a lesson taught 2 new phrases (up to 3 in 設定), counted per day, and 練習 only reviews. Now she can.

- **Once today's lesson is done**, the Today screen lists the next new phrases and shows 「もっと覚える」 beside 練習する. While phrases are left, Hachiware says 「おつかれさま！もっと覚えてもいいよ。」 instead of 「また明日ね」.
- **A round** is the next phrases in the path, as many as her setting (2 by default), learned like the lesson's: meet, check, say. They are recorded the same way, so each comes back for review from the next day. A round is saved after every step, one left part-way comes back as 続きから, and もう知ってる works there too.
- **At the end of a round** there is no second stamp. Hachiware says "All done!", and her other button is 「もっと覚える」 for the next round, as many as she likes. The end of the daily lesson is unchanged.
- **A big day evens itself out:** the next lesson holds their reviews, and a lesson with 14 or more reviews due teaches 1 new phrase (none at 24). She can still choose もっと覚える after it.
- **Settings:** the setting is now 「1回に習う新しいフレーズの数」, with a note that もっと覚える goes further.
- **Checked:** a new test (a round, how it is recorded, the next one, and the lesson after a big day), the type check, the build, the WebKit smoke test with a new check that starts a round and leaves it part-way (28 of 28), and the Today and end-of-round screens at iPhone size.

## Audio made: all 128 steps in the app (2026-11-17)

You approved the drafts and said to make the audio. All 83 drafts (parts 2 to 5) are now taught, in the new order: 128 steps and 11 conversations.

- **The clips:** 178 new ones, made on this PC with the same voice and settings as before (Heart, natural speed). That makes 386 clips in all, 3.0 MB of MP3. One leftover clip from an older wording was deleted. The app keeps 420 files offline (6.4 MB), and the phone downloads only the new and changed files the next time it opens online.
- **"All right?" (#4) is now "Are you all right?"**, as planned, so no question depends on a rising voice.
- **"I'm happy!" stays as it is** (you did not ask for "I'm so happy!").
- **Three problems showed up once the new steps were live, all fixed:**
  - **The meaning quiz could mark a right meaning wrong.** "It's OK." and "No problem!" both answer "Sorry!", but nothing said they ask the same thing, so the quiz for "Sorry!" could offer ごめんなさい as a wrong choice. Steps that ask the same sentence are now never each other's wrong answers. This also covers "How many?" (the four number steps) and "What day is it?" (the three day steps).
  - **The planned sound-alike pairs had become a coin toss.** With the new phrases, "Time to eat!" shares as many words with "What do you want to eat?" as with "Time to go!", and "Sorry!" ties "Sorry, what?" with "Sorry, I don't understand." Among lines sharing as many words, the one nearest in length now wins, so the planned pairs from REVIEW 2.4 hold as the course grows.
  - **A note in quotes lost its ？.** “Can I have some water?” is now a lesson line, and in quotes its reading came out without the question mark. Closing quotes are now passed over.
- **Checked:** every step has all its clips; no clip is cut off or garbled, judging by its length against its sounds; the voice's sounds for the stand-in name and the tricky words are right ("Yuki" ユーキ, Malaysia, bakery, the days, "live" as liv). Tests (116), type check, build, and the WebKit smoke test (26 of 26) all pass.
- **Not checked by ear:** I cannot listen. The new clips can be heard on `/review.html` (dev server), or in the app.

## New order: introductions first (2026-11-17)

You asked to move the introductions up before the drafts go into the app. The order she learns the steps in is now one list, `src/content/course/order.ts`. The steps stay in the files they were written in (part 1 to part 5), and the list alone decides when she meets each one. No step changed, and no audio was made.

At two new steps a day (the default), the path now runs:

| Days | Steps in the sheet | What |
|---|---|---|
| 1–2 | #1 to #4 | "Hi!", "Sorry, what?", "Thank you!", "Are you OK?" (as before) |
| 3–5 | #5 to #10 | Meeting people: "Nice to meet you!", her name, where she is from, "How are you?", her job ("I work at a bakery."), "Do you speak English?" |
| 6–16 | #11 to #32 | Getting by as a guest, with "I'm from Japan.", "Hi, nice to meet you!" and asking someone's name among them |
| 17–26 | #33 to #52 | The rest of the first phrases |
| 27–31 | #53 to #62 | Numbers, the time, the days of the week |
| 32–39 | #63 to #78 | About herself: work hours and days, days off, hobbies, brothers, "My name is…" |
| 40–49 | #79 to #98 | Longer answers, built from the short ones |
| 50–57 | #99 to #114 | Food, feelings, and asking things herself |
| 58–64 | #115 to #128 | Plans, what happened, and goodbyes |

- **The phrases already in the app** keep their content; the new list only changes when she meets the ones she has not learned yet. Her progress stays as it is. The biggest moves: "Where are you from?" goes from #33 to #7, "Nice to meet you!" from #7 to #5, and "Slowly, please." from #16 to #13. "Want some more?" (#5 to #14), "One more time." (#8 to #23) and "Good!" (#14 to #36) come later. Until the drafts have audio, only the phrases already in the app are taught, in this new order.
- **Conversations:** 「ゆっくり話してもらう」 is now C3, because it is ready on day 7, sooner than before. 「おうちに着いたら」, 「朝ごはん」 and 「いただきます」 move to C4 to C6. C1, C2 and C7 to C11 keep their numbers.
- **The # numbers in the sheet follow the new order.** The numbers in the sections below were written before it, so they point to the old places.
- **Checked:** a new test fails if a step is missing from the list or named twice. At its new place, every step still comes after the step it is built from and adds at most two new word blocks. Conversations are still listed in the order they become ready. Tests (115), type check, and the content sheet (regenerated) all pass.

## Content check: all 128 steps, 213 blocks, 11 conversations (2026-11-17)

You asked for a full check before the drafts go into the app. How: an independent English review and an independent Japanese review read everything, I checked every reading against the voice's sounds and ran mechanical checks (punctuation, politeness of her lines, consistent glosses), then verified each finding against the source before changing it.

- **Mistakes found and fixed:**
  - **A bug in two lines:** "What time is it?" and "What day is it?" showed as "is it@after" (source markup). A test now fails if markup ever shows in the English.
  - **Word meanings that were wrong where they are used** (tapping a word shows its meaning): "to" in "to the beach" said 〜まで (now 〜へ); "too" in "too spicy" said 〜も (now 〜すぎる); "have" in "Can I have…?" said いる (now もらう); the "it" of the time and the day said それ (now a note that it means nothing). "good" now says いい, with a note that it is 元気 in "Good, thank you." and おいしい for food; "OK" adds わかった.
  - **Notes that taught something wrong:** "I'm off." alone means "I'm leaving"; it is a day off only with the day ("I'm off on Mondays"). "some water" is just お水, not お水を少し. "How about you?" fits after being asked her name, job or hobby, not after any question. "My name is…" is more formal, not more polite. 12 numbers cover the hours, not all times.
  - **Glosses:** in C9 the family's "Welcome!" answers her thanks, so it now shows どういたしまして (conversations can now give one line its own gloss). Her lines that were casual are now polite: "OK!" to "Ready?" はい、大丈夫です！, "I'm ready!" 準備できました！, "Sorry, I don't know." すみません、知らないです, "Thank you for having me!" 迎えてくださって…, "Sure!" はい、もちろんです！, and そちら instead of あなた in "And you?" and "How about you?".
  - **English that did not fit:** "Can you eat spicy food?" → "A little. It's good!" (she is not eating yet): that question is gone from #63. "Welcome to Malaysia!" → "Thank you for having me!" (only hosts have her): #58 keeps only "Welcome!".
- **English made more natural** (the reviewers' suggestions I agreed with):
  - "I work from seven." sounded unfinished: now "I start at seven." (answering "What time do you start?"), and the chain goes on to "I work from seven to four."
  - "I'm OK." (already taught) → "I'm OK, thank you."; "All right?" → "Are you all right?", which does not depend on a rising voice.
  - "Do you have brothers?" → "Do you have any brothers or sisters?"
  - "Anything!" → "Anything is fine!"; "It's too spicy!" → "It's too spicy for me!" (about her taste, not the cook); "Tomorrow, we go to the beach." → "Tomorrow we're going to the beach."
  - "Can I have this?" is now at the family table, not ordering from a menu (person-to-person only).
  - Titles and situations: C1 is now 「これ、あげる」 (its line is "This is for you."); in C8 she meets a relative's "Auntie", since her friend's own parents would not ask where she is from.
- **For you to decide (not changed):**
  - "Hey!" is glossed やっほー (#1, #46, C1). The Japanese review found it cutesy for a friend's parent and suggested やあ. *Decided 2026-11-17: you keep やっほー.*
  - "I'm happy!" could be "I'm so happy!" (more natural as an exclamation; both are correct).
  - "How was your trip?" is now 「ここまでの旅、どうだった？」; tell me if you prefer other wording.
- **Waiting for the audio run:** "All right?" in #4 (in the app) has the same rising-voice problem. Changing it needs a new clip, and a step without all its clips leaves the app, so it changes when the audio for the drafts is made.
- **Checked:** the tests (114, one new), the type check, and the content sheet (regenerated: 128 steps, 213 word blocks).

## Everyday talk: 19 more drafts for your review (2026-11-17)

The third batch, #110 to #128 in the content sheet: food, plans, what happened, and asking about the other person. Drafts only: not in the app, no audio. The examples are things anyone might do on a visit, not facts about her.

- **Food and what she wants, #110 to #115:**
  - "What do you want to eat?" → "Chicken, please." / "Anything!"
  - "Can I have this?" (she hears "Sure!") → "Can I have some water?"
  - "I like this!", "It's too spicy!", "I'm thirsty."
- **Plans, #116 to #120:**
  - "What do you want to do tomorrow?" → "I want to go shopping." → "I want to take pictures."
  - She asks "Where are we going?" and hears "To the beach!"
  - "Tomorrow, we go to the beach." → "Sounds good!"
  - She asks "What time tomorrow?" and hears "At nine."
- **What happened, #121 to #125:**
  - "What did you do today?" → "I went shopping." → "I went to the beach." / "I took pictures."
  - "Yesterday, I went shopping." and "Tomorrow, I want to go shopping.", said without being asked.
- **Asking about the other person, #126 to #128:** "How about you?", "Have you been to Japan?" (she hears "Not yet."), and "What do you do?" asked by her.
- **Frames first:** "Can I have…", "I want to…", "I went…" and "Yesterday, / Tomorrow," each take new words later without new grammar to learn.
- **17 new word blocks** (203 in all), readings from the voice's sounds as before.
- **One check corrected:** the test that counts a block's syllables took "going" for one syllable (it read "oʊɪ" as a single vowel); it now counts each vowel sound.
- **Where the course stands:** 128 steps, 45 in the app and 83 drafts. None of the drafts reach her until you approve them in the sheet and their audio is made.
- **Checked:** the content rules, the readings against the voice's sounds, the tests (114) and the type check.

## Talking about herself: 31 drafts for your review (2026-11-17)

You asked whether the course is enough for everyday conversation, with the example "I work from 8 to 6, five days every week at a bakery". It was not: 78 phrases and about 126 words, nearly all for being a polite guest, with nothing about herself and no numbers. These drafts are the first two batches, using the facts you gave. They are in the content sheet as #79 to #109, not in the app, and have no audio.

- **Numbers, #79 to #82:** "How many?" → One, Two, Three; Four, Five, Six; Seven, Eight, Nine; Ten, Eleven, Twelve. Three to a step.
- **The time, #83 to #85:**
  - She asks "What time is it?" and hears "It's three."
  - "What time do you start?" → "At seven."
  - "See you at eight!" → "OK!"
- **Days of the week, #86 to #88:** "What day is it?" → Monday, Tuesday, Wednesday; Thursday, Friday; Saturday, Sunday.
- **Her name, #89 to #92:** "What's your name?" → "I'm Yuki." → "My name is Yuki." → "I'm Yuki. And you?", and asking it herself. "Yuki" is a stand-in: the step tells her to say her own name, which is not in the app.
- **Her work, #93 to #98, built a piece at a time:**
  - "What do you do?" / "Where do you work?" → "I work at a bakery."
  - "I work from seven." → "I work from seven to four."
  - "I work five days a week."
  - "I work from seven to four, five days a week."
  - "I work at a bakery from seven to four, five days a week."
  - The numbers are their own word blocks, taught before, so the sentence is a frame: "from eight to six" is the same blocks with other numbers.
- **Her days off, #99 and #100:** "I'm off on Mondays." → "I'm off on Mondays and Fridays."
- **Her hobbies, #101 to #103:** "What's your hobby?" → "I like drawing." → "I like taking pictures." → "I like drawing and taking pictures."
- **Her family, #104 and #105:** "Do you have brothers?" → "I have two brothers." → "I have two younger brothers."
- **More questions she will be asked, #106 to #109:**
  - "Do you speak English?" / "Can you speak English?" → "A little."
  - "Do you like Malaysia?" → "Yes, I love it!"
  - "Where do you live?" → "In Japan."
  - "How was your trip?" → "It was good!"
- **52 new word blocks** (186 in all), with readings taken from the voice's sounds by the converter built for her notes, then checked by hand. On its own the voice reads "live" as in "live music", so that block is respelled for the voice (tools/audio/say-as.mjs).
- **For you to decide in the sheet:** the wording of each line, the stand-in name, and whether the long work sentence should also name the days.
- **Two questions I left out because I do not know her answers:** "Is this your first time in Malaysia?" and "How long are you staying?". Tell me and I will add them.
- **Still to come:** conversations (C12 on) that use these phrases once they have audio. The app also still caps new phrases at three a day, which you no longer want. (Food, plans and what happened are in the batch above.)
- **Checked:** the content rules (a step built from another adds at most two new blocks), the readings against the voice's sounds, the tests (114) and the type check. The content sheet is regenerated: 109 steps, 64 of them drafts.

## Short conversations: 会話してみよう (2026-11-17)

From the review of the learning process: every phrase was practised alone, always after the same cue, and no step had a second turn, so she never practised keeping a conversation going or starting one. You chose to add short conversations first.

- **What she does:**
  - A new step, 会話してみよう, with a two-bubble icon. Hachiware says 「覚えたフレーズで、会話してみよう！」 and the situation is shown (こんなとき).
  - The conversation builds up like a LINE chat: the other person on the left, her on the right.
  - Their lines play with no text (♪). On her turn she sees what she wants to say in Japanese (「ありがとうございます！」 with ？？？ for the English), says it in English out loud, and taps 答え合わせ: the model plays, and her line and the line she answered show their English. 「もう一回聞く」 replays what she is answering, and she goes on with 続ける.
  - Some conversations start with her (「こんにちは、おばさん！」), and some have two of her lines in a row.
  - At the end: 「会話できたね！」 and ▶ 通して聞く, which plays the whole conversation again.
  - On stage, the topic's friend plays the other person (シーサー for the family, くりまんじゅう at the table, ラッコ at home; Hachiware for the basics), and her partner acts out her lines.
- **When:**
  - A conversation comes up once she has learned every phrase it uses (understood the day after meeting it) and said her own lines once.
  - One in each day's lesson, after the new phrases, the one done longest ago (or never) first. Today shows it as 「会話：1」.
  - 練習 has a new choice, 会話, with up to three. Until one is ready it says 「フレーズをもう少し覚えると、できるようになります」.
  - It is practice: nothing is graded, and the review schedule does not move.
  - The first tour now mentions it in one sentence.
- **Your content to review:** 11 conversations, made only of lines already in the path, so no new audio was made or is needed. They are in the content sheet under the phrases, as C1 to C11, with the steps each needs ("Ready after"), and at the end of the CSV:
  - C1 はい、どうぞ (from about day 3): Hey! → Hi! → This is for you. → Thank you!
  - C2 道で会ったら (day 6): Hello! → Hi! → How are you? → Good, thank you. → See you later! → Bye!
  - C3 おうちに着いたら (day 13): Welcome! → Thank you! → Come in! → This is for you. → Thank you so much! → You're welcome. → Have a seat.
  - C4 朝ごはん (day 13): Morning! → Good morning! → Eat already? → Not yet. → Time to eat!
  - C5 いただきます (day 15): Try this! → Thank you! → Is it tasty? → It's good! → Want some more? → Yes, please.
  - C6 ゆっくり話してもらう (day 18): Where are you from? → Slowly, please. → Where from? → Japan.
  - C7 おやすみ (day 19): Are you tired? → A little. → Good night! → Good night! → Sleep well!
  - C8 はじめまして (day 20): Hi, Auntie! → Hello! Nice to meet you! → You too! → Where are you from? → Japan. → Welcome to Malaysia! → Thank you!
  - C9 ごちそうさま (day 21): Are you full? → I'm full. → Thank you! It was delicious! → Welcome!
  - C10 飲み物 (day 22): Want a drink? → Sorry, what? → What do you want to drink? → Water, please.
  - C11 お手伝い (day 23): Can I help? → No need! → Thank you!
  - The days assume two new phrases a day. They are in the app now, since they need no audio; tell me by C number which to keep, change or drop, and what to add as the course grows.
- **Checked:**
  - Tests: every line is in its step and said by the right person; ids, titles and situations; Japanese written as adults write it; the order they become ready; ready only once learned and said; one a day, the one done longest ago first; 会話 practice; nothing recorded but the time; a saved lesson with a conversation in it.
  - In the browser at iPhone 13 and SE size: おうちに着いたら through to the end and its replay (each line's clip requested in order), はじめまして (she speaks first), and ごちそうさま (two of her lines in a row).
  - The tests (114), the type check, the build and the WebKit smoke test (26 of 26).

## Partners who take turns (2026-11-17)

Your idea: Hachiware does all the talking, so the friend beside him could change. Until now that was always Chiikawa on Today, at the start and at the end of a lesson. うさぎ and モモンガ never appeared: their topics have no finished phrases yet. Now:

- **Who:** her study partner is ちいかわ at first. うさぎ joins at English level 2 (10 phrases learned) and モモンガ at level 3 (20 learned). From then on they take turns, one partner a day, chosen when she first opens the app that day and kept all day. A friend who has just joined comes first.
- **What a partner does:** everything Chiikawa did. They hop on Today, listen in 答えてみよう, worry at a miss and cheer at a right answer in the quiz, act out what she says in the scenes, and celebrate at the end. In the lessons' stage directions ちいかわ now stands for whoever is her partner that day, so no lesson content had to change.
- **In character, never talking:**
  - うさぎ is never down for long: where Chiikawa looks worried, うさぎ looks startled, and a nod is a hop.
  - モモンガ makes the most of every feeling: worry comes out as tears, and a hop as a cheer.
  - This is my reading of the characters; tell me where it is off (the table is in `src/app/scene.ts`).
- **Joining:**
  - Today's level meter names who joins next: 「あと3フレーズでレベル2（うさぎが仲間に！）」.
  - The lesson that reaches the level ends with 「英語レベル2になりました！ うさぎが仲間になりました。」, the new friend cheering on stage with the others, and Hachiware's goodbye 「明日からうさぎも一緒だよ。また明日ね！」.
  - On their first day, Hachiware greets her with 「今日からうさぎも一緒だよ！」 and the friend hops with a heart.
- **No one twice:** when a phrase from うさぎ's or モモンガ's own topic arrives later (they are the person she meets there), Chiikawa is her partner for that phrase.
- **Saved:** today's partner and who has been her partner so far are kept with her progress and in backups. A backup from before this change simply starts with Chiikawa.
- **Checked:**
  - Tests: who joins at which level, one partner a day, a new friend first, then turns; a restored backup with a lower level; no one on stage twice; saving and older saves.
  - In the browser: うさぎ's and モモンガ's first days on Today, うさぎ in a lesson (the "?" on a miss lands on her), and the lesson that reaches level 3, with モモンガ joining and the goodbye line.
  - The tests (104), the type check, the build and the WebKit smoke test (26 of 26).

## Calmer lesson screens (2026-11-17)

You found the app overwhelming at times. Today, the notebook, practice and settings were calm; the lesson steps were crowded. At iPhone 13 size the cards got about 306px of the 812, and 新しいフレーズ for "Hi!" had 722px of cards in that window. Every element also had the same thick outline, so nothing said where to look first. Five changes, all at your go-ahead:

- **More room for the cards:**
  - The friends' band in a lesson is smaller: 24% of the screen's height (140 to 230px) instead of 32% (180 to 300px). The friends still show from head to waist.
  - Hachiware's bubble no longer carries her name: its tail already points at her.
- **新しいフレーズ in short pages:**
  - The phrase; then other ways of saying it, if any; then, for a phrase she answers, the reply, heard with the phrase in a small row above it.
  - 次へ goes to the next page, ← 前へ to the one before. A page she has seen comes back as she left it, without playing again.
  - At the end of each page Hachiware says what comes next (「次は、答え方を聞いてみよう」).
- **Shorter 使うとき notes:** the ten over 60 characters now have 48 to 61, so the first page fits an iPhone SE. **Your content to check** (before → after):
  - sorry-what: dropped 「わかったふりをしないで」 and the repeated "Sorry, what?"; kept why "Sorry" alone sounds like an apology.
  - dont-understand: kept the difference from "Sorry, what?"; dropped 「身ぶりや翻訳アプリで助けてくれるはず！」.
  - welcome: 「お礼への返事（どういたしまして）にも "Welcome!" を使うよ」 → 「「どういたしまして」にも使うよ」.
  - auntie: dropped 「親しみをこめて」 and the glosses; "Uncle" is now 「（男の人は "Uncle"）」.
  - no-need: dropped the gloss （しなくていいよ）, which the card shows.
  - some-more: dropped 「すすめられたら」; 「どちらもていねいだよ」.
  - excuse-me: 「…人に声をかけるときに使うよ。謝るときは "Sorry"、お礼は "Thank you" だよ。」
  - youre-welcome: 「お礼を言われたら、これで返そう。おみやげを渡して "Thank you!" と言われたときもね！」
  - say-it: dropped 「ゲームでも何でも、」.
  - have-you-eaten: dropped the quoted 「ごはん食べた？」, which the card shows.
- **One thick line per screen:** the main card and the main button keep it. ← 前へ, the quiz's choices and 「もう一回聞く」 are light buttons in a thin line with no shadow. 「もう一回聞く」 is a small pill under the sound card, not a full-width button.
- **Fewer controls:**
  - No ✕ in the lesson bar: ⏸ opens the menu, which has 「今日はここまでにする」. The quit question went with it, and so did its はい / いいえ, the only place those two app words were shown (16 app words now).
  - 「もう知ってる」 is a small link beside ▶ on the phrase's card, not a button beside 次へ.
- **答えてみよう:**
  - Once she taps 答え合わせ, the question shrinks to one row, so the model answer is in full view.
  - Hachiware asks one thing at a time: 「まねして、もう一度言ってみてね」, then 「最初の答えはどうだった？」 as the rating buttons wake up.
  - Hachiware's closing lines in 新しいフレーズ also come one at a time, so her bubble stays one line.
- **Checked:**
  - Every lesson step in the browser at iPhone 13 (375×812) and iPhone SE (375×667) size: each page of 新しいフレーズ fits without scrolling on both, including "Sorry, what?" with the longest note. The quiz scrolls by a few pixels on the SE, with all three choices in view.
  - ← 前へ between pages, and もう知ってる (12 steps became 7).
  - The tests (97), the type check, the build and the WebKit smoke test (26 of 26; it now stops a lesson from the pause menu).

## GPL licence (2026-11-17)

The pronunciation engine behind note readings, eSpeak NG, is under GPL-3.0-or-later. You chose to license the app the same way rather than swap the engine.

- **LICENSE:** the GPL's own text, version 3, as published by the FSF (checked against two other copies of it).
- **package.json:** `"license": "GPL-3.0-or-later"`.
- **In the app:** the GPL asks an app people use to say who holds the copyright, that it comes with no warranty, and where its licence is. The bottom of 設定 now says 「© 2026 PhuahJinWei」 and 「GPL-3.0ライセンスのフリーソフトウェアです（無保証）。」, with a link 「ライセンスとソースコード」 to this repository.
- **README, Licence:** Chiikawa and its characters belong to their creator, ナガノ, and are not covered by it.
- **Checked:** the notice in 設定 in the browser, the tests (97), the type check, the build and the WebKit smoke test (26 of 26).

## Katakana readings for notes (2026-11-17)

You asked whether readings could be made automatically for the English in her notes. They now are (section 7 said they could not; that has changed).

- **Where she sees them:**
  - In the notebook's メモ list, under each note's English.
  - In the note editor, under 読み方. The reading follows what she types or pastes, with 「自動でつけた読み方です。目安にしてください。」 under it.
  - Strong beats are marked as in the lessons. English that is a lesson line keeps its hand-made reading, with her own punctuation.
- **How:**
  - A pronunciation engine runs on the phone: eSpeak NG, the same one Kokoro uses to turn text into sounds before it speaks.
  - A converter (`src/learn/reading.ts`) turns those sounds into katakana by the rules of the hand-made readings: ッ for a t that is not let go, ダ行 for the soft t of "water", ディ for th, エァ for the a of "happy". It also runs words together where the voice does ("can I" キャナイ, "thank you" センキュー, "look at" ルッカッ).
- **Against the hand-made readings:**
  - The rules give the same reading for 126 of the 134 word blocks.
  - The other 8 are places where the hand-made reading chose differently, for example "no need" ノウ [ニーッ] by hand, ノウ [ニード] by the rules (as "food" フード), and "excuse me" エクス[キュー]ズ ミー against エク[スキューズ] ミー.
  - The full list, each with the reason, is in `tests/reading.test.ts`. Making them agree is a content decision for your next review; no lesson reading was changed.
- **Cost:**
  - The engine is a file of its own: 1.3 MB, about 0.7 MB to download.
  - It is loaded only when a note needs a reading, never in lessons.
  - It is kept offline with the rest of the app: 4.96 MB instead of 3.69 MB. It is downloaded once and reused by later updates unless the engine itself changes.
- **Limits:** a reading made on the phone is a fair guide, not a checked one. Malay words are read as if they were English (teh tarik テイ [ター]リック), and names may come out wrong.
- **Licence:** the engine's wrapper (phonemizer) is Apache-2.0, but eSpeak NG inside it is GPL-3.0-or-later, so the app is now GPL-3.0-or-later too (GPL licence, above).
- **Checked:**
  - Tests: the rules against the hand-made readings, sentences, punctuation, and readings through the engine and from lesson lines.
  - In the browser at 800 and 320 px wide: long readings wrap between words.
  - The tests (97), the type check, the build and the WebKit smoke test (26 of 26). The smoke test now also writes a note and waits for its reading, online and offline.

## 答えてみよう explains itself (2026-11-17)

You asked what the 答えてみよう screen does and what she is meant to do: the screen did not say clearly enough. She hears someone speak (sound only), answers out loud in English, checks, says the model once more, and rates herself. Three changes:

- **The hidden card:** under its ♪ marks it says 「英語は答え合わせのあとに出ます」, so a card with no text no longer looks broken or still loading.
- **Bubble, not a row:** the 「あなたの番！」 row is gone (the same kind of vague icon row as 言ってみて). Hachiware's bubble says what to do: 「英語で、声に出して答えてみてね。わからなくても大丈夫、答え合わせしよう」 (言ってみてね for a phrase she says without being asked).
- **The button:** 「お手本を聞く」 is now 「答え合わせ」, the familiar word for checking an answer: the next step whether she could answer or not.
- **App words:** あなたの番！ is no longer an app word (18 now). The turn row's component is removed.
- **Checked:**
  - The screen in the browser, through to the rating.
  - The tests (91), the type check, the build and the WebKit smoke test (26 of 26).

## もう知ってる (2026-11-17)

You asked about a skip button for words she already knows. A general skip already exists (the pause menu's このステップをとばす), and one beside 次へ on every step would make skipping the hard parts too easy; it would also record nothing, so the phrase would come back as new. Instead, the 新しいフレーズ step has 「もう知ってる」 beside 次へ:

- **When:** in today's lesson only, not in practice. It is enabled once the phrase has been heard and shown.
- **What it does:**
  - The phrase counts as learned at once, but further along the review schedule (box 3), so its first check comes in about four days instead of tomorrow.
  - Today's quiz, answer and practice steps for it are dropped (day one went from 12 steps to 7 when "Hi!" was known), and she goes on with the next step.
  - A miss at that first check sends it back to box 1, to be learned as usual, so a tap by mistake costs nothing for long.
- **Layout:** on a narrow phone, beside ← 前へ, the label goes on two lines (もう / 知ってる), so 次へ stays the widest button.
- **Checked:**
  - Tests: the known phrase, its first check four days on, its steps dropped, the day still stamped, and practice ignoring it.
  - In the browser at 375 and 320 px wide.
  - The tests (91), the type check, the build and the WebKit smoke test (26 of 26).

## No repeat-after-me step (2026-11-17)

You decided 「まねして言う」 should go: she already says the new phrase out loud herself in 「新しいフレーズ」, and 「言ってみて」 should not run on a timer.

- **Lessons:**
  - A new phrase now goes 新しいフレーズ → 聞き取りクイズ → 答えてみよう. Day one is 12 steps instead of 14.
  - The lesson is still topped up with practice to about ten minutes.
  - A phrase she understood but never answered comes back as just 答えてみよう, which shows the model once she has tried.
- **新しいフレーズ:**
  - For a phrase she answers, it now also introduces the reply (under 答え方, heard before it is shown), which まねして言う used to do.
  - It ends with Hachiware asking her to say it out loud, in her own time.
- **答えてみよう:** the timed 「言ってみて」 pause after the model is gone. Hachiware asks her to say the model once more, and the rating buttons come straight away (after the usual moment that guards against a double tap).
- **Saved lessons:** a lesson saved part-way by the older version drops its leftover まねして言う steps and resumes at the same place (tested).
- **App words:** five are no longer shown anywhere, so they are no longer app words: 準備できた？, いいよ！, 終わり！, もう一回 and 言ってみて.
- **Content to look at in your next review:** the course still teaches "Ready?", "Say it.", "Done!" and "One more time." as phrases. They were partly there because the removed step used them, so keep them only if they are worth learning for their own sake.
- **Checked:**
  - A lesson in the browser: the reply introduced in 新しいフレーズ, and the new 答えてみよう ending.
  - The tests (89), the type check, the build and the WebKit smoke test (26 of 26).
  - The content sheet, now counting 19 app words.

## Study days, not days since the start (2026-11-16)

- **Before:** 「はじめて{n}日目」 on Today counted calendar days since her first lesson, skipped days included, and so did the number on the lesson's stamp. Her 8th lesson could get a stamp saying 20日目.
- **Now:**
  - Both count the days she studied. Today shows 「がんばった日：{n}日」 (nothing before her first lesson), and the stamp shows her n-th study day.
  - Next to a stamp, the stamp screen no longer repeats がんばった日, since the stamp shows the same number.
- **Kept on purpose:** the weekly stamp row. It is where each lesson's stamp lands, and it has no streak to lose. The review schedule still runs on calendar days, as it must.
- **Checked:**
  - A record that started 10 days ago with 3 study days shows がんばった日：3日 on Today.
  - After a lesson, the same record gets a 4日目 stamp (it would have said 10日目).
  - The tests, the type check, the build and the WebKit smoke test pass.

## The stage's meadow (2026-11-16)

You said the ground the friends stand on looked plain, not like Chiikawa's world.

- **What the anime's fields look like** (from its scenes and the official game, looked at for style only; nothing was copied):
  - A wide, light yellow-green field with small marks of grass and tiny pink, white and yellow flowers.
  - Soft grey-mauve mountain ranges on the horizon, with a line along the ridge.
  - A band of round, bumpy trees along the mountains' foot, and now and then one big puffy tree.
  - A pale blue sky with small clouds.
  - Background shapes have a light line in a darker shade of their own colour.
- **The new meadow** (`src/stage/Backdrop.ts`):
  - Painted once at start-up into a few small pictures: the field's marks (a repeating tile), one long painting of mountains and tree line, the clouds and two big trees.
  - Seven draw calls and no fog. The WebKit self-check still measures about 60 fps.
  - The two big trees frame the friends in a lesson's band. On Today's taller scene they peek in at the edges.
  - The fallback 2D stage and the stage's colour before it draws use the same sky, mountains, trees and field, so nothing jumps.
- **Checked:**
  - The stage test page at the scene, band and strip sizes.
  - Today and a lesson in the browser pane and in WebKit at iPhone 13 size.
  - The fallback 2D stage in WebKit with 3D switched off.
  - The tests (88), the type check, the build and the WebKit smoke test (26 of 26).
- **Also:** the app's main file is now 1,002 KB, so the build's size warning moved from 1,000 to 1,100 KB. It is downloaded once and kept offline, so splitting it would buy nothing.

## Hand-drawn outlines (2026-11-16)

You asked for thicker, uneven outlines to fit the Chiikawa look. The 2px lines were also thinner than the friends' own outlines on the stage, so the page and the friends did not match.

- **How they are drawn:**
  - Each outline is a small picture drawn once on your PC by `tools/sketch/sketch.mjs` and laid around an element with CSS `border-image` (`src/app/sketch.css`, about 22 KB).
  - Nothing is drawn while the app runs: no SVG filters, which iPhone Safari would redo on every scroll and animation frame. The WebKit self-check still measures about 60 fps.
- **Three weights, so the page does not get heavy:**
  - Thick: buttons (with their hard shadow drawn in the same line, so a press shrinks it), speech bubbles, the main cards and the panel's top edge.
  - Medium: round buttons, switches, tabs and highlighted words.
  - Thin: list rows, page sections, the こんなとき cards and ordinary words.
  - Chips have no line. The stamp is an unevenly inked rubber-stamp ring.
- **Built to survive any size:**
  - The wobble lives in the corners and in one gentle bow along each top and bottom edge. The sides are straight, because a one-line bubble squeezes its sides to a few pixels and any wobble there turned into a notch.
  - Each line always covers its element's own edge, so no fill shows outside it. Tests check this and that `sketch.css` is up to date.
  - Scrolling areas got 4px of room at the sides, so they no longer cut the lines' outer edge.
- **Checked:**
  - In the browser pane at 375×812 and 375×667: the tour, Today, every lesson step, pause, the finish, the notebook, the phrase sheet, a memo, practice, settings, backup, the self-check and the install guide.
  - WebKit screenshots at iPhone 13 size, the tests (88), the type check, the build and the WebKit smoke test (26 of 26).
- **Found while checking, and fixed (below):** on a small iPhone, Today's 「はじめる」 button cut off the stamps. The last commit did the same.

## Today on small iPhones (2026-11-16)

- **What was wrong:**
  - Measured in WebKit, with the home-screen app's status bar and home bar set as on the phone.
  - Today's middle part did not fit on an iPhone SE: 31px short on the first day, 57px later (the lesson card grows by a line for reviews).
  - It was also 33 to 37px short on an iPhone 13 in Safari. From the 12 mini up it fit.
  - The friends' scene could not give the room back: the camera fits the friends to the scene's height, so a shorter scene shrinks them and Hachiware's greeting would cover their heads.
- **Changes:**
  - Each day's letter now sits in its stamp circle (one row instead of two). A stamped day is inked pink over its letter, and today's ring is darker.
  - 復習 and 練習 share one line in the lesson card.
  - 「✓ ネットなしでも使えます」 shows until her first lesson is done, which covers the install guide's "look for it on Today". 「ネットなしで使う準備中…」 still always shows.
  - Today's spacing is slightly tighter, and on a short screen its button is 54px instead of 60px.
  - Any step whose cards are cut off at the bottom (lessons included) now fades out there, so it reads as "scroll for more" instead of broken. The fade goes away at the end, and never shows when only empty space is below.
- **Now:**
  - Everything shows on every home-screen size, including the SE, and on an iPhone 13 in Safari.
  - Only an SE in Safari (548px tall, with Safari's bars) still scrolls, behind the fade.
  - On the real phone its own font may shift this by a few pixels either way.
- **Checked:**
  - WebKit at five iPhone sizes, on a first day and a busier second day.
  - A lesson step on the SE size, with and without the fade.
  - Today's finished state in the browser pane.
  - The tests (88), the type check, the build and the WebKit smoke test (26 of 26).

## The Focus redesign (2026-11-16)

A fresh walk-through as a new learner found the app usable but not confusion-proof, with the friends shrunk to a strip where she spends most time. You chose direction A, "Focus" (PLAN.md section 6):

- **Stage sized per screen:**
  - Today is a large scene with Hachiware's greeting floating above the friends.
  - Lessons get a bigger band (about a third of the screen) where the friends react.
  - The end of a lesson grows into a scene for the celebration.
  - The notebook, practice, settings and backup are plain full pages, and the 3D stops drawing there.
  - The self-check and install guide keep a slim strip (the self-check measures it).
- **Lessons:**
  - The top bar names the step with an icon (新しいフレーズ, まねして言う, 聞き取りクイズ, 答えてみよう or 言ってみよう) and marks reviews and practice.
  - Every step ends in one row of buttons. "Sorry, what?" sits under the sound it replays.
  - The rating step lost its two extra replay buttons (each card has ▶).
  - The ▶ button itself shows when sound is playing, replacing the four dots that looked like a menu.
  - Repeat-after-me counts its rounds and explains the dotted ones.
- **Fixed from the walk-through:**
  - The menu tabs no longer look switched off (contrast 4.9:1).
  - The backup page has ✕ at the top.
  - The level says what it counts ("あと10フレーズでレベル2"), and the stamps are labelled.
  - Phrase titles never break mid-word.
  - On a small iPhone, nothing on Today is cut off (true in the browser pane at 375×667; a later check in WebKit found the stamps still cut, fixed in "Today on small iPhones" above).
  - The quiz only offers a sound-alike wrong choice from phrases she has learned.
  - The tour is three pages, including how a lesson goes.
  - Buttons are 44px or more.
- **Lighter look:** 2px lines instead of 3px, and flat cards with shadows only on buttons. (The lines have since become the hand-drawn outlines above.)
- **Checked** at 375×812 and 375×667 through the tour, Today, every lesson step, the finish, the notebook, practice, settings and backup, plus the tests, the build and the WebKit smoke test.

## After step E: the content rework (2026-11-16)

You changed the goal: conversation with no deadline, starting talk as well as answering, new sentences built from known ones, and no audio until the content is decided. The content system was reworked for that (PLAN.md section 5): one learning path of steps in `src/content/course`, steps built from earlier ones (checked), drafts that are never taught or voiced, and **`content-sheet.html`** to review everything without the code.

- **Moved unchanged:** the 45 phrases taught so far (part 1). The app teaches exactly what it did, with the same audio; the step ids are new ("hi", "are-you-ok"). The Malaysia-specific phrases ("Hi, Auntie!", "Eat already?") stay: your choice, 2026-11-16.
- **Drafts for you to review (part 2, 33 steps):** the 19 longer answers, now steps of their own built from the short answer, and 14 new steps: "No problem!", "Me too!", "Sure!", "I'm hungry / tired / happy", asking "How are you?", "Do you like it?", "What is this?", "Let's go!", and the chain "See you tomorrow!" → "See you next year!" → "I'll come again next year!". Their Japanese is not reviewed yet; that happens once the English is decided.
- **Done in the app (2026-11-16):** the trip is gone: no countdown on 今日, no trip date in 設定, no trip in the first-run tour, and no extra reviews before a trip. Reviews no longer stop at 10 days: a phrase she keeps getting right comes back after 20 days, then every 40, so the daily review stays short as the course grows (this replaces the trip-based fix for 2.9). The 英語度 meter, a share of a planned 108-phrase course, is now 英語レベル: one level per ten phrases learned, which never fills up and never drops (a new fix for 2.8).
- **Not done yet (app changes, after the content):** a lesson step that shows how a sentence is built from the one she knows, and one that plays what she hears back after starting a conversation; conversation practice (several exchanges in a row).

## Status after steps A to E (2026-11-16)

Step A (menu, notebook, lesson control and the new lesson shape), step B (iPhone hardening), step C (Japanese and readings), step D (her notes) and step E (the first packs around the visit) are built. All were checked at phone size on a PC, and step B also in WebKit, Safari's engine. Each step then had an independent review; the problems it found are fixed (below). Item numbers refer to the tables further down.

| | Items |
|---|---|
| **Fixed** | 1.1 to 1.12, 1.14; 2.1, 2.2, 2.4 (with contrast pairs), 2.5, 2.6, 2.8 to 2.12; 3.1 to 3.10 and Appendices A and B; 5.1 to 5.4, 5.6; section 6's tests in Safari's engine and the review page; section 7, her notes |
| **Built, waiting for her phone** | 4.1 to 4.12. Everything is in place and tested on a PC, but only a self-check report from her iPhone can confirm the iOS behaviour (see "Step B" below) |
| **Waiting for your ear** | Five readings and the new "Sorry, what?" (see "Step C" below), and the new packs' lines and readings (see "Step E"): listen on `/review.html` |
| **Waiting for your family** | Her own details for the "About me" pack. The family's ways of talking asked about in step E are all answered (see "Step E") |
| **Partly** | 1.13 (other phrasings are one-line rows and the main phrase scrolls back into view; very small screens still scroll). 2.13 (the new packs have real sentences, so the highlight now picks out the part that matters: "Want · **some more?**", "**What** · do you · want to · **drink?**"; judge it by ear on the review page). 2.3 (four repetitions, the last two from memory, repeat after the model, three-way rating; the phone still cannot hear her). 5.5 (unit tests cover the lesson's bookkeeping, real audio files, every app word in use, a real review backlog, sound recovery, backups, the service worker, readings and the Japanese style; WebKit smoke tests cover start-up, a lesson, backup, offline use and the start-up panel; the lesson screens' details are still checked by hand) |
| **Still open** | 2.7 English app words spoken aloud; contrast pairs; readings that show linking across blocks ("Look at this" sounds like ルッカッディス); a clean self-check report from her phone, which now also covers the notes' voice |

Fixed from the second review: a skipped listening check no longer orphans a phrase (it comes back, and old saves heal); "what would you answer?" never marks a fitting reply or "Sorry?" as wrong; a question whose sound failed is never graded; practice is saved and never starts or moves the schedule; skipping every step earns no stamp; the day number is refreshed when a lesson starts; buttons that appear under her finger ignore taps for a moment; the long reply is played and repeated, not just shown; the time estimates are calibrated (a lesson now shows 約5分 on day 1, honestly).

### Step B: what was built

- **Sound that recovers (4.1, 4.3, 4.11).** Every wait has a time limit, and a watchdog checks that each clip really plays. Stuck sound pauses the lesson; 「続ける」 rebuilds the sound system, as does the first tap after returning from another app. A second way of playing (Settings → 音の再生方式 → 予備: an audio element instead of Web Audio) also plays in silent mode on any iOS; two failures in a row switch to it automatically. The clips are now constant bitrate, and their lengths come from the manifest. Confirmed on a PC by forcing a sound system that never resumes: the lesson paused with a hint, and 「続ける」 rebuilt the sound and carried on.
- **Screen stays on in lessons (4.2)**, released while paused.
- **Errors in proportion (4.8, 4.9).** After start-up a stray error only shows a small notice; a screen that fails to draw shows an error screen with 「今日」に戻る while the menu keeps working; 3D that keeps failing or loses the GPU for good hands over to the flat stage. A start-up panel in plain old JavaScript shows a message, a reload button and the phone's details if the app has not started after 8 seconds.
- **Backup (1.14, 4.5).** 記録のバックアップ makes a short text for LINE or Notes (compressed, with a checksum, under LINE's 10,000-character limit even with the whole course learned) and reads it back from a pasted message; starting over needs two confirmations. Today reminds her weekly, after the lesson. The app asks iOS to keep its data at start-up, warns if saving fails, and keeps a copy of a save it cannot read.
- **A self-check that diagnoses (4.4, 4.7).** Feature probes for the iOS version, screen and safe-area sizes, the sound system's state and history, 3D or flat stage and frame rate, storage, the offline copy against the newest version online, wake lock, and the last errors. Her ears answer four sound rows, including after switching apps and after closing the app completely (the iOS 26.0 and 26.1 bug); her answers survive the close.
- **Updates (4.6, 4.10, 5.4).** The version comes from the content, so a build that changes nothing is not an update, and an update downloads only the files that changed (checked: 1 of 117). Updates switch in only on the Today screen, with one time limit. Today shows 「✓ ネットなしでも使えます」 once the offline copy is complete; the install guide says the first open needs the internet.
- **Small things (4.12, 5.6).** Reduce Motion no longer makes indicators flicker; turned sideways, the app asks to be held upright and a lesson pauses; every report has a copy-by-hand fallback; the 3D stage drops to 20 frames a second when nothing is happening; unused code removed.
- **Found by the WebKit tests:** WebKit on Windows has no Web Audio, and the code threw an error on every tap there. A browser without Web Audio now uses the second way of playing.
- **Fixed from step B's review** (8 problems and 4 suspicions, all closed): the menu could not leave the error screen; an update in a new install's first session never reloaded; an update that would not take over could show 「アップデート中」 over and over, or reload in the middle of a lesson; a clip stopped while loading came back as broken; the pause sheet's sound note vanished under her finger and moved the buttons; 標準 did nothing after the automatic switch; the start-up panel used CSS that old iPhones ignore; a backup copied by hand was not counted. Also: the service worker now checks every downloaded file against its expected hash, so a server caught mid-deploy cannot leave a wrong file on her phone; a decode cut short by a rebuild is retried; self-check answers expire one by one; a save that could not be read can be sent from the self-check. New tests cover the service worker's install, update and refusal paths.

**What only her phone can tell us:** whether sound survives a call, the lock screen and a full close; whether silent mode mutes the standard way; whether the wake lock works in a home-screen app (iOS 18.4 and later should); and the 3D frame rate. Once the app is published, ask her to run 動作チェック once from the home-screen icon and send you the report.

### Step C: what was done

- **Adult Japanese everywhere (3.1).** Every phrase, note and screen uses ordinary kanji and no spaces between words. ハチワレ speaks casually in his bubbles; settings, guides, notices and reports use plain です・ます. A test now fails if the spaced-out style comes back.
- **Meanings fixed (3.2, 3.5 to 3.7, Appendix A).** "I don't know." is 「知らない。」, with a note that "Sorry, what?" is for not catching the English; "Hi!" is 「こんにちは！」 with a warning that it sounds like はい; "Yes." and "No." are 「はい。」「いいえ。」; her morning reply is "Good morning!" (「おはようございます！」), and "Morning!" is only something she hears. Every string in Appendix A is fixed.
- **Readings (3.8, 3.9, Appendix B).** All seventeen are corrected against the voice's own phonemes, and every block of two or more syllables now marks its stressed beat with dots above it (傍点), checked by a test against the phonemes. Readings are larger (16 px, was 13). The tour explains the dots.
- **"Sorry?" became "Sorry, what?".** Measured, not assumed: the Heart voice never rises at the end of a question ("Sorry?", "Really?" and "OK?" all fall, whatever the punctuation or stress), so its "Sorry?" sounded almost exactly like the apology "Sorry,", while the app taught her to raise the end. Re-pitching that one clip worked on paper (266 → 194 → 317 Hz), but you chose to teach "Sorry, what?", which asks for a repeat however it is said. The note now tells her that "Sorry" alone sounds like an apology, so she says "what?" with it; the replay button reads "Sorry, what?" once she has learned it. `tools/audio/pitch.mjs` still measures every clip's pitch for the review page.
- **The review page (section 6).** `/review.html` (development only) plays every line and block with its reading, meaning, phonemes and pitch.
- **Fixed from step C's review** (a native-level read of every string; it confirmed the meaning traps, the bubbles' register and every stress mark): "See you later!" is 「またね！」, not a promise to meet later today; her own lines to the parents are polite (「ありがとうございます！」「大丈夫です！」「知らないです。」「すみません、何て言いました？」); Hachiware says 「こんばんは！」 after dark; the self-check's "close the app" row now says how to really close it (a swipe up only goes home); phrases like "Sorry, what?" are labelled 言い方, not 答え, since they answer nothing; うさぎ no longer speaks in sentences (in the original she never does), so Hachiware talks on the Practice screen; and about thirty smaller fixes to wording, kanji and register.

**For your ear:** the top of `/review.html` lists "Sorry, what?", "Nice to meet you" (ミーチュー or ミート ユー?), "Got it?" (ガーディッ or ガーリッ?), "understand" (ステァ or スタ?), "any idea" and "thank you".

### Step D: what was built

- **Her notes, the notebook's second shelf** (ノート → メモ, section 7). A note holds English (pasted from your LINE message; the paste button and the tidying of quote marks and line breaks are for that), her own Japanese, and ▶. A note can be Japanese only, a 「英語で何て言う？」 question for you. Closing the editor keeps what she wrote; deleting takes one confirmation. Notes are part of her saved progress, so backups carry them.
- **The voice.** A note whose English matches any Heart clip (a lesson line, a word block, or one you voiced) plays in Heart. Anything else is read by the iPhone's own English voice, at natural speed, labelled 「iPhoneの声」 so she knows it is different (you confirmed this exception to "Heart only", 2026-11-16). It never reads English with a Japanese voice: a phone with no English voice gets a message saying where to add one in the iPhone's settings (this PC has only Japanese voices, which is how that case was found and checked).
- **Getting notes the Heart voice.** 「メモを送る」 sends you every note, and ends with the English that has no Heart voice yet. Add those lines to `src/content/notes.ts`, run the audio tool, and after the update they play in Heart (README, "Giving her notes the Heart voice").
- **From the notebook:** a learned phrase's sheet has 「メモに追加」. **The self-check** has a row for the notes' voice, and its report names the phone's English voices.
- **Checked:** unit tests for notes, the Heart lookup and the phone's voice (including a voice that never finishes and a phone without English voices); a WebKit check that writes, changes and deletes a note on two phone sizes; and the screens at phone size.
- **Fixed from step D's review** (12 problems, all closed, plus four suspicions): a note she was writing was lost if she left by the menu bar or iOS closed the app while she was copying from LINE (it is now kept however she leaves); pasting with nothing copied wiped a note's English; a note "Ready." played the question "Ready?"; a "now playing" mark could stay on after its sound stopped; restoring an older backup dropped newer notes (they are now merged, and starting over keeps notes); a full notebook could trap her in the editor; messages scrolled out of view; text boxes were small enough for iPhone to zoom; and the iPhone's copy and paste menu, a paused voice after the background, and a slow first voice are handled.

### Step E: what was built

- **Three packs around the visit (2.12),** 27 new phrases, so everything in 2.12 except her name is now taught. **Pack 2 ごはんの時間** (Kurimanju on stage): "Want some more?" → "Yes, please." / "No, thank you."; "Have you eaten?" / "Eat already?" → "Yes." / "Not yet."; "How is it?" → "It's good!"; spicy, full, a drink, "Try this!", "Let's eat!", and "Thank you! It was delicious!" for ごちそうさま. **Pack 3 友だちの家族と** (Shisa): "Welcome!", "Nice to meet you!" → "You too!", "Hi, Auntie!" / "Hi, Uncle!" for her friend's parents, "This is for you." for her おみやげ, "How are you?" → "Good, thank you.", "Where are you from?" → "Japan.", "Tired?", "Thank you!" → "You're welcome.", "Sorry!" → "It's OK.". **Pack 4 おうちで** (Rakko): understand "Come in.", "Sit down.", "Wait.", "Let's go!", "No need!"; say "Where is the toilet?", "I don't understand.", "Can I help?", "Excuse me.".
- **Only Hachiware talks,** as in the original; each pack's friend acts on stage between him and Chiikawa. Three friends fit at phone size (checked).
- **The teaching order (2.12):** the family essentials come first ("Want some more?" on day 3, "Nice to meet you!" day 4, "How are you?" day 5); each new reply is paired with something lighter; the app's teacher talk ("Listen", "Say it", "Next") comes last. At two a day the 45 phrases take 23 days.
- **Contrast pairs (2.4):** in "what does it mean?", one wrong choice now sounds like what she heard ("Sorry!" against "Sorry, what?", "Time to eat!" against "Time to go!", "Are you OK?" against "Are you tired?"), so one familiar word is not enough.
- **Replies that also fit** were updated across the old packs, so a new reply that is a fine answer (for example "Not yet." to "Ready?") is never marked wrong.
- **The voice's own mistake:** its pronunciation dictionary read "Excuse me" with the noun's s (エクスキュース). The audio tool now respells such words for the voice only, so it says the verb's z; the screen still shows "Excuse me.".
- **Checked:** tests (new ones for the contrast choices), the three new casts and the quiz at phone size, the build and the WebKit smoke test, and an independent review of the new Japanese. It found 10 problems, all fixed. The worst: the "You're welcome" note told her to say it while handing over her gift; Auntie/Uncle was explained as for anyone older (it is for her friend's parents' generation; calling someone a few years older "Auntie" makes them feel old); "Nice to see you!" (for people you have met before) was taught as a first-meeting line; and "No, thank you." was glossed 結構です, which sounds cold to a host. The review also showed "This is for you." was only a line she hears, so it is now one she says.
- **The rest of the course** is re-planned in PLAN.md section 5: About me (needs her details), Feelings, Choosing, I like / I want, Going out, Reactions, Describing and asking back, then the rehearsal.
- **Your answers about the family (2026-11-16):** they say "Eat already?" and "Full already?" (kept beside a standard phrasing); they ask "Is it tasty?" (it replaced "Is it nice?"); plain "Auntie"/"Uncle" is right; they answer "Thank you" with "Welcome!", which the "Welcome!" phrase and word now also explain as どういたしまして (not a second quiz item: both meanings have the same sound, so the quiz would have two right answers); and they say "No need!" when she offers to help, now a phrase she hears in Pack 4, taught the same day as "Can I help?".
- **Needs you:** her name, home town, job, likes, what she cannot eat and length of stay, for "About me"; and a listen to the new lines on `/review.html`.

## Verdict

It is not ready for her. It shows the idea working, but it has five structural problems:

1. **She has no control and no map.** No menu, no pause, no way back, no list of what she has learned.
2. **There is far too little to do, and it trains the wrong thing.** The content lasts five days, and the exercises can be passed by matching meanings without listening or speaking.
3. **It will probably freeze or go silent on a real iPhone**, and it cannot tell us why.
4. **The Japanese reads like a children's book**, and a few lines teach a wrong meaning.
5. **Safety checks the plan promised were never done** before I called the first version built.

Worth keeping as it is:

- The 3D friends and their look.
- Hearing a phrase twice before any text appears.
- The replay button that turns into "Sorry?".
- Misses that are never punished on screen.
- Saving after every step, and the review-schedule maths (a test of 24,864 simulated sessions with random misses, quits and skipped days found no corrupted progress).
- Offline use and the update check.

## 1. Control and navigation

All confirmed by using the app.

| # | Problem | What she experiences | Fix |
|---|---|---|---|
| 1.1 | No map | The home screen has two controls: start and settings. Half the panel is empty. | A menu bar with four places (see the proposal below). |
| 1.2 | No pause | Every step runs on timers. A Meet step plays for 10 to 20 seconds with no way to hold it. | A pause button in every lesson step. |
| 1.3 | No way back | She cannot return to the previous step or hear an explanation again. Hachiware's "when to use it" line is replaced after 5 to 7 seconds and cannot be brought back. | A back button; the explanation stays on the card. |
| 1.4 | Quitting loses her place | ✕ exits at once with no question. I quit halfway through the first exchange and the home screen greeted me as a new user and replayed it from the start. | Ask before quitting, save the position, and offer つづきから on the home screen. |
| 1.5 | Leaving the app mid-step | The script carries on without her. The clip that was cut is never replayed, and Catch can enable its choices with the question unheard. | Pause automatically when the app leaves the screen; resume the step from its start. |
| 1.6 | No revising by choice | Nothing lists what she has learned. There is no way to pick a phrase and practise it. | A notebook of every learned phrase (below). |
| 1.7 | Extra practice is the same six every time | もっと れんしゅう always picks the same six items until a daily review reorders them. In a simulated month the first six app words came up on 22 to 25 of 30 days, and "Thank you!" on 2. | Let her choose what to practise; rotate fairly. |
| 1.8 | One shared replay button | It replays only the line that played last. The main phrase cannot be replayed once a variant has played, and tapping a card does nothing. During the script, a tap on it fights the script's own clips. | Every line plays when tapped. |
| 1.9 | A mislabelled button | After answering, the red button says もう一回 but does not repeat anything. It marks the answer as failed and moves on. | Label it 言えなかった, and add a real replay of the model answer. |
| 1.10 | Grading buttons appear under her finger | The two grading buttons appear, already live, where the button she just tapped was. A double tap grades the answer before she has heard the model. | Keep them disabled until the model answer has played. |
| 1.11 | The start button does not say what it starts | It reads いいよ！. Nothing says what today holds or how long it takes. | Show reviews, new items and minutes; label the button plainly. |
| 1.12 | No introduction | 「あいて」「おてほん」「ちいかわの答え」 are never explained. There is no sound check before lesson one, so a muted phone gives a silent lesson with no warning. | A one-minute first-run tour with a sound check. |
| 1.13 | Important text scrolls out of view | New cards scroll the list to the bottom, so the main phrase and its reading slide under Hachiware's bubble while a minor variant stays in full view. On a small iPhone (375 × 667) about 113 px is left for cards that need about 180 px. | Keep the main phrase pinned; shrink the stage on short screens. |
| 1.14 | No backup, restore or reset | Progress is one item of saved data inside the home-screen app. Removing the icon or changing phone loses everything. | Export and import in settings. |

### Proposed structure

Keep the friends and the conversational feel inside lessons. Put a conventional shell around them.

**A menu bar at the bottom, visible everywhere except inside a lesson:**

| Place | What is there | Host friend |
|---|---|---|
| 今日 (Today) | Today's lesson with what it contains and how long it takes, a はじめる or つづきから button, and the stamp card. | Hachiware |
| ノート (Notebook) | Every phrase she has learned, grouped by situation. Tap a row to hear it. Open a phrase to see all its versions, the replies and when to use it, then もう一度習う (learn it again) or 練習する (practise it). A second shelf holds her own notes (section 7). | Furuhonya |
| 練習 (Practice) | Practice she chooses: weak phrases, everything mixed, or one pack; listening only or speaking only. | Usagi |
| 設定 (Settings) | Settings, backup and restore, the self-check, the install guide. | none |

**Inside a lesson:**

- **Pause** stops the sound and the timers. From the pause sheet: つづける, このステップを最初から, 前のステップへ, やめる.
- **Automatic pause** when the app leaves the screen or the sound is interrupted, so nothing plays to an empty room.
- **Back** returns to the previous step. Results already recorded stay.
- **Every line and card plays when tapped.**
- **Quit asks first**, and the position is saved so つづきから resumes at the same step.

## 2. Teaching design

Confirmed by running the real session code through simulated weeks, unless marked.

| # | Problem | Evidence | Fix |
|---|---|---|---|
| 2.1 | Far too little to do | At the default four new items a day, all 18 exchanges are used up on day 5. Days 6 to 12 are one to two minutes. Days 13 to 15 and 21 to 31 have nothing due, and on those days no stamp can be earned. Two weeks total about 23 minutes against a budget of 140 to 210. | About two new items a day, each practised far more. Fill the session to ten minutes with mixed practice. Stamp practice days. |
| 2.2 | The app's pace does not fit the content plan | The setting allows 21 to 35 new items a week. The plan supplies about 10. | Match them: fewer new items a day, or larger packs. |
| 2.3 | Speaking is trained least and never checked | Each reply gets three repetitions and one self-graded answer, then one answer per review: about ten times in the whole course. Day 1 has no speaking at all. 言えた！ can be tapped in silence. | More repetitions with the text hidden for the last ones; say it again after the model; a three-way rating; your ear on the weekly call as the real check. |
| 2.4 | The listening step can be passed without listening | On a new item, Catch offers the meaning she read seconds earlier. In review it is a one-in-three guess, and the choices are on screen before the sound plays. Most of the 18 are also loanwords she already knows. | Show the choices after the sound. Add items answered by choosing the reply. Contrast phrases that sound alike. |
| 2.5 | The longer replies are never taught | "Nice to meet you.", "One more time, please." and "Good morning!" have audio, but no lesson step shows them. | Teach them once the short reply is solid, as the plan said. |
| 2.6 | The first days go to app words | Her first spoken word is "OK!" on day 2. "Hi!", "Sorry?" and "Thank you!" arrive on day 3. Seven of the 21 app words (Listen, Say it, Your turn, Look, Yes, No, Thank you) are taught and then never used by the app. | Day 1 is Hi!, Thank you!, Sorry? and Are you OK?. Spread the useful app words through the first week, and use every one that is taught. |
| 2.7 | The English that appears is shown but never spoken | The plan said switched words would also be played aloud. They are not, and the friends' instructions stay Japanese. | Play switched words; switch the short instructions too. |
| 2.8 | The 英語度 meter is finished in the first week | It reaches 100% on day 6. One missed review flips a button back to Japanese at once; in a run with misses it fell from 100% to 76% on day 9. | Tie it to the whole course, and never switch a word back. |
| 2.9 | The review schedule ignores the trip date | "Sorry?" learned on day 3 comes back on days 4, 6, 10, 18, 34 and 66: once in the last six weeks. | Cap the gap at about ten days, and add a pre-trip review period. |
| 2.10 | The daily limit on new items is not daily | Quit after three of today's four new items, start again, and four more are offered. | Count items first met today. |
| 2.11 | A lesson left open overnight is filed under the next day | Yesterday gets no stamp, and today's real session cannot be started. | Rebuild the plan when the day has changed. |
| 2.12 | Home-stay essentials are missing | Not in the first 18: Yes, please / No, thank you; I'm (name); How are you?; I don't understand; Sorry (apology); Eat already?; Come, sit, eat, wait; Toilet?; You're welcome. "Listen", "Say it", "Next" and "Once more" are teacher talk the family will not use. | Reorder the first packs around the visit. |
| 2.13 | The highlighting is untested | 31 of the 41 lines she hears are a single block, so the whole line is highlighted and it says nothing. | Judge it on Pack 2, which has real sentences. |

## 3. Japanese and readings

| # | Problem | Fix |
|---|---|---|
| 3.1 | **Written for a small child.** 136 strings are almost all hiragana with spaces between words. The Chiikawa manga itself uses ordinary kanji and kana. It is also inconsistent: 準備中 beside じゅんび, 開く beside ひらく. | Normal adult Japanese: kanji for everyday words, no spaces, short sentences. Hachiware stays casual in bubbles; settings and guides use plain です・ます. |
| 3.2 | **"I don't know." is glossed 「わからない」**, which also means "I don't understand". She would say "I don't know" when she has not understood. | 「知らない」, with a line explaining that "Sorry?" is for not catching the English. |
| 3.3 | **"Good night!" is used as the evening hello** between 21:00 and 04:00 once learned. English only says it when parting. | Use "Hi!" in the evening; keep "Good night!" for the goodbye. |
| 3.4 | **"Done!" is glossed 「言えた！」** on the grading button, while the lesson teaches Done = おわり. | Keep the grading buttons Japanese. |
| 3.5 | **「やあ！」 for Hi!** is dated, male speech, and is given as her own greeting. | 「こんにちは！」. Also warn that "Hi" sounds like はい. |
| 3.6 | **Yes. / No. are 「うん。」「ううん。」**, one character apart, and too casual for her friend's parents. | 「はい。」「いいえ。」 |
| 3.7 | **Her required morning reply is "Morning!"**, with "Good morning!" hidden as the optional one. | Swap them. |
| 3.8 | **Seventeen katakana readings mislead** or break the file's own rules (table in Appendix B). Several need your ear to settle. | Fix them; mark the rise on "Sorry?". |
| 3.9 | **The reading is the smallest text on the card**: 12 px under 23 px English, though it is the only part she can read. | Make readings larger. |
| 3.10 | **Hachiware's mouth moves into the English audio.** For 13 of 18 exchanges his mouth is still moving for 0.07 to 0.46 seconds after the clip starts, which breaks your rule that the voice is never a friend's voice. | Stop the mouth when a clip starts. |

Every other Japanese line was translated back to English blind and matched. The full list of string fixes is in Appendix A.

## 4. iPhone risks

Nothing here can be confirmed without an iPhone. The code facts behind each item are confirmed; the iPhone behaviour is predicted from WebKit bug reports and Apple's release notes (sources at the end).

| # | Risk | What she would experience | Fix |
|---|---|---|---|
| 4.1 | **Sound dies after any interruption** (lock, app switch, call, Siri, alarm). The audio code waits forever for the sound system to resume, and every step unlocks its buttons only when its sound finishes. | The lesson freezes with greyed buttons until she force-quits the app. | Time limits on every wait, the known suspend-then-resume workaround, a "tap to continue" layer, and rebuilding the sound system if it stays dead. |
| 4.2 | **The screen locks during a lesson.** iPhone auto-lock is often 30 seconds, and a Meet step runs about 20 seconds without a touch. | The phone dims and locks while she listens, which then triggers 4.1. | Keep the screen awake during lessons. |
| 4.3 | **Silent mode rests on one setting with no fallback.** Phones in Japan usually sit in silent mode. | If that setting does not work inside a home-screen app, she hears nothing. | Prepare a second way of playing sound, and have the self-check tell us which works. |
| 4.4 | **iOS 26.0 and 26.1 had a bug: sound in home-screen apps worked only on the first run.** Fixed in 26.2. | First lesson fine, every later one silent. | A self-check row for it; if it fails, she updates iOS. |
| 4.5 | **Progress is one saved item inside the home-screen app.** Safari and the home-screen app do not share it, and the app asks iOS to protect it only if she opens the self-check. | Deleting the icon, or a new phone, starts from zero. | Ask for protection at start-up; add export and import before she has a week of progress. |
| 4.6 | **The first open from the home screen needs the internet** and re-downloads everything, with nothing to show when offline use is ready. | Opened offline the first time, she gets Safari's error page. | Say so in the install guide; show "preparing" until ready. |
| 4.7 | **The self-check cannot tell us what we need.** Recent iOS versions report a frozen version number, so 26.1 and 27.1 both read as 18.x. It also cannot say whether the 3D or the flat stage is running, so its 3D row can pass on the flat stage. | Every diagnosis by LINE takes extra rounds. | Report feature probes, the stage in use, the sound system's state, screen sizes and cache versions. |
| 4.8 | **Any stray error ends the lesson.** Every uncaught error goes to the error screen, including a failed update check on a shaky connection. If the 3D code fails every frame, reloading returns to the same error although the flat stage would have worked. | 「ごめんね、うまく うごかなかった…」 on an app that is fine, or an app that cannot be used. | Keep the lesson on screen for non-fatal errors; catch 3D errors and fall back to the flat stage. |
| 4.9 | **A blank screen with no way to report.** The build needs iOS 16.4 or later; an older iPhone cannot read it at all. | A cream screen and nothing else. | A tiny start-up check that shows a Japanese message if the app has not started in eight seconds. |
| 4.10 | **One update path can leave アップデート中 up for good**; an update can also reload the self-check while she is answering it. | A covered screen on every launch. | One time limit for both paths; apply updates only on the home screen. |
| 4.11 | **The sound files lack a length header.** Safari has misread such files' lengths before. | Long dead air after clips, or clipped endings. | Re-encode with the header; pass the known length when playing. |
| 4.12 | **Small things:** "Reduce Motion" would make the listening indicators flicker; landscape pushes the buttons off-screen; the copy fallback for reports fails silently; the 3D scene never pauses when idle, though the plan said it would. | Minor, but each is a support message. | Listed for the hardening pass. |

## 5. Code defects not listed above

| # | Problem | Fix |
|---|---|---|
| 5.1 | Two sounds can overlap, and a clip from a step she has left can play on the next screen. | Number each play request and drop stale ones. |
| 5.2 | A clip that fails to load is skipped silently, and a silent Catch still records a result. | Show a notice; do not grade unheard items. |
| 5.3 | After a wrong answer on "Sorry?" or "Slowly, please.", Hachiware says "listen to the key part", then there are 2.4 seconds of silence. | Skip that line when there is no key part. |
| 5.4 | Every build counts as a new version even when nothing changed, so each push forces a full re-download. | Take the version from the content. |
| 5.5 | The automated tests miss most of this. The audio test checks a list, not that the files exist; the review-cap test passes with the cap removed; nothing tests the lesson flow, sound or updates. | Test real files and the lesson flow. |
| 5.6 | Unused code: seven app words, the longer replies, the stage pause, and several small helpers. | Use or remove. |

## 6. Promised in the plan, not done

- **Tests in Safari's engine on your PC.** Never set up, so no part of the app has run in anything but Chrome.
- **The review page** for you to hear each line with its highlights. Not built, so you have not checked Packs 0 and 1 by ear.
- **The back-translation check** of my Japanese. First done now, by this review.
- **Backup, the partner page for your weekly call, and tap-to-explain.** Planned for the second phase; listed here because the review shows the first two are needed sooner.
- **A clean self-check report from her phone.** The plan made this the condition for calling the foundations done. It has not happened.

## 7. Your notes idea

Yes, it is worth having, as the second shelf of the notebook.

- **What a note holds:** an English word or sentence, her own Japanese note, and a play button.
- **How notes get in:** typed, pasted, or starred from a lesson. She cannot spell English, so the realistic source is you: you send a phrase on LINE, she copies it and pastes it in. She can also write a Japanese-only "how do I say…?" note to ask you on the call.
- **The voice is the trade-off.** Lesson audio is made in advance on your PC, so free text cannot use Heart. A note would be read by the iPhone's own built-in English voice. It works offline but sounds different and more robotic, and it needs checking on her phone.
- **No katakana reading** for notes at first; a reliable one cannot be generated on the phone. *Changed 2026-11-17:* readings are now made on the phone (see Katakana readings for notes, at the top).
- **Promotion:** notes she marks can be shared with you, and I can turn them into proper lesson items with Heart audio in the next pack.
- **When:** after the menu and notebook exist, because it lives inside them.

## 8. Suggested order of work

| Step | What | Why this order |
|---|---|---|
| A | **Structure and lesson redesign together:** the menu, the notebook, pause, back, resume, tappable lines, and the new shape of a daily session (sections 1 and 2). | Navigation and teaching both reshape the same screens, so doing them separately means building them twice. |
| B | **iPhone hardening:** sound recovery, screen stays awake, proportionate errors, backup, a self-check that can diagnose, tests in Safari's engine (sections 4 and 5). | Independent of A; can run alongside. |
| C | **Japanese rewrite and readings** (section 3 and the appendices). | Independent of A and B; some readings need your ear. |
| D | **Notes** (section 7). | Lives in the notebook from A. |
| E | **Content:** Pack 2 onward, reordered around the visit. | Last, so new packs are written for the fixed exercises. |

Her start date should move rather than give her this version.

## 9. What to ask her now

These settle several iPhone risks before any code is written: her iPhone model, iOS version, Auto-Lock setting, whether Low Power Mode, Reduce Motion and rotation lock are on, and her default browser.

## Appendix A: string fixes

| Location | Current | Problem | Suggested |
|---|---|---|---|
| pack1.ts p1-dunno | 「わからない。」「ごめん、わからない。」 | Also means "I don't understand". | 「知らない。」「ごめん、知らないんだ。」 when: 「答えを知らないときはこれ。英語が聞き取れなかったときは "Sorry?" だよ。」 |
| Home.svelte, 21:00–04:00 | "Good night!" as the hello | Teaches Good night = こんばんは. | Use "Hi!" at night; "Good night!" on the finish button at night. |
| ui.ts done | "Done!" with 「言えた！」 | The lesson says Done = おわり. | 「できた！」, or keep the rating buttons Japanese (「言えた」「まだ」). |
| pack1.ts p1-hi; ui.ts hi | 「やあ！」 | Dated, male. | Hi! / Hello! 「こんにちは！」, Hey! 「やっほー！」 when: 「朝でも夜でも使える気軽なあいさつ。音は日本語の「はい」と同じだけど、意味は「こんにちは」！」 |
| pack1.ts p1-understand | 「うん。」「ううん。」 | One character apart; too casual. | 「はい。」「いいえ。」 |
| pack1.ts p1-dunno heard | "Any idea?" 「なにか 知ってる？」 | Loose. | 「何か心当たりある？」 |
| pack0.ts p0-say when | 「あなたが 話す番だよ、という合図。」 | Fits "Say it." only. | 「"Say it." は「言ってみて」。"Your turn!" は順番が来たとき全般に使うよ。」 |
| pack0.ts p0-done when | 「…食べおわった時にも きくよ。」 | きくよ reads as "I will ask". | 「終わったときのことば。食事のあとに "Finished?"（食べ終わった？）と聞かれることも多いよ。」 Add "Finished?" → "Yes." / "Not yet." |
| pack0.ts p0-good when | 「旅行中 たくさん きけるはず！」 | きける reads as "can ask". | 「旅行中もよく耳にするはず！」 |
| Home.svelte | 「いまは おさらいだけ！ あたらしい ことばは もうすぐ とどくよ。」 | Shown when nothing is due. | 「今日の復習はなし！ 新しいフレーズはもうすぐ届くよ。」 |
| Home.svelte | 「きょうは ふくしゅう 12こと あたらしい ことば 4こだよ。」 | 「12こと」 reads as こと. | 「今日は復習が12個、新しいフレーズが4つだよ。」 |
| Catch.svelte | 「おしい！ だいじな ところだけ きいてみよう」 | False for the 31 single-block lines. | 「おしい！ もう一回、よく聞いてみよう」 |
| Catch.svelte | 「もう一回 ぜんぶ きくよ」 | Subject unclear. | 「今度は全部通して聞いてみよう」 |
| Meet.svelte | 「こたえは このどれか！」 | Only ever two choices. | 「答えは、このどちらか！」 |
| Answer.svelte | 「…言えたら こたえを きこう」; button 「こたえを きく」 | こたえ is both her answer and the model. | 「声に出して答えてね。言えたら、お手本を聞こう」; 「お手本を聞く」 |
| Shadow.svelte | 「いっしょに 声に出して 言ってみよう！」 | Nobody can speak together with a 0.7-second clip. | 「お手本のあとに続けて、声に出して言ってみよう！」 |
| Shadow.svelte | 「いいかんじ！ 声に出すと おぼえるよ」 | Praise for something unheard. | 「おつかれさま！ 声に出すと覚えやすいよ」 |
| blocks.ts You, note | 「"Are you" を はぶいた言い方。」 | "You OK?" drops only "Are". | 「"Are" をはぶいた言い方。」 |
| InstallGuide.svelte | 「LINEの 中では ホーム画面に 追加できないの。」 | 〜の。 is a child's or mother's ending. | 「LINEの中では、ホーム画面に追加できません。」 |
| InstallGuide.svelte | 「ホーム画面から ひらくと、記録が しっかり 残るよ（Safariとは 記録が べつに なります）」 | Casual and polite mixed. | 「ホーム画面から開くと、記録がしっかり残ります（Safariで開いたときの記録とは別になります）。」 |
| Settings.svelte | 「日本語に ぜんぶ もどす」 | Word order. | 「表示をすべて日本語に戻す」 |
| Settings.svelte | 「よみがなを ずっと 出す」 | よみがな means furigana on kanji. | 「カタカナの読みをずっと表示する」 |
| Settings.svelte | 「1日の あたらしい ことば」 | Not clearly a number. | 「1日に習う新しいフレーズの数」 |
| Settings.svelte, report | 「であった ことば」「おぼえた」「しっかり」 | であった reads as "was"; しっかり is not a label. | 「出会ったフレーズ」「覚えた」「定着した」 |
| pack1.ts p1-bye | 「わかれる時」 | Misread beside わかる. | 「別れるとき」「さよならのあいさつ。手を振って "Bye!"」 |
| pack1.ts p1-slowly | 「はやすぎたら」「はやすぎて わからない…！」 | 早い or 速い; blurs not catching with not knowing. | 「速すぎるとき」「速すぎて聞き取れない…！」 |
| pack1.ts p1-sorry when | 「わからない時は…すぐ "Sorry?" って きこう。しり上がりに…」 | きこう is ask or listen. | 「聞き取れなかったら、わかったふりをしないで、すぐ "Sorry?" と聞き返そう。語尾を上げて言うのがコツ！」 |
| pack0.ts p0-next | "Next one!" 「つぎの！」 | Unfinished. | 「次、いこう！」 |
| pack1.ts p1-night | "Sleep well!" 「よく寝てね！」 | Literal. | 「ぐっすり寝てね！」 |
| Finish.svelte | 「よく がんばったね！」 | Teacher to child. | 「今日もおつかれさま！」 |
| SelfCheck.svelte | 「消えにくい 保存」「ふつうの 保存」 | Odd phrases. | 「保存（保護あり）」「保存（通常）」 |
| SpeakerCard and badges | 「あいて」「おてほん」「ちいかわの答え」 | Kana labels; the badge is never explained. | 「相手」「お手本」「短い答え」 |

## Appendix B: readings

Phonemes are what the generated voice says, from the audio list. Rows marked "ear" need you to listen.

| Block | Current | Phonemes | Problem | Better |
|---|---|---|---|---|
| see you | シー ユー | sˈiː juː | シ is "she". | スィー ユー |
| one more time | ワン モア タイム | wˈʌn mˈoːɹ tˈaɪm | Loanword モア. | ワン モー タイム |
| once more | ワンス モア | wˈʌns mˈoːɹ | Same. | ワンス モー |
| don't | ドン | dˈoʊnt | Vowel glide lost. | ドウン |
| yes | イエス | jˈɛs | Three beats. | イェス |
| next | ネクスト | nˈɛkst | Four beats for one. | ネクスッ |
| good | グッド | ɡˈʊd | Adds "do". | グッ |
| look | ルック | lˈʊk | Loanword. | ルッ |
| finished | フィニッシュト | fˈɪnɪʃt | Extra beat. | フィニシュト |
| understand | アンダスタンド | ˌʌndɚstˈænd | Loanword. | アンダステァン(ド) (ear) |
| any idea | エニ アイディア | ˌɛni aɪdˈiə | Stress on "di". | エニ アイディーア |
| got it | ガーティッ | ɡˈɑːt ɪt | Breaks the file's own rule. | ガーディッ or ガーリッ (ear) |
| nice to meet you | ナイス トゥ ミート ユー | nˈaɪs tə mˈiːt juː | Strong "to". | ナイス タ ミーチュー (ear) |
| this is | ディス イズ | ðɪs ɪz | Said as one piece. | ディスィズ |
| good job | グッ ジャブ | ɡˈʊd dʒˈɑːb | Long vowel. | グッ ジャーブ |
| Sorry? | サーリー | sˈɑːɹi | Same as "Sorry,"; the rise is the point. | サーリー↗ (ear: does the clip rise?) |
| hi | ハイ | hˈaɪ | Accurate, but it is the word はい. | Keep; warn in the when-line. |

Also: readings never show linking across blocks ("Look at this!"), and no stress is marked although the audio list carries it.

## Sources for section 4

- [WebKit bug 281566: AudioContext.resume() never resolves after backgrounding](https://bugs.webkit.org/show_bug.cgi?id=281566) (I re-read this one; status open, workaround confirmed)
- [WebKit bug 276016](https://bugs.webkit.org/show_bug.cgi?id=276016), [263627](https://bugs.webkit.org/show_bug.cgi?id=263627), [283419](https://bugs.webkit.org/show_bug.cgi?id=283419), [291892](https://bugs.webkit.org/show_bug.cgi?id=291892), [295518](https://bugs.webkit.org/show_bug.cgi?id=295518), [237322](https://bugs.webkit.org/show_bug.cgi?id=237322), [298260](https://bugs.webkit.org/show_bug.cgi?id=298260), [244812](https://bugs.webkit.org/show_bug.cgi?id=244812), [181849](https://bugs.webkit.org/show_bug.cgi?id=181849)
- Safari release notes: [18.4](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes), [26.0](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes), [26.2](https://developer.apple.com/documentation/safari-release-notes/safari-26_2-release-notes)
- [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [firt.dev: iOS web app compatibility](https://firt.dev/notes/pwa-ios/)
- [LINE URL scheme documentation](https://developers.line.biz/ja/docs/line-login/using-line-url-scheme/)
- [SpeechSynthesis in browsers and OSes](https://readium.org/speech/docs/WebSpeech.html), [Apple forum: voices missing in Safari since iOS 18](https://developer.apple.com/forums/thread/764438) (for section 7)

Apart from bug 281566, these were read by the iPhone reviewer, not by me.
