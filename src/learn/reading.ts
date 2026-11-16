/**
 * Katakana readings made on the phone, for the English in her notes, which has no hand-made reading. The
 * pronunciation engine (src/app/reading.ts) writes the American sounds the same way it does for the voice
 * (src/content/phonemes.json); this turns them into katakana by the rules the hand-made readings follow
 * (src/content/blocks.ts): ッ for a t that is not let go ("great" グレイッ), ダ行 for the soft t of "water"
 * ([ウォー]ダー), ディ for th, エァ for the a of "happy", words run together where the voice runs them ("can I"
 * キャナイ, "thank you" センキュー), and [ ] around the beat said strongly.
 *
 * tests/reading.test.ts holds it to the hand-made readings: it gives the same reading for almost all of them, and
 * where it does not, it is a fair reading still (ニード where the hand-made one says ニーッ).
 */

/** One sound of a word as the engine writes it. */
interface Sound {
  /** IPA: 'k', 'tʃ', 'eɪ', 'n' (with `kind` 'syllabic' for the n of "button"). */
  p: string;
  kind: 'consonant' | 'vowel' | 'syllabic';
  /** Vowels: 2 said strongly (ˈ), 1 a little (ˌ), 0 not. */
  stress: number;
  /** Vowels: an r follows in the same syllable ("where", "more"), so it ends in ア or ー. */
  r: boolean;
  /** Consonants: moved here from the end of the word before ("look at": the k). */
  moved?: boolean;
}

interface Syllable {
  onset: string[];
  nucleus: Sound;
  coda: string[];
  /** It starts with a consonant from the word before. */
  moved: boolean;
}

/** Longest first, so 'eɪ' is read before 'e'. */
const VOWELS = ['aɪɚ', 'aʊɚ', 'aɪə', 'eɪ', 'aɪ', 'aʊ', 'oʊ', 'əʊ', 'ɔɪ', 'ɑː', 'ɔː', 'oː', 'iː', 'uː', 'ɜː', 'ɚ', 'æ', 'ʌ', 'ɛ', 'ɪ', 'ᵻ', 'ɨ', 'i', 'u', 'ʊ', 'ɔ', 'ə', 'ɐ', 'ɑ', 'ɒ', 'a', 'e', 'o', 'ɜ'];
const CONSONANTS = ['tʃ', 'dʒ', 'p', 'b', 't', 'd', 'k', 'ɡ', 'g', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'ɹ', 'r', 'j', 'w', 'ɾ', 'ʔ', 'x', 'ç', 'ɬ', 'ʍ'];
/** Rare spellings of the same sound. */
const SAME: Record<string, string> = { g: 'ɡ', r: 'ɹ', x: 'h', ç: 'h', ɬ: 'l', ʍ: 'w' };
/** The mark under a consonant that makes it a syllable of its own: the n̩ of "button". */
const SYLLABIC = '̩';

/** Vowels said short: a k, p or ch after one at the end of a word is doubled (ルック, マッチ). */
const SHORT = new Set(['ɪ', 'ɛ', 'æ', 'ʌ', 'ʊ', 'ə', 'ɐ', 'ᵻ', 'ɨ', 'ɔ', 'e', 'a', 'o', 'u', 'ɑ', 'ɒ']);

