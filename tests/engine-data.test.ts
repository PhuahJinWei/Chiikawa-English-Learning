// The note-reading engine as the app builds it (tools/build/engine-data.ts): its data unpacked in advance, so her
// iPhone needs neither `for await` on a stream (which Safari lacks) nor WebKit's unpacker (which crashed on it).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { unpacked } from '../tools/build/engine-data.ts';

const ENGINE = new URL('../node_modules/phonemizer/dist/phonemizer.js', import.meta.url);
type Engine = { phonemize: (text: string, language: string) => Promise<string[]> };

describe('the note-reading engine, as built', () => {
  it('starts without streams, and reads exactly as the engine it was made from', async () => {
    const built = unpacked(readFileSync(ENGINE, 'utf8'));
    expect(built).not.toContain('DecompressionStream');
    expect(built).not.toContain('for await');
    // Each loaded from a file, as the app loads it: the same sentences come out the same.
    const dir = mkdtempSync(join(tmpdir(), 'eigo-engine-'));
    try {
      writeFileSync(join(dir, 'built.mjs'), built);
      const original = (await import(/* @vite-ignore */ ENGINE.href)) as Engine;
      const mine = (await import(/* @vite-ignore */ pathToFileURL(join(dir, 'built.mjs')).href)) as Engine;
      for (const text of ['Where are you going?', 'Can I have some water?', 'My brother works in Kuala Lumpur.']) {
        expect(await mine.phonemize(text, 'en-us')).toEqual(await original.phonemize(text, 'en-us'));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stops the build when the engine is not as expected (after an update), instead of shipping it unchanged', () => {
    expect(() => unpacked('export const phonemize = async () => [];')).toThrow(/phonemizer/);
  });
});
