/// <reference types="node" />
// The content sheet is how the user reviews the content, so it must never be out of date.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain JavaScript tool, without type declarations
import { buildSheet } from '../tools/sheet/sheet.mjs';

const lf = (s: string) => s.replace(/\r\n/g, '\n');

describe('content sheet', () => {
  it('content-sheet.html and content-sheet.csv match the content (run npm run sheet if not)', () => {
    const { html, csv } = buildSheet() as { html: string; csv: string };
    expect(lf(readFileSync('content-sheet.html', 'utf8')) === lf(html), 'content-sheet.html is out of date').toBe(true);
    expect(lf(readFileSync('content-sheet.csv', 'utf8')) === lf(csv), 'content-sheet.csv is out of date').toBe(true);
  });
});
