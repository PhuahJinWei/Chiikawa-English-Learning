import type { BlockDef } from './types.ts';

/**
 * The one shared list of blocks. Every English line is built from these, so the same block always looks, sounds
 * and is explained the same way. Keyed by lower-case text without punctuation; the same words with a second meaning
 * would get an `@variant` key (see parse.ts).
 *
 * Readings (kana) follow how the American voice says the words, checked against its phonemes in the audio list
 * (REVIEW 3.8): a final t or d that is barely sounded is ッ ("great" グレイッ, "good" グッ), a t between vowels sounds
 * like d ("later" レイダー, "got it" ガーディッ), th is closer to セ/ズ than サ/ザ ("thank you" センキュー), "see" is
 * スィー not シー (she), and weak words are short ("to" タ). [ ] marks the stress (shown with dots above it): in a
 * word, the stressed vowel's kana with a ー or ン that follows it ("again" ア[ゲン]); in a phrase, the whole stressed
 * word ("see you" [スィー] ユー). Readings are a crutch that fades, not something to read aloud forever.
 *
 * Nothing may depend on intonation: the voice never rises at the end of a question (measured 2026-11-16), so the
 * phrase for not catching something is "Sorry, what?", which means "please say it again" however it is said, not
 * "Sorry?", which only does when it rises (the user's choice, 2026-11-16).
 */
