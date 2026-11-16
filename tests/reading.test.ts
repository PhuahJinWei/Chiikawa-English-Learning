// Katakana readings made on the phone for her notes (src/learn/reading.ts, src/app/reading.ts). They follow the rules
// of the hand-made readings, so the hand-made readings are their test.
import { describe, expect, it } from 'vitest';
import { BLOCKS, keyOf } from '../src/content/blocks.ts';
import phonemes from '../src/content/phonemes.json';
import { handMade, readingOf, readyReading } from '../src/app/reading.ts';
import { clauses, joinClauses, kanaFromPhonemes, markAfter } from '../src/learn/reading.ts';

const PH = phonemes as Record<string, string>;

/**
 * Where a hand-made reading chose differently from the rules (2026-11-17), with the reading the rules give. Each is
 * still a fair reading; when a hand-made reading changes to agree, take it off this list.
 */
const CHOSEN_DIFFERENTLY: Record<string, string> = {
  // Said short in the hand-made reading.
  'do you': 'ドゥー ユー',
  // The t is not marked with ッ in the hand-made reading, nor said before "one".
  "don't": 'ドウンッ',
  'next one': '[ネクスッ] ワン',
  // The l runs into the r in the hand-made reading (オーライ).
  'all right': 'オール [ライッ]',
  // The beat is marked differently: the d of "understand" and the s and z of "excuse" are left out of it.
  understand: 'アンダ[ステァンド]',
  'excuse me': 'エク[スキューズ] ミー',
  // The hand-made reading marks "spicy" (the point of the phrase); the rules mark the last strong word.
  'spicy food': 'スパイスィー [フード]',
  // A d after a long vowel is ド by the rules, as in "food" フード.
  'no need': 'ノウ [ニード]',
};

describe('readings made from the voice’s sounds', () => {
  it('agree with the hand-made readings of the word blocks, except where those chose differently', () => {
    const differ: Record<string, string> = {};
    for (const b of BLOCKS.values()) {
      const key = keyOf(b.en);
      let auto = kanaFromPhonemes(PH[key], 'phrase');
      // An opener is never marked: the strong beat is in the rest of the sentence.
      if (b.kind === 'opener') auto = auto.replace(/[[\]]/g, '');
      if (auto !== b.kana) differ[key] = auto;
    }
    expect(differ).toEqual(CHOSEN_DIFFERENTLY);
    expect(BLOCKS.size - Object.keys(differ).length).toBeGreaterThanOrEqual(120);
  });

  it('run words together where the voice does, and mark the strong beat of longer words', () => {
    const cases: [string, string, string][] = [
      ['Can I have some water', 'kæn aɪ hæv sˌʌm wˈɔːɾɚ', 'キャナイ ヘァヴ サム [ウォー]ダー'],
      ['What is it', 'wˈʌt ɪz ɪt', 'ワディズィッ'],
      ['Did you eat', 'dˈɪd juː ˈiːt', 'ディジュー イーッ'],
      ['I want to eat it', 'aɪ wˈɔnt tʊ ˈiːt ɪt', 'アイ ウォン トゥ イーディッ'],
      ['Look at this', 'lˈʊk æt ðˈɪs', 'ルッカッ ディス'],
      ['How much is this', 'hˌaʊ mˈʌtʃ ɪz ðˈɪs', 'ハウ マッチズ ディス'],
      ['Where are you going', 'wˌɛɹ ɑːɹ juː ɡˈoʊɪŋ', 'ウェアラー ユー [ゴウ]イン'],
      ['Thank you so much', 'θˈæŋk juː sˈoʊ mˌʌtʃ', 'センキュー ソウ マッチ'],
      ['Let’s eat', 'lˈɛts ˈiːt', 'レッツ イーッ'],
      ['Come in', 'kˈʌm ˈɪn', 'カム イン'],
      [
        'Could you please send me the photos from yesterday',
        'kʊd juː plˈiːz sˈɛnd mˌiː ðə fˈoʊɾoʊz fɹʌm jˈɛstɚdˌeɪ',
        'クジュー プリーズ センド ミー ダ [フォウ]ドウズ フラム [イェ]スタデイ',
      ],
      ['It’s 25 dollars', 'ɪts twˈɛnti fˈaɪv dˈɑːlɚz', 'イッツ [トゥウェン]ティ ファイヴ [ダー]ラーズ'],
      ['beautiful', 'bjˈuːɾifəl', '[ビュー]ディフル'],
      ['teh tarik', 'tˈeɪ tˈɑːɹɹɪk', 'テイ [ター]リック'],
      ['button', 'bˈʌʔn̩', 'バッン'],
      ['years', 'jˈɪɹz', 'イヤーズ'],
      ['fire', 'fˈaɪɚ', 'ファイアー'],
      ['very', 'vˈɛɹi', '[ヴェ]リー'],
      ['orange', 'ˈɔɹɪndʒ', '[オー]リンジ'],
      ['station', 'stˈeɪʃən', '[ステイ]ション'],
      ['music', 'mjˈuːzɪk', '[ミュー]ズィック'],
      ['kids', 'kˈɪdz', 'キッズ'],
      ['finished', 'fˈɪnɪʃt', '[フィ]ニシュト'],
    ];
    for (const [en, ipa, kana] of cases) expect(kanaFromPhonemes(ipa), en).toBe(kana);
  });

  it('keep the punctuation a reading needs', () => {
    expect(clauses('Hi! How are you? I’m fine, thanks.')).toEqual([
      { text: 'Hi', mark: '！' },
      { text: 'How are you', mark: '？' },
      { text: "I'm fine", mark: '、' },
      { text: 'thanks', mark: '' },
    ]);
    expect(clauses('It costs 3.50 (about 1,000 yen) 😊')).toEqual([{ text: 'It costs 3.50 about 1,000 yen', mark: '' }]);
    expect(clauses('ありがとう')).toEqual([]);
    expect(markAfter('some more?')).toBe('？');
    expect(markAfter('Hi,')).toBe('、');
    expect(markAfter('Thank you.', true)).toBe('');
    expect(joinClauses([{ kana: 'ハイ', mark: '！' }, { kana: 'ハウ アー ユー', mark: '？' }, { kana: 'センクス', mark: '' }])).toBe(
      'ハイ！ハウ アー ユー？センクス',
    );
  });
});

describe('note readings', () => {
  it('are made by the pronunciation engine, and kept', async () => {
    expect(await readingOf('“Can I have some water?”')).toBe('キャナイ ヘァヴ サム [ウォー]ダー？');
    expect(readyReading('“Can I have some water?”')).toBe('キャナイ ヘァヴ サム [ウォー]ダー？');
    expect(await readingOf('Hi! How are you?')).toBe('ハイ！ハウ アー ユー？');
    expect(handMade('Can I have some water?')).toBe(false);
  });

  it('of a lesson line are its hand-made reading, with her own punctuation', async () => {
    expect(handMade('thank you')).toBe(true);
    expect(readyReading('thank you')).toBe('[セン]キュー');
    expect(await readingOf('Thank you!')).toBe('[セン]キュー！');
  });

  it('are empty when there is no English to read', async () => {
    expect(await readingOf('')).toBe('');
    expect(await readingOf('お水がほしい')).toBe('');
  });
});
