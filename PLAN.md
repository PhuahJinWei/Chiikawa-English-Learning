# English Learner: plan

Status: building. Approved and started 2026-11-16. After a full review of the first version, the app was restructured (step A: menu, notebook, pause and back, a new lesson shape); see [REVIEW.md](REVIEW.md) for the findings, the revised design and what is still open. Where REVIEW.md and this plan differ, REVIEW.md is current. Not yet run on a real iPhone.
Name: 「えいごフレンズ」 (`eigo-friends` inside the code), repository https://github.com/PhuahJinWei/Chiikawa-English-Learning.

## 1. Goal and ground rules

- **One learner:** your Japanese friend, on an iPhone, starting from no spoken English. She reads Japanese only: the app assumes she cannot read English words.
- **Success (changed 2026-11-16):** she can hold a simple conversation in English, with no deadline. She answers, and she also starts talking herself. Broken English is fine. (The first goal was the Malaysia trip around mid-February 2027; it is no longer the target.)
- **New sentences are built from known ones.** Each step reuses an earlier sentence and changes or adds a little: "See you tomorrow!" → "See you next year!" → "I'll come again next year!".
- **Listening and speaking only.** No grammar lessons, no typing, no reading practice.
- **Whole useful phrases, repeated until automatic.** Person-to-person talk, not counter talk.
- **Speak short, understand a lot.** Her replies are the shortest thing that works. Listening is trained at natural speed and in several phrasings.
- **Ears first, eyes second.** Every English item is heard before any text appears, and nothing in the app requires reading English.
- **Fully on the phone.** No server, no accounts. Works offline after the first open.

## 2. The experience: friends who teach

The app is a conversation with the friends, not a menu with mascots on it.

**Layout, on every screen:** the top half is a stage with the 3D friends. The bottom half is their speech bubble and the learner's reply buttons, inside thumb reach.

How it should feel:

- **They talk to the learner directly**, in speech bubbles, each in their own way of speaking.
- **The buttons are the learner's side of the conversation.** はい / いいえ / もう一回 at first, later Yes / No / One more time. Using the app is itself practice of the short replies.
- **They react with their bodies:** cheer, hop, nod, a worried face. A mistake gets a worried Chiikawa and another try. There is no red ✕ and no lost lives.
- **They explain when asked.** Tap a word block and the friend on stage says what it means and when to use it (see Word blocks in section 4).
- **They take turns.** Each friend has a job in the app and a topic they teach.
- **They remember:** a greeting that fits the time of day, the day count, yesterday's phrases.
- **Home is the friends hanging out.** Tap a friend to do their activity. Friends arrive over the weeks.

### Who does what (first draft: you know the characters better than I do)

| Friend | Job in the app | Teaches |
|---|---|---|
| ハチワレ Hachiware | Host and main teacher: greets, explains, runs the daily lesson. The only friend who talks | Starter pack App words, Pack 1 Survival kit, Pack 11 Asking back |
| ちいかわ Chiikawa | Study buddy: learns beside the learner and shows the short answer. Since 2026-11-17 the first of three partners who take turns, one a day (below) | Pack 6 Feelings |
| うさぎ Usagi | Her partner from English level 2, taking turns with Chiikawa; quick-fire rounds and celebrations | Pack 10 Reactions |
| くりまんじゅう Kurimanju | Meal-table scenes | Pack 2 At the table |
| シーサー Shisa | First meetings and polite phrases | Pack 3 Meeting the family, Pack 5 About me |
| モモンガ Momonga | Her partner from English level 3; demands things, so the learner practises choosing and refusing | Pack 7 Choosing, Pack 8 I like / I want |
| ラッコ Rakko | Level tests and conversations at natural speed | Pack 4 Around the house, Pack 9 Going out, rehearsals |
| 古本屋 Furuhonya | Keeps the notebook of everything learned, replayable any time | Pack 11 Describing |

**Her partner takes turns (your idea, 2026-11-17).** Hachiware does all the talking; beside him is her study partner, who learns with her (worried at a miss, happy at a right answer, acting out what she says). Chiikawa first; うさぎ joins at English level 2 and モモンガ at level 3, and then they take turns, one a day. A friend's first day as her partner starts with 「今日から○○も一緒だよ！」, the lesson that reaches the level shows who has joined, and Today's level meter names the friend who joins next. Each partner reacts in character, and none of them talks.

