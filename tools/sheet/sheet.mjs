// Builds the content sheet: every step of the learning path as one table, for review without reading code.
// make-sheet.mjs writes it to content-sheet.html (open it by double-clicking) and content-sheet.csv (Excel);
// tests/sheet.test.ts fails when they are out of date.
import { audioPath } from '../../src/content/audio.ts';
import { BLOCKS, keyOf } from '../../src/content/blocks.ts';
import { COURSE, TALKS_WRITTEN, UI } from '../../src/content/index.ts';
import { kanaSegments } from '../../src/content/kana.ts';
import { TOPICS } from '../../src/content/topics.ts';

const TOPIC_EN = {
  app: 'App words', basics: 'Basics', table: 'At the table', family: 'Meeting the family', home: 'Around the house',
  chat: 'Starting a chat', feelings: 'Feelings', me: 'About me',
};
const KIND_EN = { reply: 'Answers', say: 'Starts', understand: 'Understands' };
const KIND_HELP = {
  reply: 'She hears something and answers.',
  say: 'She says it first, in the situation given.',
  understand: 'She only needs to understand it.',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const baseKey = (key) => keyOf(key.split('@')[0]);
const statusOf = (e) => (e.status === 'draft' ? 'draft' : e.status === 'approved' ? 'approved' : 'app');
const STATUS_EN = { draft: 'Draft', approved: 'Approved', app: 'In the app' };
const mainLine = (e) => (e.short[0] ?? e.heard[0]);
const wordsOf = (en) => keyOf(en).split(' ').filter(Boolean);
/** The base step's sentence that this step's own sentence reuses most: "How are you?" for asking it, not the base's
 * answer. A step's own sentence is what she says, or what she hears when she only listens. */
function reusedLine(base, e) {
  const mine = new Set((e.short.length ? e.short : e.heard).flatMap((l) => wordsOf(l.en)));
  const score = (l) => wordsOf(l.en).filter((w) => mine.has(w)).length;
  return [...base.short, ...base.heard, ...base.then].reduce((best, l) => (score(l) > score(best) ? l : best));
}

/** What each step is built on: its number in the path, the word blocks it brings, and its chain children. */
function analyse() {
  const num = new Map(COURSE.map((e, i) => [e.id, i + 1]));
  const known = new Set();
  const fresh = new Map();
  for (const e of COURSE) {
    const blocks = [...new Set([...e.heard, ...e.short, ...e.then].flatMap((l) => l.parts.map((p) => baseKey(p.key))))];
    fresh.set(e.id, blocks.filter((b) => !known.has(b)));
    for (const b of blocks) known.add(b);
  }
  const children = new Map();
  for (const e of COURSE) if (e.from) children.set(e.from, [...(children.get(e.from) ?? []), e]);
  const firstUse = new Map();
  const uses = new Map();
  for (const e of COURSE) {
    for (const k of new Set([...e.heard, ...e.short, ...e.then].flatMap((l) => l.parts.map((p) => p.key)))) {
      if (!firstUse.has(k)) firstUse.set(k, num.get(e.id));
      uses.set(k, (uses.get(k) ?? 0) + 1);
    }
  }
  return { num, fresh, children, firstUse, uses };
}

function lineHtml(l, highlight) {
  const blocks = l.parts
    .map((p) => {
      const kana = kanaSegments(p.kana).map((s) => (s.stress ? `<b>${esc(s.text)}</b>` : esc(s.text))).join('');
      return `<span class="b${highlight && p.hi ? ' hi' : ''}"><span class="k">${kana}</span>${esc(p.text)}</span>`;
    })
    .join(' ');
  return `<div class="ln"><div class="en">${blocks}</div><div class="ja">${esc(l.ja)}</div></div>`;
}

const linesHtml = (ls, highlight) => ls.map((l) => lineHtml(l, highlight)).join('');

function rowHtml(e, a) {
  const n = a.num.get(e.id);
  const st = statusOf(e);
  const audio = e.voiced ? 'has audio' : 'no audio yet';
  const base = e.from ? COURSE.find((x) => x.id === e.from) : null;
  const built = base ? `<div class="from">from #${a.num.get(base.id)} <i>${esc(reusedLine(base, e).en)}</i></div>` : '';
  const fresh = a.fresh.get(e.id).map((k) => `<span class="chip">${esc(BLOCKS.get(k)?.en ?? k)}</span>`).join(' ');
  const play = e.voiced
    ? `<button class="play" data-src="${esc('public/' + audioPath(mainLine(e).en))}" title="Play">▶</button>`
    : '';
  const search = [e.id, e.title, ...[...e.heard, ...e.short, ...e.then].flatMap((l) => [l.en, l.ja])].join(' ').toLowerCase();
  return `<tr data-status="${st}" data-topic="${e.topic}" data-kind="${e.kind}" data-text="${esc(search)}">
<td class="n">${n}</td>
<td><span class="badge ${st}">${STATUS_EN[st]}</span><div class="sub">${st === 'app' ? '' : audio}</div></td>
<td title="${esc(KIND_HELP[e.kind])}">${KIND_EN[e.kind]}</td>
<td>${linesHtml(e.heard, true)}</td>
<td>${linesHtml(e.short, false)}</td>
<td>${linesHtml(e.then, true)}</td>
<td>${built}${fresh || '<span class="none">none</span>'}</td>
<td>${TOPIC_EN[e.topic]}</td>
<td class="note"><div class="t">${esc(e.title)}</div>${e.cue ? `<div class="cue">【${esc(e.cue)}】</div>` : ''}<div>${esc(e.when)}</div></td>
<td>${play}<div class="id">${esc(e.id)}</div></td>
</tr>`;
}

function chainHtml(e, a) {
  const kids = a.children.get(e.id) ?? [];
  const to = e.kind === 'reply' ? ` <span class="sub">(to "${esc(e.heard[0].en)}")</span>` : '';
  const label = `<span class="n">#${a.num.get(e.id)}</span> ${esc(mainLine(e).en)}${to}${e.status === 'draft' ? ' <span class="badge draft">Draft</span>' : ''}`;
  return `<li>${label}${kids.length ? `<ul>${kids.map((k) => chainHtml(k, a)).join('')}</ul>` : ''}</li>`;
}

function blocksHtml(a) {
  const rows = [...BLOCKS]
    .sort(([x], [y]) => (a.firstUse.get(x) ?? 1e9) - (a.firstUse.get(y) ?? 1e9))
    .map(([key, b]) => {
      const kana = kanaSegments(b.kana).map((s) => (s.stress ? `<b>${esc(s.text)}</b>` : esc(s.text))).join('');
      return `<tr><td>${esc(b.en)}</td><td class="kana">${kana}</td><td>${esc(b.ja)}</td><td>${b.kind}</td><td class="n">${a.firstUse.get(key) ?? ''}</td><td class="n">${a.uses.get(key) ?? 0}</td><td class="ja">${esc(b.note ?? '')}</td></tr>`;
    });
  return rows.join('\n');
}

/** The conversations: their lines in order, and the steps they need (by #). */
function talksHtml(a) {
  return TALKS_WRITTEN.map(({ def, talk }, i) => {
    const after = talk ? talk.steps.map((id) => a.num.get(id)).sort((x, y) => x - y) : [];
    const lines = talk
      ? talk.turns
          .map((x) => `<div class="turn ${x.who}"><span class="who">${x.who === 'me' ? 'She says' : 'She hears'}</span>${lineHtml(x.line, x.who === 'them')}</div>`)
          .join('')
      : '<span class="none">A line is not in its step: see tests/talks.test.ts</span>';
    const st = def.status === 'draft' ? 'draft' : def.status === 'approved' ? 'approved' : 'app';
    return `<tr><td class="n">C${i + 1}</td><td><span class="badge ${st}">${STATUS_EN[st]}</span></td><td class="note"><div class="t">${esc(def.title)}</div><div class="cue">【${esc(def.cue)}】</div></td><td>${TOPIC_EN[def.topic]}</td><td class="n">${after.map((n) => '#' + n).join(' ')}</td><td>${lines}</td><td><div class="id">${esc(def.id)}</div></td></tr>`;
  }).join('\n');
}

const CSS = `
:root { --ink: #3b2f2a; --ink2: #7a6a62; --line: #e6dccf; --paper: #fffaf3; --hi: #ffe08a; --app: #d7f0d2; --draft: #ffe3b8; --ok: #d6e6ff; }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; font: 14px/1.45 system-ui, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif; color: var(--ink); background: var(--paper); }
h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 28px 0 8px; }
.summary { color: var(--ink2); margin-bottom: 12px; }
.help { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; max-width: 980px; }
.help p { margin: 4px 0; }
.filters { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; background: var(--paper); padding: 8px 0; border-bottom: 1px solid var(--line); }
.filters select, .filters input[type=search] { font: inherit; padding: 4px 6px; }
.filters input[type=search] { width: 240px; max-width: 100%; }
table { border-collapse: collapse; width: 100%; background: #fff; }
th, td { border: 1px solid var(--line); padding: 6px 8px; vertical-align: top; text-align: left; }
th { background: #f6efe4; position: sticky; top: var(--bar, 0); z-index: 1; }
td.n, th.n { text-align: right; color: var(--ink2); white-space: nowrap; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.badge.app { background: var(--app); } .badge.draft { background: var(--draft); } .badge.approved { background: var(--ok); }
.sub, .id, .none { color: var(--ink2); font-size: 12px; }
.ln { margin-bottom: 6px; } .ln:last-child { margin-bottom: 0; }
.en { font-size: 15px; font-weight: 600; }
.b { display: inline-flex; flex-direction: column; align-items: flex-start; margin-right: 2px; }
.b.hi { background: var(--hi); border-radius: 4px; padding: 0 3px; }
.k { font-size: 10px; font-weight: 400; color: var(--ink2); line-height: 1.1; }
.k b, .kana b { color: #c0392b; }
.ja { color: var(--ink2); font-size: 13px; }
.note { min-width: 220px; max-width: 360px; font-size: 13px; }
.note .t { font-weight: 700; } .note .cue { color: #6a4c93; }
.from { margin-bottom: 4px; font-size: 13px; }
.chip { display: inline-block; background: #f1e7d8; border-radius: 6px; padding: 0 6px; margin: 1px 2px 1px 0; font-size: 12px; }
.play { font: inherit; cursor: pointer; border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 2px 8px; }
body.no-kana .k { display: none; } body.no-ja .ja { display: none; }
.turn { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; } .turn.me { padding-left: 28px; }
.who { flex: none; width: 64px; font-size: 11px; color: var(--ink2); }
ul.chains, ul.chains ul { list-style: none; padding-left: 18px; margin: 2px 0; } ul.chains > li { margin-bottom: 8px; }
ul.chains ul > li::before { content: "→ "; color: var(--ink2); }
@media (max-width: 700px) { body { padding: 10px; } th { position: static; } }
`;

const SCRIPT = `
const rows = [...document.querySelectorAll('#path tbody tr')];
const f = (id) => document.getElementById(id);
function apply() {
  const st = f('status').value, tp = f('topic').value, kd = f('kind').value, q = f('q').value.trim().toLowerCase();
  let shown = 0;
  for (const r of rows) {
    const ok = (!st || r.dataset.status === st) && (!tp || r.dataset.topic === tp) && (!kd || r.dataset.kind === kd) && (!q || r.dataset.text.includes(q));
    r.hidden = !ok;
    if (ok) shown++;
  }
  f('shown').textContent = shown + ' of ' + rows.length + ' steps';
}
for (const id of ['status', 'topic', 'kind', 'q']) f(id).addEventListener('input', apply);
// The column headers stick just under the filter bar, whatever its height.
const bar = () => document.documentElement.style.setProperty('--bar', f('bar').offsetHeight + 'px');
addEventListener('resize', bar);
bar();
f('kana').addEventListener('change', (e) => document.body.classList.toggle('no-kana', !e.target.checked));
f('ja').addEventListener('change', (e) => document.body.classList.toggle('no-ja', !e.target.checked));
let audio = null;
document.addEventListener('click', (e) => {
  const b = e.target.closest('.play');
  if (!b) return;
  if (audio) audio.pause();
  audio = new Audio(b.dataset.src);
  audio.play().catch(() => { b.textContent = '✕'; b.title = 'Could not play: open this file from the project folder'; });
});
apply();
`;

export function buildSheet() {
  const a = analyse();
  const count = (st) => COURSE.filter((e) => statusOf(e) === st).length;
  const draftsWithAudio = COURSE.filter((e) => e.status === 'draft' && e.voiced).length;
  const roots = COURSE.filter((e) => !e.from && a.children.has(e.id));
  const topicOptions = Object.values(TOPICS)
    .map((t) => `<option value="${t.id}">${TOPIC_EN[t.id]} (${esc(t.title)})</option>`)
    .join('');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Content sheet</title>
<style>${CSS}</style>
</head>
<body>
<h1>えいごフレンズ: content sheet</h1>
<div class="summary">${COURSE.length} steps in teaching order: ${count('app')} in the app, ${count('approved')} approved and waiting for audio, ${count('draft')} drafts (${draftsWithAudio} of them can reuse audio made earlier). ${BLOCKS.size} word blocks, ${Object.keys(UI).length} app words, ${TALKS_WRITTEN.length} conversations. Made from src/content by <code>npm run sheet</code>; do not edit this file.</div>
<div class="help">
<p><b>How to review.</b> Show <b>Drafts</b> and read each row. Tell me by the <b>#</b> number: keep, change (and how), drop, or move earlier/later.</p>
<p><b>Answers</b>: she hears something and answers. <b>Starts</b>: she says it first (the 【situation】 is shown). <b>Understands</b>: she only needs to understand it.</p>
<p><b>Built from</b>: the earlier step it reuses. <b>New words</b>: word blocks she meets for the first time in that step. Highlighted words are the ones she must catch. Readings above the words mark the stressed beat in red.</p>
</div>
<div class="filters" id="bar">
<label>Status <select id="status"><option value="">All</option><option value="draft">Drafts</option><option value="approved">Approved, waiting for audio</option><option value="app">In the app</option></select></label>
<label>Topic <select id="topic"><option value="">All</option>${topicOptions}</select></label>
<label>Kind <select id="kind"><option value="">All</option><option value="reply">Answers</option><option value="say">Starts</option><option value="understand">Understands</option></select></label>
<label><input type="search" id="q" placeholder="Search English or Japanese"></label>
<label><input type="checkbox" id="kana" checked> Readings</label>
<label><input type="checkbox" id="ja" checked> Japanese</label>
<span id="shown" class="sub"></span>
</div>
<table id="path">
<thead><tr><th class="n">#</th><th>Status</th><th>Kind</th><th>She hears</th><th>She says</th><th>Then she hears</th><th>Built from / new words</th><th>Topic</th><th>Title, situation, note (Japanese)</th><th></th></tr></thead>
<tbody>
${COURSE.map((e) => rowHtml(e, a)).join('\n')}
</tbody>
</table>
<h2>Conversations: learned phrases strung together</h2>
<div class="help"><p>Each is made only of lines from the steps above, so it needs no new audio. It comes up in the lesson (one a day) and in 練習 once she has learned every step it uses: <b>Ready after</b> lists them. Tell me by the <b>C</b> number: keep, change, drop, or add one.</p></div>
<table>
<thead><tr><th class="n">#</th><th>Status</th><th>Title, situation (Japanese)</th><th>Topic</th><th class="n">Ready after</th><th>The conversation</th><th></th></tr></thead>
<tbody>
${talksHtml(a)}
</tbody>
</table>
<h2>Chains: steps built from earlier steps</h2>
<ul class="chains">
${roots.map((r) => chainHtml(r, a)).join('\n')}
</ul>
<h2>Word blocks, in the order she meets them</h2>
<table>
<thead><tr><th>Block</th><th>Reading</th><th>Meaning</th><th>Kind</th><th class="n">First at #</th><th class="n">Used in</th><th>Note</th></tr></thead>
<tbody>
${blocksHtml(a)}
</tbody>
</table>
<script>${SCRIPT}</script>
</body>
</html>
`;

  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const join = (ls, f) => ls.map(f).join(' / ');
  const header = ['#', 'Status', 'Audio', 'Kind', 'Topic', 'She hears', 'She hears (Japanese)', 'She says', 'She says (Japanese)',
    'Then she hears', 'Then she hears (Japanese)', 'Built from', 'New words', 'Title', 'Situation', 'Note', 'Id'];
  const rows = COURSE.map((e) => {
    const base = e.from ? COURSE.find((x) => x.id === e.from) : null;
    return [
      a.num.get(e.id), STATUS_EN[statusOf(e)], e.voiced ? 'yes' : 'no', KIND_EN[e.kind], TOPIC_EN[e.topic],
      join(e.heard, (l) => l.en), join(e.heard, (l) => l.ja), join(e.short, (l) => l.en), join(e.short, (l) => l.ja),
      join(e.then, (l) => l.en), join(e.then, (l) => l.ja),
      base ? `#${a.num.get(base.id)} ${reusedLine(base, e).en}` : '', a.fresh.get(e.id).map((k) => BLOCKS.get(k)?.en ?? k).join(', '),
      e.title, e.cue ?? '', e.when, e.id,
    ];
  });
  const talkHeader = ['Conversation', 'Status', 'Topic', 'Title', 'Situation', 'Ready after', 'Lines', 'Lines (Japanese)', 'Id'];
  const who = (x) => (x.who === 'me' ? 'She: ' : 'Them: ');
  const talkRows = TALKS_WRITTEN.map(({ def, talk }, i) => [
    `C${i + 1}`, STATUS_EN[def.status === 'draft' ? 'draft' : def.status === 'approved' ? 'approved' : 'app'], TOPIC_EN[def.topic],
    def.title, def.cue, talk ? talk.steps.map((id) => a.num.get(id)).sort((x, y) => x - y).map((n) => '#' + n).join(' ') : '',
    talk ? join(talk.turns, (x) => who(x) + x.line.en) : 'A line is not in its step', talk ? join(talk.turns, (x) => who(x) + x.line.ja) : '', def.id,
  ]);
  const csv = '﻿' + [header, ...rows, [], talkHeader, ...talkRows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  return { html, csv };
}