/** Kana by consonant, one per vowel row: a i u e o. The th of "this" is ダ行, as in the hand-made readings. */
const ROWS: Record<string, readonly string[]> = {
  '': ['ア', 'イ', 'ウ', 'エ', 'オ'],
  k: ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ɡ: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
  s: ['サ', 'スィ', 'ス', 'セ', 'ソ'],
  z: ['ザ', 'ズィ', 'ズ', 'ゼ', 'ゾ'],
  θ: ['サ', 'スィ', 'ス', 'セ', 'ソ'],
  ð: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド'],
  ʃ: ['シャ', 'シ', 'シュ', 'シェ', 'ショ'],
  ʒ: ['ジャ', 'ジ', 'ジュ', 'ジェ', 'ジョ'],
  tʃ: ['チャ', 'チ', 'チュ', 'チェ', 'チョ'],
  dʒ: ['ジャ', 'ジ', 'ジュ', 'ジェ', 'ジョ'],
  t: ['タ', 'ティ', 'トゥ', 'テ', 'ト'],
  d: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド'],
  ɾ: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド'],
  n: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ŋ: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  h: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  f: ['ファ', 'フィ', 'フ', 'フェ', 'フォ'],
  v: ['ヴァ', 'ヴィ', 'ヴ', 'ヴェ', 'ヴォ'],
  b: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
  p: ['パ', 'ピ', 'プ', 'ペ', 'ポ'],
  m: ['マ', 'ミ', 'ム', 'メ', 'モ'],
  j: ['ヤ', 'イ', 'ユ', 'イェ', 'ヨ'],
  w: ['ワ', 'ウィ', 'ウ', 'ウェ', 'ウォ'],
  l: ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ɹ: ['ラ', 'リ', 'ル', 'レ', 'ロ'],
};
const A = 0, I = 1, U = 2, E = 3, O = 4;

/** A consonant with no vowel after it: in a cluster ("drink" ドゥリンク) or at the end of a word. */
const ALONE: Record<string, string> = {
  k: 'ク', ɡ: 'グ', s: 'ス', z: 'ズ', θ: 'ス', ð: 'ズ', ʃ: 'シュ', ʒ: 'ジュ', tʃ: 'チ', dʒ: 'ジ', t: 'トゥ', d: 'ドゥ',
  ɾ: 'ドゥ', n: 'ン', ŋ: 'ン', h: 'フ', f: 'フ', v: 'ヴ', b: 'ブ', p: 'プ', m: 'ム', j: 'イ', w: 'ウ', l: 'ル', ɹ: 'ル',
  ʔ: 'ッ',
};
/** Doubled at the end of a word after a short vowel: "look" ルック, "much" マッチ, "fish" フィッシュ. */
const DOUBLED = new Set(['k', 'ɡ', 'p', 'tʃ', 'dʒ', 'ʃ']);

/** Each vowel: its row, and what follows the first kana ('eɪ' → エ + イ). */
const VOWEL_KANA: Record<string, readonly [number, string]> = {
  ʌ: [A, ''], ɐ: [A, ''], a: [A, ''], ɑ: [A, ''], ə: [A, ''], æ: [A, ''],
  ɑː: [A, 'ー'], ɜː: [A, 'ー'], ɜ: [A, 'ー'], ɚ: [A, 'ー'],
  ɪ: [I, ''], ᵻ: [I, ''], ɨ: [I, ''], i: [I, 'ー'], iː: [I, 'ー'],
  ʊ: [U, ''], u: [U, ''], uː: [U, 'ー'],
  ɛ: [E, ''], e: [E, ''], eɪ: [E, 'イ'],
  ɔ: [O, ''], o: [O, ''], ɒ: [O, ''], ɔː: [O, 'ー'], oː: [O, 'ー'], oʊ: [O, 'ウ'], əʊ: [O, 'ウ'], ɔɪ: [O, 'イ'],
  aɪ: [A, 'イ'], aʊ: [A, 'ウ'], aɪɚ: [A, 'イアー'], aʊɚ: [A, 'ウアー'], aɪə: [A, 'イア'],
};
/** The same with an r after it: "where" ウェア, "here" ヒア, "sure" シュア, "more" モー, "car" カー. */
const R_KANA: Record<string, readonly [number, string]> = {
  ɛ: [E, 'ア'], e: [E, 'ア'], eɪ: [E, 'ア'], æ: [E, 'ア'],
  ɪ: [I, 'ア'], i: [I, 'ア'], iː: [I, 'ア'],
  ʊ: [U, 'ア'], u: [U, 'ア'], uː: [U, 'ア'],
  aɪ: [A, 'イアー'], aʊ: [A, 'ウアー'], aɪɚ: [A, 'イアー'], aʊɚ: [A, 'ウアー'],
};

