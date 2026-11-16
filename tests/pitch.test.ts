// The pitch measuring behind the audio list (tools/audio/pitch.mjs), checked on a synthetic voice: a pulse train with
// many harmonics, like vocal cords, at a pitch that can change over time.
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain JavaScript tool module without type declarations
import { pitchTrack } from '../tools/audio/pitch.mjs';

const RATE = 24000;

/** A voice-like tone: silence, then `seconds` of a buzz whose pitch follows f0(t), then silence. */
function voice(seconds: number, f0: (t: number) => number): Float32Array {
  const pad = Math.round(RATE * 0.06);
  const n = Math.round(RATE * seconds);
  const x = new Float32Array(pad + n + pad);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    phase += f0(i / RATE) / RATE;
    let v = 0;
    for (let h = 1; h <= 15; h++) v += Math.sin(2 * Math.PI * h * phase) / h;
    const edge = Math.min(1, i / (RATE * 0.02), (n - i) / (RATE * 0.02));
    x[pad + i] = 0.2 * v * edge;
  }
  return x;
}

const voiced = (x: Float32Array): number[] => (pitchTrack(x, RATE).f0 as number[]).filter((v) => v > 0);
const avg = (a: number[]) => a.reduce((t, v) => t + v, 0) / a.length;

describe('pitch measuring', () => {
  it('tracks a steady, a falling and a rising pitch', () => {
    expect(avg(voiced(voice(0.5, () => 200)))).toBeCloseTo(200, -1);
    const falling = voiced(voice(0.6, (t) => 250 - (70 * t) / 0.6));
    expect(avg(falling.slice(0, 3))).toBeGreaterThan(235);
    expect(avg(falling.slice(-3))).toBeLessThan(195);
    const rising = voiced(voice(0.6, (t) => 180 + (120 * t) / 0.6));
    expect(avg(rising.slice(-3))).toBeGreaterThan(280);
  });

  it('finds no pitch in quiet noise', () => {
    const noise = Float32Array.from({ length: RATE / 2 }, (_, i) => Math.sin(i * 12.9898) * 0.001);
    expect(voiced(noise)).toEqual([]);
  });
});
