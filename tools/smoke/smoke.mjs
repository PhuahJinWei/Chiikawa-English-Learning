// Smoke tests in WebKit, Safari's engine, on this PC (REVIEW section 6: "Tests in Safari's engine").
//
//   npm run build                     (in the project folder: the app to test)
//   cd tools/smoke && npm install     (once)
//   npx playwright install webkit     (once: about 180 MB, kept in %LOCALAPPDATA%\ms-playwright)
//   node smoke.mjs                    (serves dist/ under /eigo-friends/, as GitHub Pages does, and runs every check)
//
// WebKit on Windows shares Safari's engine (layout, JavaScript, service workers, Web Audio rules), not iOS itself
// (audio session, silent switch, home-screen apps, memory limits). What only a real iPhone can show is the
// self-check's job. Checks marked "info" report what WebKit did without failing the run.
import { devices, webkit } from 'playwright';
import { preview } from 'vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterDays } from './profiles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4175;
const BASE = `http://localhost:${PORT}/eigo-friends/`;
const PHONES = ['iPhone 13', 'iPhone SE (3rd gen)'].filter((name) => devices[name]);

const results = [];
async function check(name, fn, { info = false } = {}) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note ?? '' });
    console.log(`  ok    ${name}${note ? `: ${note}` : ''}`);
  } catch (e) {
    results.push({ name, ok: info, note: String(e?.message ?? e).split('\n')[0] });
    console.log(`  ${info ? 'info' : 'FAIL'}  ${name}: ${String(e?.message ?? e).split('\n')[0]}`);
  }
}

/** A phone-sized WebKit page, with every page error collected. */
async function open(browser, phone, options = {}) {
  const context = await browser.newContext({ ...devices[phone], ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { context, page, errors };
}

const booted = (page) => page.waitForFunction(() => window.__booted === true, null, { timeout: 15_000 });

/** Clicks through the first-run tour. */
async function finishTour(page) {
  for (let i = 0; i < 6; i++) {
    const done = page.getByRole('button', { name: 'はじめよう！' });
    if (await done.isVisible()) {
      await done.click();
      return;
    }
    await page.getByRole('button', { name: '次へ' }).click();
    await page.waitForTimeout(700); // buttons ignore taps for a moment after they appear
  }
  throw new Error('the tour did not end');
}

/** Makes sharing and copying fail, so the copy-by-hand box appears (WebKit here has no share sheet). */
const noSharing = (page) =>
  page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('no')) }, configurable: true });
  });

const tab = (page, name) => page.locator('nav').getByText(name, { exact: true }).click();