const LIST: (BlockDef & { key?: string })[] = [
  // ── Openers: start a sentence, show its type. Never highlighted, never stressed.
  { en: 'Are you', kana: 'アー ユー', kind: 'opener', ja: 'あなたは〜？',
    note: '"Are you 〜?" は「〜なの？」と聞くときの始まり。後に続くことばが大事！' },
  { en: 'Do you', kana: 'ドゥ ユー', kind: 'opener', ja: '〜する？',
    note: '"Do you 〜?" は「〜する？」と聞くときの始まり。これだけでは意味はなくて、質問のしるし！' },
  { en: 'You', kana: 'ユー', kind: 'opener', ja: 'あなた（は）',
    note: '"Are" を省いた、くだけた聞き方。"You OK?" のように使うよ。' },
  { en: "I'm", kana: 'アイム', kind: 'opener', ja: '私は〜',
    note: '"I am" を縮めた形。自分のことを言うときの始まり。' },
  { en: 'I', kana: 'アイ', kind: 'opener', ja: '私（は）' },
  { en: 'This is', kana: 'ディスィズ', kind: 'opener', ja: 'これは〜' },
  { en: 'Have you', kana: 'ヘァヴ ユー', kind: 'opener', ja: '〜した？',
    note: '"Have you 〜?" は「〜した？」「〜したことある？」と聞くときの始まり。後に続くことばが大事！' },
  { en: 'Can you', kana: 'キャン ユー', kind: 'opener', ja: '〜できる？',
    note: '"Can you 〜?" は「〜できる？」と聞くときの始まり。「〜してくれる？」とたのむときにも使うよ。' },
  { en: 'Can I', kana: 'キャナイ', kind: 'opener', ja: '〜してもいい？',
    note: '"Can I 〜?" は「〜してもいい？」と聞くときの始まり。' },
  { en: 'Is it', kana: 'イズィッ', kind: 'opener', ja: 'それって〜？',
    note: '"Is it 〜?" は「それって〜？」と聞くときの始まり。後に続くことばが大事！' },
  { en: "It's", kana: 'イッツ', kind: 'opener', ja: 'それは〜',
    note: '"It is" を縮めた形。「それは〜だよ」と言うときの始まり。' },
  { en: 'It was', kana: 'イッ ワズ', kind: 'opener', ja: 'それは〜だった',
    note: '「〜だった」と、終わったことを言うときの始まり。' },
  // The same words after a question word ("How is it?", "Where are you from?"): not the start of the question, so
  // they get a plain meaning and no note.
  { key: 'is it@after', en: 'is it', kana: 'イズィッ', kind: 'opener', ja: 'それ（は）' },
  { key: 'are you@after', en: 'are you', kana: 'アー ユー', kind: 'opener', ja: 'あなた（は）' },
  { en: 'is this', kana: 'イズ ディス', kind: 'opener', ja: 'これは〜？' },
  { en: "I'll", kana: 'アイル', kind: 'opener', ja: '（これから）〜します',
    note: '"I will" を縮めた形。「（これから）〜します」と言うときの始まり。' },

  // ── Question words: show what kind of answer is wanted. Always highlighted.
  { en: 'what', kana: 'ワッ', kind: 'qword', ja: '何',
    note: '「何？」と聞くことば。"Sorry, what?" で「すみません、何て言いました？」になるよ。' },
  { en: 'how', kana: 'ハウ', kind: 'qword', ja: 'どう', note: '「どう？」と聞くことば。' },
  { en: 'where', kana: 'ウェア', kind: 'qword', ja: 'どこ', note: '「どこ？」と聞くことば。' },
  { en: 'where is', kana: '[ウェア]リズ', kind: 'qword', ja: '〜はどこ？',
    note: '「〜はどこ？」と聞くときの始まり。後ろに探しているものをつけるよ。' },

  // ── "Not": flips the meaning. Always highlighted.
  { en: "don't", kana: 'ドウン', kind: 'not', ja: '〜しない',
    note: `意味をひっくり返すことば。聞こえたら「〜しない」！ "I don't know" で「知らない」。` },

  // ── Tags: tone, not something she must catch. Never highlighted.
  { en: 'please', kana: 'プリーズ', kind: 'tag', ja: 'お願い', note: '後ろにつけると、ていねいになるよ。' },
  { en: 'so much', kana: '[ソウ] マッチ', kind: 'tag', ja: 'とても' },
  { en: 'to this', kana: 'タ [ディス]', kind: 'tag', ja: 'これを' },
  { en: 'at this', kana: 'アッ [ディス]', kind: 'tag', ja: 'これを' },
  { en: 'all', kana: 'オール', kind: 'tag', ja: '全部' },
  { en: 'later', kana: '[レイ]ダー', kind: 'tag', ja: 'あとで' },
  { en: 'too', kana: 'トゥー', kind: 'tag', ja: '〜も' },
  { en: 'doing', kana: '[ドゥー]イン', kind: 'tag', ja: 'してる' },
  { en: 'a moment', kana: 'ア [モウ]メンッ', kind: 'tag', ja: 'ちょっと' },

  // ── Content: actions, things, feelings. Highlighted when they are the topic.
  { en: 'tomorrow', kana: 'タ[マー]ロウ', kind: 'content', ja: '明日' },
  { en: 'listen', kana: '[リ]スン', kind: 'content', ja: '聞いて' },
  { en: 'again', kana: 'ア[ゲン]', kind: 'content', ja: 'もう一回／また' },
  { en: 'next', kana: 'ネクスッ', kind: 'content', ja: '次' },
  { en: 'next one', kana: '[ネクス] ワン', kind: 'content', ja: '次のもの' },
  { en: 'ready', kana: '[レ]ディ', kind: 'content', ja: '準備OK' },
  { en: 'OK', kana: 'オウ[ケイ]', kind: 'content', ja: '大丈夫／いいよ',
    note: '質問にも、答えにも使える便利なことば。' },
  { en: 'all right', kana: 'オー[ライッ]', kind: 'content', ja: '大丈夫' },
  { en: 'good', kana: 'グッ', kind: 'content', ja: 'いいね' },
  { en: 'great', kana: 'グレイッ', kind: 'content', ja: 'すごい' },
  { en: 'done', kana: 'ダン', kind: 'content', ja: '終わり' },
  { en: 'finished', kana: '[フィ]ニシュト', kind: 'content', ja: '終わった' },
  // The k of "Look!" is heard (released at the end), unlike a final t or d.
  { en: 'look', kana: 'ルック', kind: 'content', ja: '見て' },
  { en: 'for you', kana: 'フォー [ユー]', kind: 'content', ja: 'あなたに' },
  { en: 'know', kana: 'ノウ', kind: 'content', ja: '知っている' },
  { en: 'any idea', kana: 'エニ アイ[ディー]ア', kind: 'content', ja: '心当たりある？' },
  { en: 'understand', kana: 'アンダ[ステァン]ド', kind: 'content', ja: 'わかる（理解する）' },
  { en: 'slowly', kana: '[スロウ]リー', kind: 'content', ja: 'ゆっくり' },
  { en: 'yes', kana: 'イェス', kind: 'content', ja: 'はい' },
  { en: 'no', kana: 'ノウ', kind: 'content', ja: 'いいえ' },
  // At the table (Pack 2).
  { en: 'eat', kana: 'イーッ', kind: 'content', ja: '食べる' },
  { en: 'eaten', kana: 'イーッン', kind: 'content', ja: '食べた' },
  { en: 'already', kana: 'オール[レ]ディ', kind: 'content', ja: 'もう',
    note: '「もう」ということば。マレーシアでは "Eat already?"（もう食べた？）のように、最後につけることも多いよ。' },
  { en: 'want', kana: 'ウォンッ', kind: 'content', ja: 'ほしい' },
  { en: 'want to', kana: '[ウォン] トゥ', kind: 'content', ja: '〜したい' },
  { en: 'some more', kana: 'サム [モー]', kind: 'content', ja: 'もう少し' },
  { en: 'more', kana: 'モー', kind: 'content', ja: 'もっと' },
  { en: 'like it', kana: '[ライ]キッ', kind: 'content', ja: '気に入る' },
  { en: 'tasty', kana: '[テイ]スティ', kind: 'content', ja: 'おいしい',
    note: '「おいしい」。食べ物や飲み物に使うことば。' },
  { en: 'delicious', kana: 'ディ[リ]シャス', kind: 'content', ja: 'とてもおいしい',
    note: '"good" よりも、もっとほめることば。作ってくれた人がきっと喜ぶよ。' },
  { en: 'spicy', kana: '[スパイ]スィー', kind: 'content', ja: '辛い' },
  { en: 'spicy food', kana: '[スパイ]スィー フード', kind: 'content', ja: '辛いもの' },
  { en: 'a little', kana: 'ア [リ]ドゥル', kind: 'content', ja: '少し',
    note: '「少し」「ちょっとだけ」。いろいろな質問に、これだけで答えられる便利なことば。' },
  { en: 'try', kana: 'トゥライ', kind: 'content', ja: 'ためす',
    note: '「ためしてみて」。食べ物なら「食べてみて」、服なら「着てみて」になるよ。' },
  { en: 'this', kana: 'ディス', kind: 'content', ja: 'これ' },
  { en: 'some', kana: 'サム', kind: 'content', ja: 'ちょっと' },
  { en: 'a drink', kana: 'ア [ドゥリンク]', kind: 'content', ja: '飲み物' },
  { en: 'drink', kana: 'ドゥリンク', kind: 'content', ja: '飲む' },
  { en: 'water', kana: '[ウォー]ダー', kind: 'content', ja: '水' },
  { en: 'tea', kana: 'ティー', kind: 'content', ja: '紅茶',
    note: '英語の "tea" は、ふつう紅茶のこと。' },
  { en: 'full', kana: 'フル', kind: 'content', ja: 'お腹いっぱい',
    note: '"I\'m full." で「お腹いっぱいです」。もう食べられないときに。' },
  // Meeting the family (Pack 3).
  { en: 'to Malaysia', kana: 'タ マ[レイ]ジャ', kind: 'content', ja: 'マレーシアへ' },
  { en: 'Auntie', kana: '[エァン]ティ', kind: 'content', ja: 'おばさん',
    note: 'マレーシアでは、親くらいの年の女の人を親しみをこめてこう呼ぶよ。失礼じゃなくて、ていねいな呼び方。' },
  { en: 'Uncle', kana: '[アン]クル', kind: 'content', ja: 'おじさん',
    note: 'マレーシアでは、親くらいの年の男の人を親しみをこめてこう呼ぶよ。' },
  { en: 'from', kana: 'フラム', kind: 'content', ja: '〜から' },
  { en: 'Japan', kana: 'ジャ[ペァン]', kind: 'content', ja: '日本' },
  { en: 'tired', kana: 'タイアード', kind: 'content', ja: '疲れた' },
  // Around the house (Pack 4).
  { en: 'come', kana: 'カム', kind: 'content', ja: '来る／来て' },
  { en: 'here', kana: 'ヒア', kind: 'content', ja: 'ここ' },
  { en: 'sit', kana: 'スィッ', kind: 'content', ja: '座る' },
  { en: 'wait', kana: 'ウェイッ', kind: 'content', ja: '待って' },
  { en: 'the toilet', kana: 'ダ [トイ]リッ', kind: 'content', ja: 'トイレ',
    note: 'マレーシアでも "toilet" で通じるよ。' },
  { en: 'help', kana: 'ヘルプ', kind: 'content', ja: '手伝う' },
  // Drafts in part 2 (waiting for review).
  { en: 'hungry', kana: '[ハン]グリー', kind: 'content', ja: 'お腹がすいた' },
  { en: 'happy', kana: '[ヘァ]ピー', kind: 'content', ja: 'うれしい' },
  { en: 'love it', kana: '[ラ]ヴィッ', kind: 'content', ja: '大好き' },
  { en: 'chicken', kana: '[チ]キン', kind: 'content', ja: 'チキン' },
  { en: 'me', kana: 'ミー', kind: 'content', ja: '私（を）' },
  { en: 'fun', kana: 'ファン', kind: 'content', ja: '楽しい' },
  { en: 'today', kana: 'タ[デイ]', kind: 'content', ja: '今日' },
  { en: 'was', kana: 'ワズ', kind: 'content', ja: '〜だった',
    note: '「〜だった」と、終わったことを言うことば。"It was" の "was" と同じ。' },
  { en: 'next year', kana: 'ネクスッ [イヤー]', kind: 'content', ja: '来年' },

  // ── Fixed phrases: learned whole.
  { en: 'say it', kana: '[セイ] イッ', kind: 'fixed', ja: '言ってみて' },
  { en: 'your turn', kana: 'ユア [ターン]', kind: 'fixed', ja: 'あなたの番' },
  { en: 'one more time', kana: 'ワン モー [タイム]', kind: 'fixed', ja: 'もう一回',
    note: 'もう一度やるときにも、言い直してほしいときにも使えるよ。"please" をつけると、ていねいになる。' },
  { en: 'once more', kana: 'ワンス [モー]', kind: 'fixed', ja: 'もう一回' },
  { en: 'good job', kana: 'グッ [ジャーブ]', kind: 'fixed', ja: 'よくできたね' },
  { en: 'hi', kana: 'ハイ', kind: 'fixed', ja: 'こんにちは',
    note: 'いちばん簡単なあいさつ。朝でも夜でも使えるよ。日本語の「はい」と同じ音だけど、意味は「こんにちは」！' },
  { en: 'hello', kana: 'ハ[ロウ]', kind: 'fixed', ja: 'こんにちは' },
  { en: 'hey', kana: 'ヘイ', kind: 'fixed', ja: 'やっほー' },
  { en: 'nice to meet you', kana: 'ナイス タ [ミー]チュー', kind: 'fixed', ja: 'はじめまして' },
  { en: 'here you go', kana: 'ヒア ユー [ゴウ]', kind: 'fixed', ja: 'はい、どうぞ' },
  { en: 'thank you', kana: '[セン]キュー', kind: 'fixed', ja: 'ありがとう' },
  { en: 'see you', kana: '[スィー] ユー', kind: 'fixed', ja: 'またね' },
  { en: 'bye', kana: 'バイ', kind: 'fixed', ja: 'バイバイ' },
  { en: 'sorry', kana: '[サー]リー', kind: 'fixed', ja: 'ごめん／すみません',
    note: '謝ることば。"Sorry, what?" のように、聞き返すときの前置きにも使うよ。' },
  { en: 'got it', kana: '[ガー]ディッ', kind: 'fixed', ja: 'わかった？' },
  { en: 'good morning', kana: 'グッ [モー]ニン', kind: 'fixed', ja: 'おはよう' },
  { en: 'morning', kana: '[モー]ニン', kind: 'fixed', ja: 'おはよう' },
  { en: 'good night', kana: 'グッ [ナイッ]', kind: 'fixed', ja: 'おやすみ' },
  { en: 'night', kana: 'ナイッ', kind: 'fixed', ja: 'おやすみ' },
  { en: 'sleep well', kana: 'スリープ [ウェル]', kind: 'fixed', ja: 'ぐっすり寝てね' },
  // At the table (Pack 2).
  { en: "let's eat", kana: 'レッツ [イーッ]', kind: 'fixed', ja: '食べよう' },
  // "to" before a vowel is トゥ (the voice: tʊ); before a consonant it stays タ ("time to go").
  { en: 'time to eat', kana: 'タイム トゥ [イーッ]', kind: 'fixed', ja: 'ごはんの時間' },
  { en: 'not yet', kana: 'ナーッ [イェッ]', kind: 'fixed', ja: 'まだ',
    note: '「まだ」。"Not yet." だけで「まだです」になるよ。' },
  // Meeting the family (Pack 3).
  { en: 'welcome', kana: '[ウェル]カム', kind: 'fixed', ja: 'ようこそ',
    note: '「ようこそ」「いらっしゃい」。マレーシアでは、"Thank you!" への返事（どういたしまして）にも使うよ。' },
  { en: 'for having me', kana: 'フォー [ヘァ]ヴィン ミー', kind: 'fixed', ja: '迎えてくれて',
    note: '"Thank you for having me!" は、日本語の「お世話になります」に近い気持ちで使えるよ。' },
  { en: 'you too', kana: 'ユー [トゥー]', kind: 'fixed', ja: 'こちらこそ',
    note: '「あなたも」。"Nice to meet you!" への返事なら「こちらこそ」の意味。' },
  { en: 'how are you', kana: '[ハウ] アー ユー', kind: 'fixed', ja: '元気？',
    note: '会ったときのあいさつ。答えは "Good, thank you."' },
  { en: 'and you', kana: 'アン [ユー]', kind: 'fixed', ja: 'あなたは？',
    note: '同じことを聞き返すことば。"How are you?" と聞かれたら、答えたあとに聞き返そう。' },
  { en: 'thanks', kana: 'センクス', kind: 'fixed', ja: 'ありがと', note: '"Thank you" のくだけた言い方。' },
  { en: "you're welcome", kana: 'ユア [ウェル]カム', kind: 'fixed', ja: 'どういたしまして' },
  { en: 'no problem', kana: 'ノウ [プラー]ブレム', kind: 'fixed', ja: '気にしないで' },
  // Around the house (Pack 4).
  { en: 'come in', kana: 'カム [イン]', kind: 'fixed', ja: '入って' },
  { en: 'this way', kana: 'ディス [ウェイ]', kind: 'fixed', ja: 'こっち' },
  { en: 'sit down', kana: 'スィッ [ダウン]', kind: 'fixed', ja: '座って' },
  { en: 'have a seat', kana: 'ヘァヴァ [スィーッ]', kind: 'fixed', ja: 'どうぞ座って' },
  { en: 'hold on', kana: 'ホウル[ドン]', kind: 'fixed', ja: 'ちょっと待って' },
  { en: 'no need', kana: 'ノウ [ニーッ]', kind: 'fixed', ja: 'しなくていい',
    note: '「しなくていいよ」。気をつかって、遠慮してくれるときのことば。' },
  { en: 'excuse me', kana: 'エクス[キュー]ズ ミー', kind: 'fixed', ja: 'すみません',
    note: '前を通るときや、人に声をかけるときの「すみません」。謝るときは "Sorry"、お礼のときは "Thank you" だよ。' },
  { en: "let's go", kana: 'レッツ [ゴウ]', kind: 'fixed', ja: '行こう' },
  // Drafts in part 2 (waiting for review).
  { en: 'me too', kana: 'ミー [トゥー]', kind: 'fixed', ja: '私も',
    note: '相手と同じとき「私も！」。会話をつなげる、いちばん簡単な返事。' },
  { en: 'sure', kana: 'シュア', kind: 'fixed', ja: 'いいよ／もちろん', note: '頼まれたときの、気軽な「いいよ」。' },
  { en: 'time to go', kana: 'タイム タ [ゴウ]', kind: 'fixed', ja: 'もう行く時間' },
];

/** Normalises written English to a dictionary key: lower case, no ? ! . , or extra spaces. */
export function keyOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const BLOCKS: ReadonlyMap<string, BlockDef> = new Map(
  LIST.map(({ key, ...def }) => [key ?? keyOf(def.en), def] as const),
);
