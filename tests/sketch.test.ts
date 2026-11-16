/// <reference types="node" />
// The hand-drawn outlines (tools/sketch/sketch.mjs): the generated stylesheet must match the tool, and every frame
// must keep the promises the CSS relies on.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain JavaScript tool, without type declarations
import { FRAMES, PAD, buildSketchCss, drawEdge, drawFrame } from '../tools/sketch/sketch.mjs';

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
  arc: boolean;
  part: number;
  outside: number;
  width: number;
}
interface Frame {
  name: string;
  w: number;
  bow?: boolean;
}
interface Drawn {
  line: Point[];
  slice: number[];
  size: number[];
}

const lf = (s: string) => s.replace(/\r\n/g, '\n');
const frames = (FRAMES as Frame[]).map((f) => ({ f, d: drawFrame(f) as Drawn }));

describe('hand-drawn frames', () => {
  it('src/app/sketch.css matches the tool (run npm run sketch if not)', () => {
    expect(lf(readFileSync('src/app/sketch.css', 'utf8')) === lf(buildSketchCss()), 'src/app/sketch.css is out of date').toBe(true);
  });

  it("every line covers its element's clean edge, so the element's fill never shows outside it", () => {
    for (const { f, d } of frames) {
      for (const p of d.line) {
        // The outer side lies beyond the edge, but within the frame's reach outside the element...
        expect(p.outside, f.name).toBeGreaterThan(0.1);
        expect(p.outside, f.name).toBeLessThan(PAD);
        // ...and the inner side lies inside it.
        expect(p.width - p.outside, f.name).toBeGreaterThan(0.3);
      }
    }
  });

  it('the sides are straight bands, so a short element (its sides squeezed to a few pixels) shows no notch', () => {
    for (const { f, d } of frames) {
      const sides = d.line.filter((p) => !p.arc && p.nx !== 0);
      for (const p of sides) {
        const first = sides.find((q) => q.part === p.part)!;
        expect(p.outside, f.name).toBeCloseTo(first.outside, 9);
        expect(p.width, f.name).toBeCloseTo(first.width, 9);
      }
    }
  });

  it('top and bottom edges bow only between the corner pieces, where the picture stretches', () => {
    for (const { f, d } of frames) {
      const corner = d.slice[1] - PAD;
      const edges = d.line.filter((p) => !p.arc && p.ny !== 0 && (p.x <= corner || p.x >= f.w - corner));
      for (const p of edges) {
        const level = d.line.find((q) => q.part === p.part && (q.x <= corner || q.x >= f.w - corner))!;
        expect(p.outside, f.name).toBeCloseTo(level.outside, 9);
      }
    }
  });

  it('each frame leaves a middle piece that can stretch, between corner pieces that hold the whole curve', () => {
    for (const { f, d } of frames) {
      const [W, H] = d.size;
      const [top, right, bottom, left] = d.slice;
      expect(left + right, f.name).toBeLessThan(W);
      expect(top + bottom, f.name).toBeLessThan(H);
    }
  });

  it("the page panel's edge thins out at both ends and stays thick across the top", () => {
    const { line } = drawEdge() as { line: Point[] };
    expect(line[0].width).toBeLessThan(0.6);
    expect(line.at(-1)!.width).toBeLessThan(0.6);
    for (const p of line.filter((q) => !q.arc)) expect(p.width).toBeGreaterThan(2.4);
  });
});