async function phoneChecks(browser, phone) {
  console.log(`\n${phone}`);
  const { context, page, errors } = await open(browser, phone);

  await check('starts, with no errors', async () => {
    await page.goto(BASE);
    await booted(page);
    if (errors.length) throw new Error(errors.join(' | '));
  });

  await check('nothing is wider than the screen', async () => {
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (wide > 0) throw new Error(`${wide}px too wide`);
  });

  await check('iPhone Safari first shows how to add it to the home screen', async () => {
    await page.getByText('ホーム画面に追加').first().waitFor();
    await page.getByRole('button', { name: 'あとで' }).click();
  });

  await check('the tour leads to Today', async () => {
    await finishTour(page);
    await page.getByText('今日のレッスン').waitFor();
  });

  await check('a lesson starts, pauses, resumes and can be left', async () => {
    await page.getByRole('button', { name: 'はじめる' }).click();
    await page.getByRole('button', { name: '一時停止' }).click();
    await page.getByText('一時停止中').waitFor();
    await page.getByRole('button', { name: '続ける' }).click();
    await page.getByText('一時停止中').waitFor({ state: 'hidden' });
    // Stopping is in the pause menu (there is no ✕ in the lesson bar since 2026-11-17).
    await page.getByRole('button', { name: '一時停止' }).click();
    await page.getByRole('button', { name: '今日はここまでにする' }).click();
    await page.getByRole('button', { name: '続きから' }).waitFor();
  });

  await check(
    'sound in WebKit',
    async () => {
      await tab(page, '設定');
      await page.getByText('動作チェック').click();
      await page.getByRole('button', { name: '鳴らす' }).first().click();
      await page.waitForTimeout(3000);
      // The automatic checks (the frame rate takes 3 seconds) must be done before the report is made.
      await page.waitForFunction(() => !/はかっています/.test(document.body.innerText), null, { timeout: 15_000 });
      await noSharing(page);
      await page.getByRole('button', { name: '結果を送る' }).click();
      const report = await page.locator('textarea.text-out').inputValue();
      const sound = report.split('\n').find((l) => l.startsWith('sound:')) ?? 'no sound line';
      if (!/ended [1-9]/.test(sound)) throw new Error(sound);
      return sound;
    },
    { info: true },
  );

  await check('the self-check report has its details', async () => {
    const report = await page.locator('textarea.text-out').inputValue();
    for (const part of ['動作チェック', '--- details ---', 'features:', 'stage:', 'storage:', 'offline:']) {
      if (!report.includes(part)) throw new Error(`missing "${part}"`);
    }
    return report.split('\n').find((l) => l.startsWith('stage:'));
  });

  await check('a backup comes back', async () => {
    await page.getByRole('button', { name: '閉じる' }).click();
    await page.getByText('記録のバックアップ').click();
    await noSharing(page);
    await page.getByRole('button', { name: 'バックアップを作って送る' }).click();
    const text = await page.locator('textarea[readonly]').inputValue();
    await page.getByPlaceholder('または、ここに貼り付けてください').fill(`保存してね\n${text}\nよろしく`);
    await page.getByRole('button', { name: '置き換える' }).click();
    await page.getByText('記録を戻しました！').waitFor();
  });

  await check('a note can be written, read back, changed and deleted', async () => {
    await tab(page, 'ノート');
    await page.getByRole('tab', { name: /メモ/ }).click();
    await page.getByRole('button', { name: '＋ メモを書く' }).click();
    await page.getByPlaceholder('LINEで送ってもらった英語を、ここに貼り付けます').fill('“Can I have some water?”');
    await page.getByText('キャナイ ヘァヴ サム').first().waitFor();
    await page.getByPlaceholder('意味、使う場面、聞いてみたいことなど').fill('お水がほしいとき');
    await page.getByRole('button', { name: '英語を聞く' }).click();
    await page.getByRole('button', { name: '保存する' }).click();
    await page.getByText('キャナイ ヘァヴ サム').first().waitFor();
    await page.getByText('Can I have some water?', { exact: true }).click();
    await page.getByPlaceholder('意味、使う場面、聞いてみたいことなど').fill('お水がほしいときに言う');
    await page.getByRole('button', { name: '閉じる' }).click();
    await page.getByText('お水がほしいときに言う').waitFor();
    await page.getByText('Can I have some water?', { exact: true }).click();
    // The bin deletes at once; 元に戻す brings it back, and deleting again removes it for good.
    await page.getByRole('button', { name: 'このメモを削除' }).click();
    await page.getByText('Can I have some water?', { exact: true }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '元に戻す' }).click();
    await page.getByText('Can I have some water?', { exact: true }).click();
    await page.getByRole('button', { name: 'このメモを削除' }).click();
    await page.getByText('Can I have some water?', { exact: true }).waitFor({ state: 'detached' });
    // Deleted in what is saved too (until 2026-11-17 the closing editor wrote the note back, so it returned later).
    await page.waitForTimeout(300);
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('eigo-friends/progress/v1')).notes.length);
    if (kept !== 0) throw new Error(`the deleted note is still saved (${kept} notes)`);
    return'English tidied and read in katakana, kept on close, deleted after one confirmation';
  });

  await check('works offline once ready, note readings too', async () => {
    await tab(page, '今日');
    await page.getByText('✓ ネットなしでも使えます').waitFor({ timeout: 30_000 });
    await context.setOffline(true);
    await page.reload();
    await booted(page);
    await page.getByText('今日のレッスン').waitFor();
    // The pronunciation engine is a file of its own, loaded only when a note needs it: offline, from the phone.
    await tab(page, 'ノート');
    await page.getByRole('tab', { name: /メモ/ }).click();
    await page.getByRole('button', { name: '＋ メモを書く' }).click();
    await page.getByPlaceholder('LINEで送ってもらった英語を、ここに貼り付けます').fill('Where are you going?');
    await page.getByText('ウェアラー ユー').first().waitFor();
    await page.getByRole('button', { name: '閉じる' }).click();
    await tab(page, '今日');
    await context.setOffline(false);
  });

  await check('once today’s lesson is done, もっと覚える teaches the next new phrases', async () => {
    // After the offline check, which looks for a line shown only before her first lesson. As at the end of today's
    // lesson: today's stamp, and no lesson left part-way (src/learn/schedule.ts dayNumber).
    await page.evaluate(() => {
      const key = 'eigo-friends/progress/v1';
      const p = JSON.parse(localStorage.getItem(key));
      const shifted = new Date(Date.now() - 4 * 3600 * 1000);
      p.days.push(Math.round(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()) / 86400000));
      p.session = null;
      localStorage.setItem(key, JSON.stringify(p));
    });
    await page.reload();
    await booted(page);
    await page.getByText('次の新しいフレーズ').waitFor();
    await page.getByRole('button', { name: 'もっと覚える' }).click();
    await page.getByRole('button', { name: '一時停止' }).click();
    await page.getByRole('button', { name: '今日はここまでにする' }).click();
    // Left part-way, the round waits on the Today screen like today's lesson.
    await page.getByRole('button', { name: '続きから' }).waitFor();
  });

  await check('sideways, it asks to hold the phone upright', async () => {
    const size = page.viewportSize();
    await page.setViewportSize({ width: size.height, height: size.width });
    await page.getByText('iPhoneを縦にして使ってください').waitFor();
    await page.setViewportSize(size);
    await page.getByText('iPhoneを縦にして使ってください').waitFor({ state: 'hidden' });
  });

  await check('no errors along the way', async () => {
    const real = errors.filter((e) => !/Failed to load resource|NotAllowedError|wake lock/i.test(e));
    if (real.length) throw new Error(real.join(' | '));
  });

  await context.close();
}

