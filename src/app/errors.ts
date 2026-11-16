/**
 * Errors, in proportion (REVIEW 4.8):
 * - Before the app has started, an error means it cannot be used: the start-up panel in index.html shows it, with a
 *   reload button (main.ts).
 * - After that, an error is noted (the self-check report lists the last few) and a small notice offers a way out,
 *   but the lesson stays on screen. A screen that fails to draw shows the error screen in its place (App.svelte).
 * - Known harmless ones are only noted.
 */
export const errorLog: { at: number; text: string }[] = [];

const HARMLESS = [
  /ResizeObserver loop/i, // layout noise
  /\b(AbortError|NotAllowedError)\b/, // a sound or a share that was cut short or refused
  /audio\//, // a clip that did not load: the step itself offers to try again
  /^Script error\.?$/, // from another site: nothing to act on
  /Load failed|Failed to fetch|NetworkError|network connection was lost/i, // a weak connection (update checks)
];

export function errorText(e: unknown): string {
  const text =
    e instanceof Error
      ? `${e.name}: ${e.message}${e.stack ? `\n${e.stack}` : ''}`
      : e && typeof e === 'object' && 'message' in e
        ? String((e as { message: unknown }).message)
        : String(e);
  return text.slice(0, 1500);
}

/** Notes an error for the self-check. True if it is worth a notice. */
export function noteError(e: unknown): boolean {
  const text = errorText(e);
  errorLog.push({ at: Date.now(), text });
  if (errorLog.length > 10) errorLog.shift();
  console.error(e);
  return !HARMLESS.some((r) => r.test(text));
}
