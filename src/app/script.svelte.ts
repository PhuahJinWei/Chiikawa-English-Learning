import { onDestroy } from 'svelte';
import { audioState, play, stop, type Channel, type PlayResult } from './audio.svelte.ts';

/**
 * The lesson's scripted sequences (play this, wait, play that) and how she stays in control of them:
 * - Pause (the ⏸ button, or automatically when the app leaves the screen) freezes every wait and clip. On resume the
 *   cut clip plays again from the start: nothing is skipped behind her back (REVIEW 1.2, 1.5).
 * - Her own taps win: while she plays a clip herself, the script holds, then replays what it was playing.
 * - Leaving a screen cancels its sequence at the next step, and starting a new sequence cancels the previous one.
 */
export const lesson = $state({ paused: false });

export function pauseLesson(): void {
  lesson.paused = true;
  stop();
}

export function resumeLesson(): void {
  lesson.paused = false;
}

export const CANCELLED = Symbol('cancelled');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const held = () => lesson.paused || audioState.manual || (typeof document !== 'undefined' && document.hidden);

export interface Run {
  /** Waits this long, not counting time spent paused, hidden, or while she plays a clip herself. */
  wait(ms: number): Promise<void>;
  /** Plays a clip all the way through, replaying it if a pause or her own tap cut it. */
  play(path: string, channel: Channel): Promise<PlayResult>;
  /** Waits until the condition is true (for example, until she taps a button). */
  until(cond: () => boolean): Promise<void>;
}

/** Call during component setup. */
export function lifetime() {
  let alive = true;
  let token = 0;
  onDestroy(() => {
    alive = false;
    token++;
    // Whatever was playing belonged to this screen (a step, or a card she tapped on it).
    stop();
  });

  function makeRun(my: number): Run {
    const check = () => {
      if (!alive || my !== token) throw CANCELLED;
    };
    const free = async () => {
      while (held()) {
        await sleep(120);
        check();
      }
    };
    return {
      async wait(ms) {
        check();
        let left = ms;
        while (left > 0) {
          const step = Math.min(left, 100);
          await sleep(step);
          check();
          if (!held()) left -= step;
        }
      },
      async play(path, channel) {
        for (;;) {
          await free();
          check();
          const r = await play(path, channel, 'script');
          check();
          if (r !== 'stopped') return r;
        }
      },
      async until(cond) {
        while (!cond()) {
          await sleep(100);
          check();
        }
      },
    };
  }

  return {
    /** Starts a sequence. Starting another one cancels this one (for example "one more time"). */
    run(seq: (s: Run) => Promise<void>): void {
      const my = ++token;
      seq(makeRun(my)).catch((e) => {
        if (e !== CANCELLED) throw e;
      });
    },
  };
}