/**
 * The home-screen app's own sizes (2026-11-17). Safari's page (the device profiles above) and the full screen are the
 * wrong sizes for it: the app starts under the status bar, and the home bar is a safe area at the bottom. Checks made
 * at the full screen's height had passed while Today's stamps and the tour's buttons were cut off on the phone.
 */
const HOME_SCREEN = [
  { name: 'iPhone 13', device: 'iPhone 13', width: 390, height: 797, homeBar: 34 },
  { name: 'iPhone SE', device: 'iPhone SE (3rd gen)', width: 375, height: 647, homeBar: 0 },
].filter((p) => devices[p.device]);

/** The app as opened from the home screen, at that size, with `progress` saved (none: a first start). */
async function openInstalled(browser, phone, progress = null) {
  const { context, page, errors } = await open(browser, phone.device, { viewport: { width: phone.width, height: phone.height } });
  await context.addInitScript(
    ([key, saved, homeBar]) => {
      Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
      if (saved && !sessionStorage.getItem('smoke-seeded')) {
        localStorage.setItem(key, saved);
        sessionStorage.setItem('smoke-seeded', '1');
      }
      // WebKit here has no home bar: give the app the safe area an iPhone would.
      addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = `:root { --safe-bottom: ${homeBar}px !important; }`;
        document.head.append(style);
      });
    },
    ['eigo-friends/progress/v1', progress && JSON.stringify(progress), phone.homeBar],
  );
  await page.goto(BASE);
  await booted(page);
  return { context, page, errors };
}

/** Today's cards and its button show whole: no card runs under the bottom of the scrolling area. */
async function todayFits(page) {
  // The friends' scene changes height in 0.35 s, once the cards have been measured.
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const box = document.querySelector('.panel .scroll');
    const last = document.querySelector('.panel .content')?.lastElementChild;
    const button = [...document.querySelectorAll('.panel .actions .btn')].at(-1);
    const tabs = document.querySelector('nav.tabs');
    return {
      cut: box && last ? Math.round(last.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom) : null,
      below: button && tabs ? Math.round(button.getBoundingClientRect().bottom - tabs.getBoundingClientRect().top) : null,
      scene: Math.round(document.querySelector('.stage').getBoundingClientRect().height),
    };
  });
  if (r.cut === null || r.cut > 1) throw new Error(`the last card is cut off by ${r.cut}px`);
  if (r.below === null || r.below > 0) throw new Error(`the button is ${r.below}px under the menu bar`);
  return `friends' scene ${r.scene}px`;
}