**Two answer levels, named after the friends.** Chiikawa says little and Hachiware talks a lot, which is the same split as our short and longer replies:

- 「ちいかわの答え」: the short reply. Required.
- 「ハチワレの答え」: the longer reply. Optional, unlocks once the short one is automatic.

**Voices.** All English audio is generated in natural-sounding American voices, made once on your PC (see Audio in section 7). Nobody needs to record anything.

**The generated voices are never the friends' voices.** Chiikawa and the others do not speak with them. English audio belongs to "the people you will meet": it comes from a speaker card on screen, not from a friend's mouth. While it plays, the friends listen (paw to ear), act out the meaning and react, and their mouths do not move. The friends themselves only ever talk in text bubbles with a soft blip sound, in Japanese at first and in English text later. Nothing imitates the anime voices, and no audio or art is taken from the anime: only the 3D models from your RPG, plus interface art drawn to match.

## 3. Japanese → English shift

The app starts in Japanese and turns English piece by piece, only ever using English the learner has already been taught. Because she cannot read English, every English text carries a small katakana reading until she knows it by ear.

- Every piece of interface text exists in both languages, with a list of the phrases the learner must know before it may switch.
- Each text has four stages:

| Stage | Shown | When |
|---|---|---|
| 1 | もう一回 | From the start |
| 2 | One more time, with the reading ワン モー タイム above and small もう一回 below | Its phrases are learned (first next-day review passed) |
| 3 | One more time, with the reading above | Its phrases are mastered (8-day review passed) |
| 4 | One more time | Its phrases passed the 16-day review |

- **The app's own words are taught first.** A starter pack teaches Listen, Say it, Next and the other words the app uses, so its instructions are able to switch early. Without it they never could.
- **Readings** are katakana written to match how the words really sound in the audio, not the usual loanword spelling (for example ウォン サム モー for "Want some more?"). They are a crutch that fades. A setting keeps them on for good.
- **Order of switching:** reply buttons, then the friends' praise and reactions, then instructions (Listen / Say it / One more time), then greetings and small talk, then the questions themselves (a Japanese cue becomes a spoken English question), then menu labels.
- **Spoken as well as shown.** Once a line has switched, its English is also played from the speaker card, so instructions become listening practice. It is still not the friend's voice. The spoken English is the real target; the text is a label.
- **Only checked answers count.** The switch is driven by answers the app can check (Catch, and choosing a reply), not by the 言えた button she presses about her own speaking.
- **Safety nets:** press and hold any English button to see the Japanese and hear it. Settings and anything about saved data stay Japanese for good. One switch in settings brings all the Japanese back.
- **「英語レベル」 meter** on the home screen: one level for every ten phrases learned (until 2026-11-16 it was 「英語度」, a share of a fixed course). It never fills up and never drops.
- **The long-term target:** a lesson runs almost entirely in spoken English.

## 4. How learning works

**The unit is an exchange**, not a single sentence:

| Part | Example |
|---|---|
| Heard: 2 to 3 phrasings, natural speed, including the way your family says it | "Do you want some more?" / "Want some more?" / "More?" |
| Said, ちいかわの答え | "Yes, please." / "No, thank you." |
| Said, ハチワレの答え | "I'm full." |
| Scene | Kurimanju eating and offering the plate, heart mark |

**Learning a new exchange** (a friend leads each step):

