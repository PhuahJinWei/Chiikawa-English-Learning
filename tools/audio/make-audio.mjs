// Generates every English clip the app plays, on this PC, with Kokoro (no account, no online service).
//
//   cd tools/audio && npm install      (once; the speech model downloads on the first run, about 330 MB)
//   node make-audio.mjs                (only makes clips that are new or whose text/settings changed)
//   node make-audio.mjs --force        (remakes everything)
//
// Writes public/audio/<slug>.mp3 and src/content/audio-manifest.json, which the app and the content tests read.
// One voice (Heart) at natural speed only: the user removed slow versions on 2026-11-16. Clips no longer used by any
// line are deleted, and so is anything left from older layouts.
import { KokoroTTS } from 'kokoro-js';
import { phonemize } from 'phonemizer';
import { createMp3Encoder } from 'wasm-media-encoders';
import { pitchTrack } from './pitch.mjs';
import { spoken } from './say-as.mjs';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { allLines, courseLines } = await import(pathToFileURL(join(ROOT, 'src/content/index.ts')).href);
const { audioSlug } = await import(pathToFileURL(join(ROOT, 'src/content/audio.ts')).href);
const { NOTE_CLIPS } = await import(pathToFileURL(join(ROOT, 'src/content/notes.ts')).href);

/** The voice the user chose (2026-11-16): one voice, Heart, natural speed. The MP3s are constant bitrate: without a
 * length header (this encoder writes none), Safari can only work out a variable-bitrate file's length by guessing
 * (REVIEW 4.11). The app also takes each clip's length from the manifest rather than from the file. */
const SETTINGS = { voice: 'af_heart', speed: 1, process: 3, mp3: 'cbr64' };
const RATE = 24000;

// Respellings for the voice only (say-as.mjs). The manifest keeps what was really said (`say`) and its phonemes.

const MANIFEST = join(ROOT, 'src/content/audio-manifest.json');
const OUT = join(ROOT, 'public/audio');
const force = process.argv.includes('--force');

// ── What to make: every line of the steps that are not drafts (the user, 2026-11-16: no audio until the content is
// decided), then every block as it appears in a line (for replaying the key blocks after a miss), then the English
// you voiced from her notes (src/content/notes.ts).
const jobs = new Map(); // slug → text
const add = (map, text) => {
  const id = audioSlug(text);
  if (!map.has(id)) map.set(id, text);
};
for (const line of allLines()) add(jobs, line.en);
for (const line of allLines()) for (const part of line.parts) add(jobs, part.text);
for (const text of NOTE_CLIPS) add(jobs, text);

// Clips already made are kept while any step still uses them, drafts included: putting a step back to draft never
// deletes its audio.
const used = new Map(jobs);
for (const line of courseLines()) add(used, line.en);
for (const line of courseLines()) for (const part of line.parts) add(used, part.text);

const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { clips: {} };
const sameSettings = JSON.stringify(old.settings) === JSON.stringify(SETTINGS);
const todo = [...jobs].filter(([id, text]) => {
  const prev = old.clips?.[id];
  return (
    force ||
    !sameSettings ||
    !prev ||
    prev.text !== text ||
    (prev.say ?? prev.text) !== spoken(text) ||
    !prev.pitch ||
    !existsSync(join(OUT, `${id}.mp3`))
  );
});
console.log(`${jobs.size} clips needed, ${todo.length} to make${sameSettings ? '' : ' (settings changed: remaking all)'}`);

// ── Sound clean-up: trim silence, even out loudness, short fades, a little air before and after.
function frameRms(x, from, len) {
  let s = 0;
  const end = Math.min(x.length, from + len);
  for (let i = from; i < end; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, end - from));
}