async function homeScreenChecks(browser, phone) {
  console.log(`\n${phone.name}, opened from the home screen (${phone.width}x${phone.height})`);

  await check('the tour: each page shows whole, with its buttons', async () => {
    const { context, page } = await openInstalled(browser, phone);
    const notes = [];
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(700); // buttons ignore taps for a moment after they appear
      const r = await page.evaluate(() => {
        const body = document.querySelector('.tour .body');
        const go = document.querySelector('.tour .nav .btn.primary');
        return {
          cut: body ? body.scrollHeight - body.clientHeight : null,
          below: go ? Math.round(go.getBoundingClientRect().bottom - innerHeight) : null,
        };
      });
      if (r.cut === null || r.cut > 1) throw new Error(`page ${i + 1}: its card is cut off by ${r.cut}px`);
      if (r.below === null || r.below > 0) throw new Error(`page ${i + 1}: its button is ${r.below}px below the screen`);
      if (i < 2) await page.getByRole('button', { name: '次へ' }).click();
    }
    await page.getByRole('button', { name: 'はじめよう！' }).click();
    // The first Today, with the line about working offline (or getting ready to) under the cards.
    await page.getByText(/ネットなしで/).waitFor({ timeout: 30_000 });
    notes.push(`first day: ${await todayFits(page)}`);
    await context.close();
    return notes.join('; ');
  });

  for (const [label, progress] of [
    ['a month in: reviews, new phrases, practice and a conversation', afterDays(30)],
    ['a month in, today’s lesson done: the next phrases and もっと覚える', afterDays(30, { doneToday: true })],
    ['a month in, done, a week after the last backup: the reminder', afterDays(30, { doneToday: true, backedUp: 8 })],
  ]) {
    await check(`Today shows whole, ${label}`, async () => {
      const { context, page, errors } = await openInstalled(browser, phone, progress);
      await page.getByText('今日のレッスン').first().waitFor();
      if (label.includes('reminder')) await page.getByRole('button', { name: '保存する' }).waitFor();
      const note = await todayFits(page);
      if (errors.length) throw new Error(errors.join(' | '));
      await context.close();
      return note;
    });
  }
}

async function startupPanel(browser) {
  console.log('\nstart-up panel');
  // A broken app script (as on an iPhone too old for it): the panel must say so, with a reload button.
  await check('shows a message when the app cannot start', async () => {
    const { context, page } = await open(browser, PHONES[0], { serviceWorkers: 'block' });
    await page.route(/assets\/index-.*\.js$/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/javascript', body: 'this is not javascript(' }),
    );
    await page.goto(BASE);
    await page.getByText('えいごフレンズを開けませんでした').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'もう一度読み込む' }).waitFor();
    await context.close();
  });
  await check('stays hidden when the app starts', async () => {
    const { context, page } = await open(browser, PHONES[0], { serviceWorkers: 'block' });
    await page.goto(BASE);
    await booted(page);
    await page.waitForTimeout(500);
    if (await page.locator('#boot').count()) throw new Error('the panel is still in the page');
    await context.close();
  });
}

const server = await preview({ root: ROOT, base: '/eigo-friends/', logLevel: 'warn', preview: { port: PORT, strictPort: true } });
const browser = await webkit.launch();
console.log(`WebKit ${browser.version()}, serving ${BASE}`);
try {
  for (const phone of PHONES) await phoneChecks(browser, phone);
  for (const phone of HOME_SCREEN) await homeScreenChecks(browser, phone);
  await startupPanel(browser);
} finally {
  await browser.close();
  await server.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} passed${failed.length ? `; failed: ${failed.map((r) => r.name).join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
