// Voice test (Phase 0): the hardest lines in a few American voices, for judging by ear.
// Run: node make-samples.mjs   → writes samples/*.wav and samples/index.html
import { KokoroTTS } from 'kokoro-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const VOICES = [
  { id: 'af_heart', label: 'Heart (female)' },
  { id: 'af_bella', label: 'Bella (female)' },
  { id: 'am_michael', label: 'Michael (male)' },
  { id: 'am_fenrir', label: 'Fenrir (male)' },
];

const LINES = [
  { id: 'more', text: 'More?', why: 'one-word question' },
  { id: 'hungry', text: 'Hungry?', why: 'one-word question' },
  { id: 'yes', text: 'Yes.', why: 'one-word reply' },
  { id: 'sorry', text: 'Sorry?', why: 'must rise, to ask again' },
  { id: 'no-thanks', text: 'No, thank you.', why: 'short reply' },
  { id: 'want-more', text: 'Do you want some more?', why: 'full question' },
  { id: 'from', text: 'Where are you from?', why: 'question word' },
  { id: 'chicken-fish', text: 'Chicken or fish?', why: 'choice' },
  { id: 'eat-already', text: 'Eat already?', why: 'Malaysian phrasing' },
  { id: 'can-or-not', text: 'Can or not?', why: 'Malaysian phrasing' },
];

// Natural speed only: the user removed slow versions on 2026-11-16.
const SPEEDS = [{ id: 'natural', speed: 1 }];

mkdirSync('samples', { recursive: true });
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });

const stats = [];
for (const line of LINES) {
  for (const voice of VOICES) {
    for (const s of SPEEDS) {
      const file = `${line.id}_${voice.id}_${s.id}.wav`;
      const audio = await tts.generate(line.text, { voice: voice.id, speed: s.speed });
      await audio.save(`samples/${file}`);
      const data = audio.audio;
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      stats.push({ file, seconds: +(data.length / audio.sampling_rate).toFixed(2), peak: +peak.toFixed(2) });
    }
  }
}
writeFileSync('samples/stats.json', JSON.stringify(stats, null, 1));

const cell = (line, voice) =>
  SPEEDS.map((s) => `<div class="clip"><span>${s.id}</span><audio controls preload="none" src="${line.id}_${voice.id}_${s.id}.wav"></audio></div>`).join('');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice test</title>
<style>
  body { font-family: system-ui, sans-serif; background: #FFF9EF; color: #66432F; margin: 0; padding: 16px; }
  h1 { font-size: 20px; } p { max-width: 60ch; }
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; }
  th, td { border: 2px solid #66432F33; padding: 8px; vertical-align: top; text-align: left; }
  th { background: #FBEFD9; }
  .why { font-size: 12px; opacity: .75; }
  .clip { display: flex; align-items: center; gap: 6px; margin: 2px 0; font-size: 12px; }
  .clip span { width: 48px; }
  audio { height: 32px; width: 200px; }
</style></head><body>
<h1>Voice test: the hardest lines</h1>
<p>Listen for three things: does a one-word question sound like a question, and is anything clipped or garbled? Then pick a voice.</p>
<div class="wrap"><table>
<tr><th>Line</th>${VOICES.map((v) => `<th>${v.label}</th>`).join('')}</tr>
${LINES.map((l) => `<tr><td><b>${l.text}</b><div class="why">${l.why}</div></td>${VOICES.map((v) => `<td>${cell(l, v)}</td>`).join('')}</tr>`).join('\n')}
</table></div>
</body></html>`;
writeFileSync('samples/index.html', html);
console.log(`wrote ${stats.length} clips`);