/** English onsets of two or three consonants: "dr" in "drink" starts a syllable, "nt" in "auntie" does not. */
const ONSETS = new Set(
  'pɹ bɹ tɹ dɹ kɹ ɡɹ fɹ θɹ ʃɹ pl bl kl ɡl fl sl tw dw kw ɡw sw θw sp st sk sm sn sf pj bj kj ɡj fj vj mj hj nj lj spɹ stɹ skɹ spl skw skj spj'.split(
    ' ',
  ),
);
const canStart = (cs: string[]) => (cs.length < 2 ? !cs.some((c) => c === 'ŋ' || c === 'ʔ') : ONSETS.has(cs.join('')));

/** you, your, you're, yours, you'll, you've, yourself: the words a t or d before runs into (ミーチュー). */
const YOU = /^j(uː|ʊɹ|ɔːɹ|ʊ|u|ə|ɚ)(z|l|v|sɛlf)?$/;

/** Weak forms the voice says with fewer sounds than the engine writes: "and" (アン), "to" before a vowel (トゥ). */
function weak(word: string): string {
  if (word === 'ænd' || word === 'ənd') return word.slice(0, -1);
  if (word === 'tuː') return 'tʊ';
  return word;
}

function sounds(word: string): Sound[] {
  const out: Sound[] = [];
  let stress = 0;
  for (let i = 0; i < word.length; ) {
    const ch = word[i];
    if (ch === 'ˈ' || ch === 'ˌ') {
      stress = Math.max(stress, ch === 'ˈ' ? 2 : 1);
      i++;
      continue;
    }
    const v = VOWELS.find((s) => word.startsWith(s, i));
    if (v) {
      out.push({ p: v, kind: 'vowel', stress, r: false });
      stress = 0;
      i += v.length;
      continue;
    }
    const c = CONSONANTS.find((s) => word.startsWith(s, i));
    if (!c) {
      i++; // length marks on their own, and anything else the engine adds
      continue;
    }
    i += c.length;
    const p = SAME[c] ?? c;
    if (word[i] === SYLLABIC) {
      out.push({ p, kind: 'syllabic', stress: 0, r: false });
      i++;
    } else if (out.at(-1)?.p !== p) out.push({ p, kind: 'consonant', stress: 0, r: false }); // a doubled sound is said once
  }
  for (let k = 0; k < out.length - 1; k++) {
    const s = out[k];
    if (s.kind !== 'vowel' || out[k + 1].p !== 'ɹ') continue;
    // An r with no vowel after it colours the vowel instead ("where" ウェア); before a vowel it starts the next
    // syllable ("very" ヴェリー), and the o before it is long ("orange" オーリンジ).
    if (out[k + 2]?.kind !== 'vowel' && out[k + 2]?.kind !== 'syllabic') {
      s.r = true;
      out.splice(k + 1, 1);
    } else if (s.p === 'ɔ') s.p = 'ɔː';
  }
  return out;
}

const isVowel = (s?: Sound) => !!s && s.kind !== 'consonant';

/**
 * Runs words together the way the voice does, moving sounds between them. Returns, for each word, whether it is
 * joined to the next (written with no space).
 */
