import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import pkg from './package.json' with { type: 'json' };
import { devSave } from './tools/build/dev-save.ts';
import { engineData } from './tools/build/engine-data.ts';
import { serviceWorker } from './tools/build/service-worker.ts';

/** What the built app is made from: a change anywhere else (notes, tests, the workflow) changes nothing on her phone. */
const BUILD_INPUTS = ['src', 'public', 'index.html', 'vite.config.ts', 'svelte.config.js', 'tsconfig.json', 'package.json', 'package-lock.json', 'tools/build'];

/**
 * When the app itself last changed (2026-11-18), shown in 設定 as 最終更新: the time of the newest commit that touched
 * what it is built from. Not the time of the build, nor of the newest commit: a push of notes or tests alone would
 * then be a new version that the phone must download again (REVIEW 5.4). The deploy fetches the whole history for
 * this (.github/workflows/deploy.yml): in a shallow copy the newest commit seems to touch everything. Empty without git.
 */
function lastChange(): string {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', ...BUILD_INPUTS], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  // Relative paths, so the built app works from the GitHub Pages sub-folder (/Chiikawa-English-Learning/).
  base: './',
  plugins: [svelte(), engineData(), serviceWorker(), devSave()],
  // The note-reading engine is served through the plugins in development too (engineData unpacks its data), not
  // pre-bundled as it is.
  optimizeDeps: { exclude: ['phonemizer'] },
  define: {
    // Nothing that changes with every build (the time of the build, the newest commit): it would make every build a
    // new version that the phone must download again (REVIEW 5.4). The exact build is the service worker's content
    // version, which the app shows next to the package version, with the date of the app's last change.
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_DATE__: JSON.stringify(lastChange()),
  },
  build: {
    // three.js and the app make one chunk of about 1 MB, and the pronunciation engine for note readings
    // (src/app/reading.ts) one of 1.9 MB, its data unpacked in advance (tools/build/engine-data.ts), loaded only when
    // a note needs it. Both are downloaded once and then kept offline, so splitting them buys nothing.
    chunkSizeWarningLimit: 2000,
  },
  server: {
    // The RPG uses 5173; this keeps both runnable at once.
    port: 5180,
    strictPort: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
