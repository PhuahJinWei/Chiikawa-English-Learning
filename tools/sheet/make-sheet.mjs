// Writes the content sheet for review: content-sheet.html (open by double-clicking) and content-sheet.csv (Excel).
//
//   npm run sheet      (after any change to src/content; tests/sheet.test.ts fails while they are out of date)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSheet } from './sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { html, csv } = buildSheet();
writeFileSync(join(ROOT, 'content-sheet.html'), html);
writeFileSync(join(ROOT, 'content-sheet.csv'), csv);
console.log('wrote content-sheet.html and content-sheet.csv');
