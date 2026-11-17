/**
 * The message that tells a new version of the app, downloaded and waiting, to take over: the service worker then
 * stops waiting (tools/build/service-worker.ts). The app sends it (src/app/updates.ts), and so does the start-up
 * panel's もう一度読み込む in index.html, which cannot import this: tests/boot.test.ts checks that it sends the same
 * (2026-11-18: the three were written separately, and nothing would have noticed one of them changing).
 */
export const TAKE_OVER = { type: 'activate' } as const;