function link(words: Sound[][], raw: string[]): boolean[] {
  const joined = words.map(() => false);
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    const last = a.at(-1);
    const before = a.at(-2);
    if (!last || !b.length || (last.kind !== 'consonant' && !last.r)) continue;
    // "want to" ウォン トゥ: the t is not said before another t or d.
    if (last.p === 't' && before?.p === 'n' && (b[0].p === 't' || b[0].p === 'd')) {
      a.pop();
      continue;
    }
    if (isVowel(b[0])) {
      if (last.r) {
        // "where is" ウェアリズ: the r is heard twice.
        b.unshift({ p: 'ɹ', kind: 'consonant', stress: 0, r: false });
      } else {
        // "can I" キャナイ, "got it" ガーディッ. Not after m or ng ("come in" カム イン) or ts ("let's eat").
        if (last.p === 'm' || last.p === 'ŋ' || (last.p === 's' && before?.p === 't')) continue;
        a.pop();
        // A k or ch after a short vowel stays doubled: "look at" ルッカッ, "much is" マッチズ.
        if (DOUBLED.has(last.p) && before?.kind === 'vowel' && SHORT.has(before.p) && !before.r) a.push({ ...last, p: 'ʔ' });
        b.unshift({ ...last, p: last.p === 't' && isVowel(before) ? 'ɾ' : last.p, moved: true });
      }
      joined[i] = true;
      continue;
    }
    // "meet you" ミーチュー, "did you" ディジュー, "thank you" センキュー (not "next year": s before the t).
    const onset = ['t', 'd', 'k', 'ɡ'].includes(last.p) && (isVowel(before) || before?.p === 'n' || before?.p === 'ŋ');
    if (onset && last.kind === 'consonant' && YOU.test(raw[i + 1].replace(/[ˈˌ]/g, ''))) {
      a.pop();
      if (last.p === 'k' || last.p === 'ɡ') b.unshift(last);
      else b[0] = { ...b[0], p: last.p === 't' ? 'tʃ' : 'dʒ' };
      joined[i] = true;
    }
  }
  return joined;
}

function syllables(word: Sound[]): Syllable[] {
  const nuclei = word.flatMap((s, i) => (s.kind === 'consonant' ? [] : [i]));
  const out: Syllable[] = nuclei.map((i) => ({ onset: [], nucleus: word[i], coda: [], moved: false }));
  if (!out.length) return out;
  out[0].onset = word.slice(0, nuclei[0]).map((s) => s.p);
  out[0].moved = !!word[0].moved;
  for (let k = 0; k < nuclei.length; k++) {
    const between = word.slice(nuclei[k] + 1, nuclei[k + 1] ?? word.length).map((s) => s.p);
    if (k === nuclei.length - 1) {
      out[k].coda = between;
      break;
    }
    // As many consonants as can start a syllable go to the next one: "tasty" テイ・スティ, "welcome" ウェル・カム.
    let split = 0;
    while (!canStart(between.slice(split))) split++;
    out[k].coda = between.slice(0, split);
    out[k + 1].onset = between.slice(split);
  }
  return out;
}

/** The consonants that end a syllable. `last`: the syllable ends the word. */
function codaKana(coda: string[], short: boolean, last: boolean): string {
  let out = '';
  for (let k = 0; k < coda.length; k++) {
    const c = coda[k];
    const next = coda[k + 1];
    const prev = coda[k - 1];
    const alone = last && coda.length === 1;
    if ((c === 't' && next === 's') || (c === 'd' && next === 'z')) {
      // "let's" レッツ, "it's" イッツ, "kids" キッズ
      out += (short && last && coda.length === 2 ? 'ッ' : '') + (c === 't' ? 'ツ' : 'ズ');
      k++;
    } else if (c === 't') {
      // Not let go after a vowel, n, s or l: "great" グレイッ, "want" ウォンッ, "next" ネクスッ. Said after other
      // consonants: "finished" フィニシュト.
      out += !prev || prev === 'n' || prev === 's' || prev === 'l' ? 'ッ' : 'ト';
    } else if (c === 'd') {
      // "good" グッ after a short vowel; "food" フード, "world" ワールド, "tired" タイアード.
      out += !last || (!prev && short) ? 'ッ' : 'ド';
    } else if (alone && short && DOUBLED.has(c)) out += 'ッ' + ALONE[c];
    else if (c === 'm' && (next === 'p' || next === 'b')) out += 'ン';
    else out += ALONE[c] ?? '';
  }
  return out;
}

