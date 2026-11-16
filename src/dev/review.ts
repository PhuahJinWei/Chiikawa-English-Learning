// Development only (review.html): every line and block of the course, to hear and check by ear (REVIEW section 6:
// "the review page"). Readings show the stressed beat with dots; the rows at the top are the readings the review could
// not settle without listening.
import { audioPath, audioSlug } from '../content/audio.ts';
import { BLOCKS, keyOf } from '../content/blocks.ts';
import { ORDERED, UI } from '../content/index.ts';
import { kanaSegments } from '../content/kana.ts';
import manifest from '../content/audio-manifest.json';
import type { Exchange, Line } from '../content/types.ts';

type Clip = { text: string; ms: number; phonemes: string; pitch?: { start: number; low: number; end: number } };
const CLIPS = (manifest as unknown as { clips: Record<string, Clip> }).clips;
const root = document.getElementById('root')!;
const player = new Audio();
let playing: HTMLElement | null = null;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function play(path: string, mark?: HTMLElement): void {
  playing?.classList.remove('playing');
  playing = mark ?? null;
  mark?.classList.add('playing');
  player.src = path;
  player.onended = () => mark?.classList.remove('playing');
  void player.play().catch(() => mark?.classList.remove('playing'));
}

function kana(text: string): HTMLElement {
  const span = el('span', 'kana');
  for (const s of kanaSegments(text)) span.append(s.stress ? el('b', 'stress', s.text) : document.createTextNode(s.text));
  return span;
}

function playButton(label: string, path: string): HTMLButtonElement {
  const b = el('button', 'play', `▶ ${label}`);
  b.onclick = () => play(path);
  return b;
}

/** A block's own clip: the exact text first, else the block as written in a line ("got it" → "Got it?"). */
const clipFor = (en: string): Clip | undefined =>
  CLIPS[audioSlug(en)] ?? Object.values(CLIPS).find((c) => keyOf(c.text) === keyOf(en));

const pitchText = (c?: Clip) => (c?.pitch ? `pitch ${c.pitch.start} → ${c.pitch.low} → ${c.pitch.end} Hz` : '');

function lineRow(role: string, line: Line): HTMLElement {
  const row = el('div', 'line');
  row.append(el('div', 'role', role));
  const body = el('div');
  const blocks = el('div', 'blocks');
  for (const p of line.parts) {
    const b = el('button', `block${p.hi ? ' hi' : ''}`);
    b.title = `${BLOCKS.get(p.key)?.ja ?? ''} (tap to hear "${p.text}")`;
    b.append(kana(p.kana), el('span', 'word', p.text));
    b.onclick = () => play(audioPath(p.text), b);
    blocks.append(b);
  }
  const all = playButton('line', audioPath(line.en));
  blocks.append(all);
  const clip = CLIPS[audioSlug(line.en)];
  body.append(blocks, el('div', 'ja', line.ja), el('div', 'tech', [clip?.phonemes, pitchText(clip)].filter(Boolean).join('   ')));
  row.append(body);
  return row;
}

function exchangeCard(e: Exchange, n: number): HTMLElement {
  const card = el('section', 'ex');
  const head = el('div', 'ex-head');
  head.append(el('span', 'ex-title', `${n}. ${e.title}`), el('span', 'meta', `${e.id} · ${e.kind}`));
  card.append(head, el('div', 'when', e.cue ? `【${e.cue}】 ${e.when}` : e.when));
  for (const l of e.heard) card.append(lineRow('hears', l));
  for (const l of e.short) card.append(lineRow(e.kind === 'say' ? 'says' : 'answers', l));
  for (const l of e.then) card.append(lineRow('hears back', l));
  return card;
}

/** Readings and sounds the review flagged as needing an ear (REVIEW Appendix B). */
const EAR: { block: string; question: string; extra?: [string, string][] }[] = [
  {
    block: 'what',
    question: 'Does "Sorry, what?" sound natural, and clearly like asking to hear it again?',
    extra: [['Sorry, what?', audioPath('Sorry, what?')]],
  },
  { block: 'nice to meet you', question: 'Does "meet you" run together as ミーチュー, or is it ミート ユー?' },
  { block: 'got it', question: 'Is the t in "got it" a soft d (ガーディッ) or more like ガーリッ?' },
  { block: 'understand', question: 'Is the vowel in "-stand" closer to ステァ or スタ? Is the final d heard?' },
  { block: 'any idea', question: 'Is the stress on "-dee-" (アイディーア)?' },
  { block: 'thank you', question: 'センキュー or サンキュー?' },
];

function earSection(): HTMLElement {
  const sec = el('section', 'ex');
  for (const item of EAR) {
    const b = BLOCKS.get(item.block)!;
    const row = el('div', 'ear');
    const q = el('div', 'q');
    const sample = el('div', 'blocks');
    const blockEl = el('span', 'block');
    blockEl.append(kana(b.kana), el('span', 'word', b.en));
    sample.append(blockEl);
    const clip = clipFor(b.en);
    q.append(sample, el('div', '', item.question), el('div', 'tech', [clip?.phonemes, pitchText(clip)].filter(Boolean).join('   ')));
    const buttons = el('div', 'buttons');
    buttons.append(clip ? playButton('play', audioPath(clip.text)) : el('span', 'missing', 'no clip'));
    for (const [label, path] of item.extra ?? []) buttons.append(playButton(label, path));
    row.append(q, buttons);
    sec.append(row);
  }
  return sec;
}

root.append(
  el('h1', '', 'えいごフレンズ: listen and check'),
  el('p', 'lead', 'Tap ▶ to hear a line, or a block to hear it on its own. In readings, dots mark the stressed beat. Highlighted blocks are what she must catch.'),
  el('h2', '', 'By ear first'),
  earSection(),
  el('h2', '', `Every phrase, in teaching order (${ORDERED.length})`),
  ...ORDERED.map((e, i) => exchangeCard(e, i + 1)),
  el('h2', '', 'The app’s own words'),
  (() => {
    const sec = el('section', 'ex');
    for (const [key, t] of Object.entries(UI)) sec.append(lineRow(key, t.line));
    return sec;
  })(),
);
