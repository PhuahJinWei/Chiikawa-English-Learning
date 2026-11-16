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
    await page.getByRole('button', { name: 'このメモを削除' }).click();
    await page.getByRole('button', { name: '削除する' }).click();
    await page.getByText('Can I have some water?', { exact: true }).waitFor({ state: 'detached' });
    return 'English tidied and read in katakana, kept on close, deleted after one confirmation';
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
  await startupPanel(browser);
} finally {
  await browser.close();
  await server.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} passed${failed.length ? `; failed: ${failed.map((r) => r.name).join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
