// Writes src/app/sketch.css: the hand-drawn frames the app's outlines use (see sketch.mjs).
//
//   npm run sketch     (after any change to sketch.mjs; tests/sketch.test.ts fails while the file is out of date)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSketchCss } from './sketch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = buildSketchCss();
writeFileSync(join(ROOT, 'src', 'app', 'sketch.css'), css);
console.log(`wrote src/app/sketch.css (${(css.length / 1024).toFixed(1)} KB)`);
