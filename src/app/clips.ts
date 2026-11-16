import { audioPath, audioSlug } from '../content/audio.ts';
import manifest from '../content/audio-manifest.json';
import { looseEnglish } from '../learn/notes.ts';

const CLIPS = (manifest as { clips: Record<string, { ms: number; text: string }> }).clips;

/**
 * Every clip by its English however it is written ("thank you" finds "Thank you!"); the first of a kind wins. A
 * question stays a question: a note "Ready." never plays the clip "Ready?", which is said as one.
 */
const clipKey = (text: string) => looseEnglish(text) + (/\?\s*$/.test(text) ? '?' : '');
const LOOSE = new Map<string, string>();
for (const c of Object.values(CLIPS)) {
  const key = clipKey(c.text);
  if (key && !LOOSE.has(key)) LOOSE.set(key, c.text);
}

/**
 * The Heart clip for any English, or null if there is none: her notes play in Heart when their English is a lesson
 * line, a block, or one you have voiced for her (src/content/notes.ts); otherwise the iPhone's own voice reads them.
 */
export function heartPath(en: string): string | null {
  const text = en.trim();
  if (!text) return null;
  if (CLIPS[audioSlug(text)]) return audioPath(text);
  const loose = LOOSE.get(clipKey(text));
  return loose ? audioPath(loose) : null;
}

export { audioPath };