function tidy(raw) {
  const win = Math.round(RATE * 0.01);
  const gate = 0.008;
  let first = -1;
  let last = -1;
  for (let i = 0; i < raw.length; i += win) {
    if (frameRms(raw, i, win) > gate) {
      if (first < 0) first = i;
      last = i + win;
    }
  }
  if (first < 0) throw new Error('silent clip');
  const start = Math.max(0, first - Math.round(RATE * 0.03));
  const end = Math.min(raw.length, last + Math.round(RATE * 0.08));
  const x = raw.slice(start, end);

  // Loudness: RMS of the voiced frames to a common level, never letting the peak pass -1 dBFS.
  let sum = 0;
  let n = 0;
  let peak = 0;
  for (let i = 0; i < x.length; i += win) {
    const r = frameRms(x, i, win);
    if (r > gate) {
      sum += r * r;
      n++;
    }
  }
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const rms = Math.sqrt(sum / Math.max(1, n));
  const gain = Math.min(0.12 / rms, 0.89 / peak);

  const fadeIn = Math.round(RATE * 0.005);
  const fadeOut = Math.round(RATE * 0.02);
  const lead = Math.round(RATE * 0.04);
  const tail = Math.round(RATE * 0.1);
  const out = new Float32Array(lead + x.length + tail);
  for (let i = 0; i < x.length; i++) {
    let g = gain;
    if (i < fadeIn) g *= i / fadeIn;
    if (i > x.length - fadeOut) g *= (x.length - i) / fadeOut;
    out[lead + i] = x[i] * g;
  }
  return out;
}

/** Pitch at the start, lowest and end of a clip (Hz): kept in the manifest and shown on review.html (see pitch.mjs). */
function pitchSummary(samples) {
  const f = pitchTrack(samples, RATE).f0.filter((v) => v > 0);
  if (f.length < 3) return { start: 0, low: 0, end: 0 };
  const avg = (a) => Math.round(a.reduce((t, v) => t + v, 0) / a.length);
  return { start: avg(f.slice(0, 3)), low: Math.round(Math.min(...f)), end: avg(f.slice(-3)) };
}

async function toMp3(samples) {
  const enc = await createMp3Encoder();
  enc.configure({ channels: 1, sampleRate: RATE, bitrate: 64 });
  const chunks = [];
  for (let i = 0; i < samples.length; i += 4096) chunks.push(enc.encode([samples.subarray(i, i + 4096)]).slice());
  chunks.push(enc.finalize().slice());
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

// ── Make them.
const clips = sameSettings && !force ? { ...old.clips } : {};
mkdirSync(OUT, { recursive: true });
if (todo.length) {
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
  let done = 0;
  for (const [id, text] of todo) {
    const say = spoken(text);
    const audio = await tts.generate(say, { voice: SETTINGS.voice, speed: SETTINGS.speed });
    const samples = tidy(audio.audio);
    writeFileSync(join(OUT, `${id}.mp3`), await toMp3(samples));
    const phonemes = (await phonemize(say, 'en-us')).join(' ');
    const ms = Math.round((samples.length / RATE) * 1000);
    clips[id] = { text, ...(say !== text ? { say } : {}), ms, phonemes, pitch: pitchSummary(samples) };
    if (++done % 20 === 0) console.log(`  ${done}/${todo.length}`);
  }
}

// ── Keep only what is used: delete unused clips and anything from older layouts, then write the manifest.
for (const id of Object.keys(clips)) if (!used.has(id)) delete clips[id];
function sweep(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      sweep(full);
      if (!readdirSync(full).length) rmdirSync(full);
      continue;
    }
    const id = relative(OUT, full).replace(/\\/g, '/').replace(/\.mp3$/, '');
    if (!clips[id]) {
      rmSync(full);
      console.log(`  removed ${relative(ROOT, full).replace(/\\/g, '/')}`);
    }
  }
}
sweep(OUT);
const sorted = Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(MANIFEST, JSON.stringify({ settings: SETTINGS, clips: sorted }, null, 1) + '\n');
const bytes = Object.keys(sorted).reduce((t, id) => t + readFileSync(join(OUT, `${id}.mp3`)).length, 0);
console.log(`manifest: ${Object.keys(sorted).length} clips, ${(bytes / 1024).toFixed(0)} KB of MP3`);
