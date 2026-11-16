/**
 * Readings mark the stressed beat with [ ] (src/content/blocks.ts): 'タ[マー]ロウ' → タ · マー (stressed) · ロウ.
 */
export interface KanaSegment {
  text: string;
  stress: boolean;
}

export function kanaSegments(kana: string): KanaSegment[] {
  return kana
    .split(/(\[[^\]]*\])/)
    .filter(Boolean)
    .map((s) => (s.startsWith('[') ? { text: s.slice(1, -1), stress: true } : { text: s, stress: false }));
}

/** The reading without stress marks: for screen readers and for timing. */
export const plainKana = (kana: string): string => kana.replace(/[[\]]/g, '');
