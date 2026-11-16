import { audioContext, output } from './audio.svelte.ts';

/** Soft pops and chimes, synthesised (no files). Quiet on purpose: the English clips are what matter. */
function tone(freqs: number[], { type = 'sine' as OscillatorType, step = 0.09, len = 0.14, gain = 0.07, glide = 1 } = {}) {
  const c = audioContext();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + 0.01;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    const at = t0 + i * step;
    osc.frequency.setValueAtTime(f, at);
    if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(f * glide, at + len);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(g).connect(output());
    osc.start(at);
    osc.stop(at + len + 0.02);
  });
}

export const sfx = {
  /** A button or card appearing. */
  pop: () => tone([620], { len: 0.07, glide: 1.5, gain: 0.05 }),
  /** One character of a friend's bubble being typed. */
  blip: () => tone([1250 + Math.random() * 250], { type: 'triangle', len: 0.035, gain: 0.018 }),
  /** Right answer. */
  chime: () => tone([1047, 1319], { step: 0.1, len: 0.22, gain: 0.06 }),
  /** Not quite: gentle, never harsh. */
  boing: () => tone([392], { type: 'triangle', len: 0.22, glide: 0.7, gain: 0.05 }),
  /** Finished the day. */
  fanfare: () => tone([784, 988, 1175, 1568], { step: 0.11, len: 0.3, gain: 0.05 }),
};
