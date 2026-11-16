// Writes src/content/phonemes.json: the voice's phonemes for every word block, so the readings can be checked
// without making any audio (the user, 2026-11-16: no audio until the content is decided). Takes a few seconds.
//
//   node tools/audio/phonemes.mjs      (after adding or changing word blocks in src/content/blocks.ts)
//
// The voice (Kokoro) turns text into these same phonemes before speaking, so a reading that matches them matches
// what the clip will say.
import { phonemize } from 'phonemizer';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spoken } from './say-as.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { BLOCKS, keyOf } = await import(pathToFileURL(join(ROOT, 'src/content/blocks.ts')).href);

const out = {};
for (const b of BLOCKS.values()) out[keyOf(b.en)] = (await phonemize(spoken(b.en), 'en-us')).join(' ');
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(ROOT, 'src/content/phonemes.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log(`phonemes for ${Object.keys(sorted).length} blocks`);