1. **Meet:** the friend acts it out. The audio plays twice before any text appears. Then the phrase appears as word blocks with the Japanese meaning, the friend gives one line on when to use it, and it plays once more. Other ways of saying it, and for an exchange she answers the reply (heard before it is shown), each get a page of their own inside the step, so every page fits the screen (2026-11-17); 次へ and ← 前へ move between them. The friend asks her to say it out loud, in her own time: every card replays as often as she likes. All audio is at natural speed: no slow versions (your decision, 2026-11-16). If she already knows the phrase, 「もう知ってる」 (a small link on the phrase's card, in the daily lesson only) counts it as learned: today's steps for it are dropped, and it comes back for a first check in about four days. A miss then sends it back to be learned as usual (2026-11-17).
2. **Catch:** hear a line and choose what it means. No text is shown. This is checked by the app.
3. **Answer:** the question plays from the speaker card with no text, while the friend listens with her. The learner answers aloud (the card says the English appears after checking, and not knowing is fine), taps 「答え合わせ」 to hear and see the model answer, says it again if she likes, then taps 言えた, 迷った or 言えなかった. The phone does not score speech.

**Putting phrases together: 会話してみよう (2026-11-17, your choice after the learning review).** Each phrase above is practised on its own, always after the same cue. A short conversation strings learned phrases into a scene (Hi! → How are you? → Good, thank you. → See you later! → Bye!), so she practises keeping a conversation going and starting one. It builds up like a chat: the other person's lines play with no text; on her turn she sees in Japanese what she wants to say, says it in English, then checks against the model. Conversations are made only of lines from the path (src/content/talks.ts), so they need no new audio. One comes up in each day's lesson once she has learned every phrase it uses (and said her own lines once), the one done longest ago first, and 練習 has a 会話 choice. They are practice: nothing is graded and the review schedule does not move. You review them in the content sheet (C1, C2, ...).

There used to be a timed repeat-after-me step (Shadow, 「まねして言う」) between Meet and Catch. You dropped it on 2026-11-17: she already says the phrase herself in Meet, and a timer telling her when to speak was more in the way than useful. Answer lost its timed "say it once more" pause for the same reason.

### Word blocks

This replaces underlining. Grammar is never marked; the blocks worth catching are.

**What a block is.** Every English line is built from one shared list of blocks, so the same block always looks, sounds and is explained the same way. There are six kinds:

| Kind | Examples | Highlighted? |
|---|---|---|
| Opener: starts a sentence and shows its type | Do you / Are you / Is it / I'm / I don't / Let's | Never |
| Question word: tells her what kind of answer is wanted | What / Where / Which one / How long | Always |
| Content: an action, thing, feeling or describing word | want / hungry / some more / spicy | Only when it is the topic |
| "Not": flips the meaning | don't / not / can't | Always |
| Tag: adds tone, not something she must catch | please / too / already / or not? / lah | Never |
| Fixed phrase: learned whole | Thank you / See you / One more time / How are you? | As one block |

**Which blocks are highlighted.** Highlights are a listening tool, so they appear only on lines she hears, never on her own replies.

1. Every question word and every "not".
2. The topic: the one block a native speaker would keep if they said the line in a word or two. "Do you want some more?" becomes "More?", so "some more" is the topic.
3. In an A-or-B question, each option.
4. At most two per line, or three when a "not" or a choice is involved. If everything is highlighted, nothing is.

| She hears | Blocks, highlighted ones in bold |
|---|---|
| Are you hungry? | Are you · **hungry?** |
| Do you want some more? | Do you · want · **some more?** |
| Where are you from? | **Where** · are you · **from?** |
| What do you want to eat? | **What** · do you · want to · **eat?** |
| Chicken or fish? | **Chicken** · or · **fish?** |
| You don't want more? | You · **don't** · want · **more?** |
| Eat already? | **Eat** · already? |

**How we know the right block is highlighted.** Choosing the topic is a judgement, so three checks sit behind it:

- **Automated, on every pack:** every heard line has one to three highlights. Two lines that need different replies never share the same highlighted blocks. The phrasings of one exchange normally share theirs. Openers and tags are never highlighted.
- **Your ear:** a review page plays each line with its highlights showing, and you flag any line where the voice does not make the highlighted block stand out. I cannot hear audio, so this check is yours.
- **Her results:** the lines she keeps missing in Catch appear in the progress summary she shares, and get looked at again.

**What she can do with blocks:**

- **Read the sound:** each block has its small katakana reading above it. The highlight covers the reading too, since that is the part she can read.
- **Tap a block** (from Phase 2): it plays on its own, and the friend on stage explains in a speech bubble: the meaning in Japanese, one line on when to use it if there is something worth saying, and other phrases she already knows that use the same block. The explanation is written once per block in the shared list.
- **No grammar terms.** An opener is explained as a pattern, for example 「"Do you ～?" は『～する？』ってきく時のはじまりだよ」.
- **After a miss in Catch:** the friend replays only the highlighted blocks ("…more?") and then the whole line, so she hears what she should have caught.
- **Tap, not hold.** Holding is hidden and fights the iPhone's text selection. Buttons are the exception, because tapping a button has to do its job.
- Blocks can be tapped in Meet and after an answer is given, not during a question.
- Swap frames reuse them: "I like ___" has an empty block to fill.

### Special drills

- **Sorry? drill:** some lines come by surprise, with no warning or text. The right move is "Sorry?", and the line then plays again. This makes asking again a reflex instead of saying "Yes" without understanding.
- **Do it drill:** for lines that tell her to do something ("Sit here", "Try this"). The friends act out different things and she taps the one doing what she heard.
- **Quick-fire (Usagi):** fast mixed questions with a short timer, to make replies automatic.
- **Negative questions** ("You don't want more?"): answered with content ("I'm OK"), not yes or no, because Japanese and English yes/no point opposite ways here.
- **Swap frames** (from Pack 6): "I like ___", "I don't want ___", "Is this ___?" with a word bank.
- **Conversations (Rakko):** chains of 4 to 6 exchanges at natural speed.

**A daily session is 10 to 15 minutes:** greeting chat, review of what is due, 3 to 5 new exchanges, a short conversation, goodbye and a stamp. Extra practice is available any time.

**No daily limit on new phrases (2026-11-17, at your request):** the lesson teaches as many new phrases as set in 設定 (1 to 3, 2 by default). Once it is done, 「もっと覚える」 on the Today screen teaches the next ones in the path, round after round, as many as she likes. A round is recorded like the lesson. A lesson teaches its new phrases as long as the reviews, any conversation and the new phrases fit in about ten minutes, and none while more reviews are due than one lesson holds (30), so the reviews of a big day come first. (Until 2026-11-17 it went by the number of reviews: 1 new phrase from 14, none from 24. That halved the pace from about day 9.)

**Review schedule (as built, 2026-11-16):** each step moves through boxes reviewed after 1, 2, 4, 7, 10 and 20 days, then every 40 days. A miss sends it back to the first box. Understanding and saying are tracked separately. (With the trip, gaps stopped at 10 days and shrank before departure; with no deadline, phrases she knows well come back less often, so the daily review stays short as the course grows.)

## 5. Content

**Reworked 2026-11-16 (after step E), at your request.** The goal is conversation with no deadline, so the content is no longer weekly packs for a trip. It is one **learning path** of steps in teaching order (`src/content/course`), shown in **`content-sheet.html`** for review:

- **A step is one thing she learns:** an answer (she hears, she says), something she says first in a given situation (and what she may hear back), or something she only understands.
- **Steps are built from earlier ones** (`from`): each reuses words she knows and brings at most two new word blocks, checked automatically. Longer answers are now steps of their own, built from the short answer.
- **She learns to start talking,** not only to answer: asking "How are you?" or "What is this?", saying how she feels, suggesting "Let's go!".
- **Every step is a draft until you approve it in the sheet, and no audio is made until the content is decided.** Drafts are never taught; the app teaches a step once it is approved and voiced.
- **Topics** (the notebook's shelves and the friend on stage) are labels, not the order: the path mixes them.
- **The order is one list** (`src/content/course/order.ts`, 2026-11-17): the steps are written in five files, grouped by when they were written, and the list alone decides when she learns each one. Introductions now come early (she meets new people from the start): "Nice to meet you", her name, where she is from and her job by day 5 (two a day), then the guest phrases, then numbers, days and the sentences about herself.
- **All 128 steps are in the app** (2026-11-17): you approved parts 2 to 5, and their audio was made the same day. New content starts as a draft again, and gets audio only once you approve it.

The pack table below is kept as the record of the first plan; part 2 of the path (33 drafts) is the first content written the new way.

A short starter pack, ten weekly packs of about 10 exchanges each, then two weeks of review. In total roughly 100 replies to say and 300 lines to understand (my planning estimate, to adjust to her real pace).

**She understands local, she answers simple.**

- The lines she hears include the way your family really talks, including Malaysian forms. Confirmed (2026-11-16): "Eat already?" and "Full already?", taught beside a standard phrasing. Still for you to confirm or replace: "Can or not?", "Want or not?", and particles such as "lah".
- Her replies stay short and standard, which everyone in Malaysia understands. A few local replies are worth adding because they are even shorter and people enjoy hearing them: "Can." / "Cannot."
- "Auntie" and "Uncle" for older people go into Pack 3.
- If your family mixes other words into English sentences (for example "makan" or "jom"), a small bonus set teaches her to recognise them.

**Built around her.** Pack 3 uses her real details, which you give me once: name, home town, job, what she likes, what she cannot eat, how long she is staying.

**Reordered around the visit (step E, 2026-11-16, REVIEW 2.12).** Packs 2 to 4 now hold the home-stay essentials, so she has them first; "Being told" moved up from the old Pack 7, and the later packs shift along. Only Hachiware talks (in the original the others barely speak), so the friend named for a pack acts on stage beside him.

| # | Pack | Friend on stage | Heard → said (examples) |
|---|---|---|---|
| 0 | App words (starter) | Hachiware | "Listen." "Say it." "One more time." "Next." "Ready?" "Good!" "Done." These run the app; now taught last, among the home-stay phrases |
| 1 | Survival kit | Hachiware | "Are you OK?" → "OK!" Anything unclear → "Sorry, what?" / "Slowly, please." Also "Thank you!", "Hi!", "Bye!", "I don't know." |
| 2 | ごはんの時間 At the table (**written**) | Kurimanju | "Want some more?" → "Yes, please." / "No, thank you." "Have you eaten?" / "Eat already?" → "Yes." / "Not yet." "How is it?" → "It's good!" Spicy, full, a drink, "Try this!", and "Thank you! It was delicious!" in place of ごちそうさま |
| 3 | 友だちの家族と Meeting the family (**written**) | Shisa | "Welcome!" → "Thank you!" "Nice to meet you!" → "You too!" "Hi, Auntie!" "This is for you." (her おみやげ) "How are you?" → "Good, thank you." "Where are you from?" → "Japan." "Tired?" → "A little." "Thank you!" → "You're welcome." "Sorry!" → "It's OK." |
| 4 | おうちで Around the house (**written**) | Rakko | Understand "Come in." "Sit down." "Wait." "Let's go!" "No need!"; say "Where is the toilet?", "I don't understand.", "Can I help?", "Excuse me." |
| 5 | About me | Shisa | Needs her details: "What's your name?" → "I'm ___." "First time here?" → "Yes." Her job, home town, what she likes and cannot eat |
| 6 | Feelings | Chiikawa | "Cold?" (air conditioning) → "A little." "Hungry?" "Sleepy?" "Did you sleep well?" |
| 7 | Choosing | Momonga | "Which one?" → "This one." "Chicken or fish?" → "Chicken." |
| 8 | I like / I want | Momonga | "What do you want to do?" → "I want ___." / "I don't want it." |
| 9 | Going out | Rakko | "Take off your shoes." "Be careful!" "Ready to go?" Shops and prices |
| 10 | Reactions | Usagi | Someone's comment → "Really?" / "Me too." / "Wow!" / "I see." |
| 11 | Describing and asking back | Furuhonya, Hachiware | "How was it?" → "It was fun." "And you?" "What is this?" "How do you say ___?" |
| 12 | Review and rehearsal | Rakko | Arrival day, family dinner, a day out, goodbye |

**How content gets made (since 2026-11-16):**

1. I draft steps as drafts: English built from what she knows, with highlights and readings, natural Japanese meanings, and scene directions. The automated checks run (reuse, highlights, quiz meanings, readings), with no audio.
2. You review them in `content-sheet.html`: keep, change, drop or move, by step number. We repeat until the content is decided.
3. A separate check translates my Japanese back into English without seeing the original, and anything that does not match gets fixed.
4. Only then does the script generate the audio, and the steps go into the app. I publish, and the phone picks up the new version the next time it opens online.

## 6. Look and feel

- **Colours:** a warm cream paper background, the RPG's ink brown (`#66432F`) for all text and outlines instead of black, soft sky blue and blush pink. Each friend has an accent colour for their pack.
- **Shapes (hand-drawn lines since 2026-11-16, your choice):** thick ink-brown outlines drawn by hand, like the friends' own lines: about 3px, a little heavier towards the bottom right and in the corners, with a slight wobble. They are drawn once on your PC as small pictures (`tools/sketch`), so the phone does no extra work for them. Three weights keep the page calm: thick for buttons, speech bubbles, the main cards and the panel's top edge; medium for round buttons, switches, tabs and highlighted words; thin for list rows, page sections, the こんなとき cards and ordinary words. Chips have no line. Large rounded corners, and manga speech bubbles with a drawn tail pointing at whoever is speaking. Cards lie flat; only buttons cast a hard shadow, so what can be tapped stands out. The lesson's stamp is an unevenly inked rubber-stamp ring.
- **Layout ("Focus", chosen 2026-11-16):** the friends' stage is sized to what they do on each screen. Today is a large scene with Hachiware's greeting floating above the friends. In a lesson the friends get a band where they react, and below it one task at a time: the step's name in the top bar (新しいフレーズ, 聞き取りクイズ, 答えてみよう) with ⏸, which opens the lesson's menu, the cards, and one row of buttons. Since 2026-11-17 the band is smaller, only the main card and the main button keep the thick line, and there is no ✕ (stopping is in the menu). The end of a lesson grows back into a scene for the celebration. The notebook, practice and settings are plain pages without the stage (the 3D stops drawing there).
- **Word blocks** look like rounded stickers. Highlighted blocks carry the host friend's accent colour, like a marker pen.
- **Type:** the rounded fonts already on the iPhone (Hiragino Maru Gothic for Japanese, SF Rounded for English), so nothing is downloaded.
- **3D:** the same toon shading and ink outline as the RPG. The friends stand in a meadow like the fields in the Chiikawa anime (since 2026-11-16, your request):
  - A yellow-green field dotted with grass marks, clover and tiny flowers.
  - A band of round trees at the foot of soft grey-mauve mountains, and a big round tree at each side.
  - A pale blue sky with small outlined clouds.
  - Each shape has a light line in a darker shade of its own colour, as the anime's backgrounds do. It is all painted once at start-up, so it costs nothing while the friends move.
  - Later the sky follows the phone's clock, so "Good morning" and "Good night" match the real time of day.
- **Motion:** the friends are always alive: breathing, blinking, looking toward the learner's finger. Buttons squash softly. A celebration is a friend cheering.
- **Sound:** soft pops and chimes only.
- **Thumb-first:** portrait only, large targets in the bottom half, clear of the notch and the home bar.

## 7. Tech

- **Platform:** an installable web app on GitHub Pages, published from a public repo and opened from the iPhone home screen.
- **Stack:** Vite + TypeScript + three.js (same as the RPG) with Svelte for the screens, and a service worker for offline use.
- **Reuse from the RPG:** a one-time copy of `src/characters` (about 7,000 lines), the small pieces it needs (`world/Ink.ts`, `core/toon.ts`, `core/gltf.ts`, the colours, a few constants from `world/Look.ts`), and the 8 models with their face textures. Game-only parts (movement input, crowd, weapons, firelight) are stubbed out. Later changes to the RPG will not flow in automatically.
- **Stage interface:** lessons never touch 3D code. They ask the stage to show friends, play an action, set a face, show a mark, or look somewhere.
- **New gestures the RPG does not have:** nod, head shake, point, shrug, listen (paw to ear). Nod and head shake come first, since Yes and No are in Pack 1.
- **Speech bubbles are HTML** placed over the friend's head, for crisp text and for the readings and two-language display.
- **Block list:** one file holds every block with its kind, reading, Japanese meaning and explanation. Lines are sequences of blocks from that list, which is what makes the automated checks and "other phrases with this block" possible.
- **Data:** progress is stored on the phone, with a backup file that can be exported and restored. Nothing is sent anywhere.
- **Audio:** MP3 files, all generated once on your PC by a script using Kokoro, a text-to-speech engine that runs on your PC with no account, key or online service.
  - **Voice:** one voice only, Kokoro's American female voice Heart (`af_heart`), chosen by you on 2026-11-16 after the voice test passed. A second voice can be added later by changing one setting.
  - **Per line:** one clip at natural speed, plus a clip for each block. No slow versions.
  - **Word timings, if the engine provides them:** blocks light up as they are spoken, and a tapped block plays its slice of the real sentence. If not, blocks get separately generated clips. Checked in Phase 0.
  - **Optional:** an audio file dropped into the project with the right name replaces the generated one for that line, if you ever want to add a real voice.
- **Readings for her notes (2026-11-17):** made on the phone. A pronunciation engine (eSpeak NG, 1.3 MB, loaded only when a note needs it and kept offline) gives the American sounds, and a converter turns them into katakana by the rules of the hand-made readings. A note that is a lesson line keeps its hand-made reading. eSpeak NG is GPL-licensed, so the app is too (decision 7).
- **Self-check screen (in Japanese, 「動作チェック」):** neither of us has an iPhone, so the app tests itself on hers: sound, the silent switch, offline use, saving, 3D speed, and later the microphone. She taps ○ or ✕ where only a person can judge, then shares a short report with you (for example on LINE) and you paste it to me. The report includes the app's version number.
- **Updates:** every time the app starts online it checks for a new version straight away. If there is one, a short 「アップデート中」 note shows and the app switches to it before she begins, so she is never stuck on an old version. Offline or on a slow connection she carries on, and the update switches in later on the home screen, never mid-lesson.
- **Icon:** the star from your Chiikawa PvZ art (`art/portrait_hoshi.png`), on the app's cream paper for the home screen.
- **Install guide:** when the app is opened in Safari instead of from the home screen, it shows picture steps in Japanese for adding it to the home screen.
- **Error screen:** if something breaks, she sees a friendly Japanese message with a button to share the details with you.
- **Partner page (for you):** every released pack's questions in English, in the order she learned them, to ask on your weekly call.
- **Checks on your PC:** automated tests for the review schedule, the language-switch rules and the block rules, a content check that every line has audio, blocks, Japanese and a scene, layout checks in an emulated phone, and the same tests run in WebKit, the engine Safari uses. WebKit on a PC catches some Safari-only problems but is not a real iPhone.

```
src/stage/      3D friends (copied from the RPG) behind the Stage interface
src/app/        screens (Svelte)
src/learn/      review schedule, session builder, saved progress
src/shift/      Japanese → English rules for interface text
src/content/    block list, packs and interface text (English, readings, Japanese, scene directions)
public/models/  the 8 friends and their faces
public/audio/   generated audio
tools/          audio generation, content checks, review page
```

## 8. Phases

Dates are targets and assume building starts on Nov 16. Each day of delay moves them by a day. Learning time matters more than features, so the first version is small and ships early.

| Phase | Dates | What ships |
|---|---|---|
| 0 Foundations | Nov 16–18 | **Voice test first:** samples of the hardest lines (one-word questions like "More?", local lines such as "Can or not?") for you to judge by ear. Project set up. Hachiware and Chiikawa on stage with the RPG's look. Published, installs and opens offline. Self-check screen and install guide in Japanese. Done when her self-check report comes back clean and you are happy with the voices. |
| 1 First lesson | Nov 19–22 | The lesson flow (Meet, Shadow, Catch, Answer), word blocks shown with readings and highlights, the starter pack and Pack 1 with generated audio, Japanese interface, saved progress. No microphone use and no tap-to-explain yet. **Your friend starts on Nov 23.** |
| 2 Daily habit | Nov 23 – Dec 6 | Review schedule, daily session, stamp card, home scene, first English switches (buttons and praise), tap-to-explain on blocks, backup, the partner page. Record and compare, only if her self-check shows the microphone behaves. Packs 1–2 in use. |
| 3 More friends | Dec 7 – Jan 3 | Usagi's quick-fire, the Sorry? drill, the Do it drill, swap frames, Furuhonya's notebook, sky by the clock, sharing a stamp and a progress summary (for example to LINE). Packs 3–6. |
| 4 Conversations | Jan 4–31 | Rakko's conversations and level tests, questions switch to spoken English. Packs 7–10. |
| 5 Rehearsal | Feb 1–14 | No new features. Review, trip rehearsals, fixes only. |

If New Year week is too busy for a new pack, the packs slide by one week and rehearsal shrinks to one week.

## 9. What I need from you

- **Your friend as the tester.** She runs the in-app self-check at each milestone (about 2 minutes) and shares the report with you. If you can borrow any iPhone or iPad for ten minutes now and then, checks get much faster.
- **15 to 20 minutes a week** to review that week's pack: correct the English to how your family really talks, and listen to each line with its highlights showing.
- **Her details, once:** name, home town, job, what she likes, what she cannot eat, how long she is staying.
- **A GitHub repo:** I prepare everything, and you create the public repo and approve each publish.
- **A short weekly call with your friend** using only the phrases learned so far. The partner page gives you the questions to ask. The app is the drill, and you are the conversation. It is also her only practice with a real Malaysian voice, so it matters more now.

## 10. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Generated voices are weakest on very short lines, and most of this course is very short lines | Tested first, in Phase 0, on the hardest lines. Fallbacks: a different voice, or generating the short line inside a longer sentence and cutting it out. |
| The wrong block is highlighted | The highlight rule, the automated checks, your ear on the review page, and her missed lines (section 4). |
| A Japanese meaning is wrong and nobody notices | The back-translation check on every pack, your review if you read Japanese, and her flags when something reads oddly. |
| iPhone web quirks: silent switch muting audio, low volume after recording, repeated microphone prompts | Checked by the self-check on her phone and by WebKit tests on your PC before anything is built on top. The first version uses no microphone. If recording proves unreliable it is dropped, and shadowing works without it. |
| No iPhone on our side, so problems are found slowly and through your friend | The self-check report with its version number, the error screen with a share button, and small releases so a problem is easy to trace. |
| The character code is harder to lift out of the RPG than it looks | Phase 0 is the test. Fallback is simpler friends: model, face changes, and hop, nod and wave only. |
| Katakana readings pull her pronunciation toward katakana English | Sound always comes before text, readings are written to match the real sound, and they fade as each block is learned. |
| One American generated voice does not sound like your family, so real Malaysian speech and other speakers are harder for her than the app | Local phrasings in the lines, your weekly call, and Malaysian videos you send her. Real recordings can still be dropped in later. |
| Motivation fades | Short sessions, the stamp card, the weekly call, sharing stamps with you. |
| Phone gets hot or drains battery | Capped frame rate and resolution. The 3D pauses when nothing moves or the app is in the background. |
| Copyright exposure | Neutral repo and app name, hidden from search engines, character assets kept in one swappable folder. The repo is public by your decision, so the model files in it can be downloaded by anyone. |
| Too many features, not enough phrases | Feature freeze on Feb 1. Packs always come before features. |

## 11. Not in scope

- Grammar lessons, grammar marking or grammar terms.
- Typing or writing exercises, and teaching her to read English. Blocks and readings exist to support listening and speaking.
- The phone scoring speech. This may be revisited after the device tests.
- Accounts, servers, analytics.
- Reminder notifications, which need a server on iPhone.
- Polished Android or desktop layouts. The app will work on your own phone and PC well enough for you to review packs.

## 12. Decisions

Made on 2026-11-16:

1. **Country:** Malaysia.
2. **Name:** 「えいごフレンズ」, repo `eigo-friends` (published as Chiikawa-English-Learning).
3. **Reading:** assume she cannot read English words.
4. **Testing:** no iPhone on your side, so she is the tester.
5. **Voices:** a normal American generated voice, made on your PC. No recordings and no online voice service.
6. **Hosting:** a public repo with GitHub Pages, chosen as the free and simplest option, knowing the model files in it can be downloaded by anyone.
7. **Licence (2026-11-17):** GPL-3.0-or-later, because the pronunciation engine for note readings (eSpeak NG) is under it. Chosen by you over swapping the engine. Chiikawa and its characters are not covered (README, Licence).

Open, and not blocking:

- **How well do you read Japanese?** If well, your weekly review also covers my Japanese. Until you say, the back-translation check and her own flags are the only checks on it.
