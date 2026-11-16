import { BLOCKS, keyOf } from './blocks.ts';
import type { Line, Part } from './types.ts';

/**
 * Lines are written as blocks separated by `|`:
 *
 *   'Do you|want|*some more?'      → blocks "Do you" · "want" · "some more?", with "some more?" as the topic
 *   'Do you|want{ウォン}|*some more?' → this occurrence of "want" reads ウォン instead of the block's own reading
 *   '*Words@variant'               → the "words@variant" block: the same words with a second meaning
 *
 * `*` marks the topic: the block a native speaker would keep if they said the line in a word or two.
 */
const PART = /^(\*?)(.+?)(?:\{([^}]*)\})?(?:@([\w-]+))?$/;

function parsePart(src: string): Omit<Part, 'hi'> {
  const m = PART.exec(src.trim());
  if (!m) throw new Error(`Bad block "${src}"`);
  const [, star, text, kana, variant] = m;
  const key = keyOf(text) + (variant ? `@${variant}` : '');
  const def = BLOCKS.get(key);
  if (!def) throw new Error(`Unknown block "${key}" (in "${src}"). Add it to src/content/blocks.ts.`);
  return { key, text, kana: kana ?? def.kana, topic: star === '*' };
}

/** The highlight rule (PLAN.md section 4): only on heard lines; question words and "not" always; the topic. */
function highlight(part: Omit<Part, 'hi'>, role: Line['role']): boolean {
  if (role === 'said') return false;
  const kind = BLOCKS.get(part.key)!.kind;
  if (kind === 'qword' || kind === 'not') return true;
  return part.topic;
}

function build(src: string, ja: string, role: Line['role']): Line {
  const parts = src.split('|').map((p) => {
    const part = parsePart(p);
    return { ...part, hi: highlight(part, role) };
  });
  return { en: parts.map((p) => p.text).join(' '), ja, parts, role };
}

/** A line she hears (gets highlights). */
export const heard = (src: string, ja: string): Line => build(src, ja, 'heard');

/** A line she says (never highlighted). */
export const said = (src: string, ja: string): Line => build(src, ja, 'said');
