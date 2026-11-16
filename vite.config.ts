import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import pkg from './package.json' with { type: 'json' };
import { devSave } from './tools/build/dev-save.ts';
import { serviceWorker } from './tools/build/service-worker.ts';


export default defineConfig({
  // Relative paths, so the built app works from the GitHub Pages sub-folder (/eigo-friends/).
  base: './',
  plugins: [svelte(), serviceWorker(), devSave()],
  define: {
    // Only the package version: anything that changes with every build (a time, a commit) would make every build a
    // new version that the phone must download again (REVIEW 5.4). The exact build is the service worker's content
    // version, which the app shows next to this.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // three.js makes one ~850 KB chunk; it is downloaded once and then kept offline, so splitting it buys nothing.
    chunkSizeWarningLimit: 1000,
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
