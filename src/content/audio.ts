/**
 * Where each piece of English audio lives: audio/<slug>.mp3, one clip per line and per block as it appears in a line,
 * all in the one voice at natural speed (the user, 2026-11-16: no slow versions, natural speaking tone only).
 *
 * Files are named after their text, so the same words are generated and downloaded once however many lines use them.
 * Punctuation that changes the voice is kept in the name: "Ready?" and "Ready." would be different clips.
 */
export function audioSlug(en: string): string {
  return en
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/\?/g, ' q ')
    .replace(/!/g, ' x ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function audioPath(en: string): string {
  return `audio/${audioSlug(en)}.mp3`;
}