/** One syllable in katakana. `last`: it ends the word. */
function syllableKana({ onset, nucleus: n, coda, moved }: Syllable, last: boolean): string {
  const lead = onset.filter((c) => c !== 'ʔ');
  // "cute" キュー: a consonant and y together make one kana.
  const palatal = lead.length > 1 && lead.at(-1) === 'j';
  if (palatal) lead.pop();
  const c = lead.at(-1) ?? '';
  let out = lead
    .slice(0, -1)
    .map((x) => ALONE[x] ?? '')
    .join('');
  if (n.kind === 'syllabic') return out + (ALONE[c] ?? '') + (n.p === 'l' ? 'ル' : n.p === 'm' ? 'ム' : 'ン') + codaKana(coda, false, last);

  let [row, rest] = (n.r && R_KANA[n.p]) || VOWEL_KANA[n.p] || [A, ''];
  if (n.r && !R_KANA[n.p]) rest = 'ー';
  const short = SHORT.has(n.p) && !n.r;
  // The r of "understand" is short inside a word (アンダ), long at its end ("water" ウォーダー).
  if (n.p === 'ɚ' && !last) rest = '';
  // A final y is short after t, d and n, as in the hand-made readings: "ready" レディ, "any" エニ; "happy" ヘァピー.
  // Inside a word it is short unless said strongly: "beautiful" ビューディフル, "idea" アイディーア.
  if (n.p === 'i' && last && !coda.length && ['t', 'd', 'n', 'ɾ'].includes(c)) rest = '';
  if (n.p === 'i' && !last && !n.stress) rest = '';
  if (n.p === 'ə') {
    const nasal = coda[0] === 'n' || coda[0] === 'm';
    // "listen" リスン, "seven" セヴン: no vowel between these and the n.
    if (nasal && ['s', 'z', 'f', 'v', 'θ', 'ð'].includes(c)) return out + ALONE[c] + codaKana(coda, false, last);
    // "station" ステイション
    if (nasal && ['ʃ', 'ʒ', 'tʃ', 'dʒ'].includes(c)) row = O;
    // "moment" モウメンッ, "problem" プラーブレム
    else if (nasal && c) row = E;
    // "little" リドゥル, "uncle" アンクル
    else if (last && coda.length === 1 && coda[0] === 'l' && c && !['m', 'n', 'ŋ', 'l', 'ɹ', 'w', 'j'].includes(c)) return out + ALONE[c] + 'ル';
  }
  if (c === 'j' && n.r && (n.p === 'ɪ' || n.p === 'i' || n.p === 'iː')) return out + 'イヤー' + codaKana(coda, false, last); // "year"

  let first: string;
  if (n.p === 'æ' && !n.r) {
    // "can" キャン, "have" ヘァヴ, "auntie" エァンティ, "and" アン; before ng it is エ: "thank" セン. A weak "at" or
    // "and" stays ア after a consonant from the word before: "look at" ルッカッ.
    if (moved && !n.stress) first = ROWS[c]?.[A] ?? ROWS[''][A];
    else if (c === 'k' || c === 'ɡ') first = c === 'k' ? 'キャ' : 'ギャ';
    else if (['ʃ', 'ʒ', 'tʃ', 'dʒ', 'j'].includes(c)) first = ROWS[c][A];
    else if (!c) first = n.stress ? (coda[0] === 'ŋ' ? 'エ' : 'エァ') : 'ア';
    else first = (ROWS[c]?.[E] ?? ALONE[c] + 'エ') + (coda[0] === 'ŋ' ? '' : 'ァ');
  } else if (palatal) {
    const base = c === 't' ? 'チ' : c === 'd' ? 'ジ' : c === 's' ? 'シ' : c === 'z' ? 'ジ' : c === 'f' ? 'フ' : c === 'v' ? 'ヴ' : (ROWS[c]?.[I] ?? 'イ');
    first = base + (['ャ', '', 'ュ', 'ェ', 'ョ'][row] ?? '');
  } else first = ROWS[c]?.[row] ?? (ALONE[c] ?? '') + ROWS[''][row];
  return out + first + rest + codaKana(coda, short, last);
}

