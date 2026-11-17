/**
 * Today's cards and button always show whole (2026-11-17): the friends' scene above them gives up the room they
 * lack. Today reports how many pixels its cards lack (StepLayout's onFit; negative when they have room to spare), and
 * the scene becomes as tall as it is now less that. App.svelte keeps it between a floor, under which the cards scroll
 * instead, and its usual size (44% of the screen), so it never grows past what it was before.
 *
 * Fixed sizes had been tuned on the screen's full height, but the home-screen app is shorter: the status bar and the
 * home bar take their share. On an iPhone 13 the stamps were cut off, and fonts and phones differ, so the scene now
 * follows what the cards need. The scene's height and the cards' room change together, so their sum stays the same
 * and the result is steady, even in the middle of the scene's 0.35 s change of height.
 */
export const scene = $state({ fit: null as number | null });

let box: HTMLElement | null = null;
/** The last report, for a scene element that arrives after it. */
let last: number | null = null;

/** The scene's element (App.svelte). */
export function sceneBox(el: HTMLElement | null): void {
  box = el;
  fitScene(last);
}

/** The cards below lack `lack` pixels (negative: they have that much to spare); null when no screen asks any more. */
export function fitScene(lack: number | null): void {
  last = lack;
  if (lack === null || !box) {
    scene.fit = null;
    return;
  }
  const fit = Math.round(box.getBoundingClientRect().height - lack);
  if (scene.fit === null || Math.abs(fit - scene.fit) >= 1) scene.fit = fit;
}