function wordKana(word: Sound[], mark: number): string {
  const syls = syllables(word);
  if (!syls.length) return word.map((s) => ALONE[s.p] ?? '').join('');
  return syls.map((s, k) => (k === mark ? `[${syllableKana(s, k === syls.length - 1)}]` : syllableKana(s, k === syls.length - 1))).join('');
}

/**
 * The katakana reading of one stretch of speech, from the engine's sounds (words separated by spaces).
 *
 * `mark` says which beats get [ ]. 'words': the strong beat of every word of two syllables or more (her notes: a
 * sentence of any length). 'phrase': the one strongest beat of the whole stretch, if it has two syllables or more
 * (how a word block is marked: "good night" グッ [ナイッ]).
 */
export function kanaFromPhonemes(ipa: string, mark: 'words' | 'phrase' = 'words'): string {
  const raw = ipa.trim().split(/\s+/).filter(Boolean).map(weak);
  const words = raw.map(sounds);
  const vowels = words.map((w) => w.filter((s) => s.kind === 'vowel').length);
  // Which syllable of each word is marked (syllables count every vowel and syllabic consonant, in order).
  const marks = words.map(() => -1);
  const strong = (w: Sound[]) => w.filter((s) => s.kind !== 'consonant').findIndex((s) => s.stress === 2);
  if (mark === 'words') words.forEach((w, i) => vowels[i] > 1 && (marks[i] = strong(w)));
  else if (vowels.reduce((a, b) => a + b, 0) > 1) {
    let i = words.length - 1;
    while (i >= 0 && strong(words[i]) < 0) i--;
    if (i >= 0) marks[i] = strong(words[i]);
  }
  const joined = link(words, raw);
  let out = '';
  words.forEach((w, i) => {
    const kana = wordKana(w, marks[i]);
    if (!kana) return;
    out += kana + (joined[i] ? '' : ' ');
  });
  return out.trim();
}

/** The Japanese mark for punctuation, in a reading. */
const MARKS: [RegExp, string][] = [
  [/[?？]/, '？'],
  [/[!！]/, '！'],
  [/[,;:、]/, '、'],
  [/[.。…]/, '。'],
];
const markOf = (punct: string) => MARKS.find(([re]) => re.test(punct))?.[1] ?? '';

/** The mark for the punctuation some English ends with ("some more?" → ？); none for a full stop at the very end.
 * Closing quotes and brackets after it are passed over: “Can I have some water?” still ends with ？. */
export function markAfter(text: string, end = false): string {
  const mark = markOf(/[.,!?;:…。、！？]*[\s"”’»」』)\]}>]*$/.exec(text)?.[0] ?? '');
  return end && mark === '。' ? '' : mark;
}

/**
 * Her English in stretches, cut at its punctuation, each with the mark that follows it in the reading: the engine
 * drops punctuation, but a reading needs its ？. Only letters, numbers and a few signs are kept: the engine would
 * spell out anything else. A point or comma inside a number stays ("3.5", "1,000").
 */
export function clauses(text: string): { text: string; mark: string }[] {
  const out: { text: string; mark: string }[] = [];
  const plain = text.replace(/[‘’]/g, "'").replace(/["“”«»「」『』()[\]{}<>]/g, ' ');
  const pieces = plain.split(/([.,!?;:…。、！？]+)(?=\s|$)/);
  for (let i = 0; i < pieces.length; i += 2) {
    const words = pieces[i]
      .replace(/[^A-Za-z0-9À-ɏ'$%&.,\- ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (words) out.push({ text: words, mark: markOf(pieces[i + 1] ?? '') });
  }
  const end = out.at(-1);
  if (end?.mark === '。') end.mark = '';
  return out;
}

/** The readings of the stretches, as one line: 'ハイ！ハウ アー ユー？' */
export const joinClauses = (parts: { kana: string; mark: string }[]): string =>
  parts
    .filter((p) => p.kana)
    .map((p, i, all) => p.kana + (p.mark || (i < all.length - 1 ? ' ' : '')))
    .join('');
