const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const body = await fs.readFile(file);
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch { response.writeHead(404).end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
    for (const width of [390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
      await page.goto(`${base}/science/?site=07&find=1${width === 1440 ? '&day=2026-11-19' : ''}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.querySelector('#loading') || document.querySelector('#loading').classList.contains('done'), undefined, { timeout: 30000 });
      await page.locator('#mission-result').waitFor({ state: 'visible' });
      const layout = await page.evaluate(() => {
        const panel = document.querySelector('.science').getBoundingClientRect();
        const dock = document.querySelector('.bottom').getBoundingClientRect();
        return { pageWidth: document.documentElement.scrollWidth, panelBottom: panel.bottom, dockTop: dock.top };
      });
      assert.ok(layout.pageWidth <= width, `${width}px: horizontal overflow`);
      assert.ok(layout.panelBottom <= layout.dockTop + 1, `${width}px: panel overlaps controls`);
      assert.equal(await page.locator('#find-window').getAttribute('aria-pressed'), 'true');
      if (width === 390) {
        await page.locator('[data-antenna="2"]').click();
        assert.equal(await page.locator('[data-antenna="2"]').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('#antenna-impact').textContent(), /133\/193/);
        assert.match(page.url(), /antenna=2/);
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-hours').click()]);
        const csv = await fs.readFile(await download.path(), 'utf8');
        assert.match(csv.split('\n')[0], /antenna_height_m/);
        assert.equal(csv.split('\n')[1].split(',')[4], '2');
        assert.match(await page.locator('#earth-horizon').textContent(), /2 m antenna/);
        await page.locator('#show-why').click();
        assert.match(await page.locator('#mobile-evidence-label').textContent(), /2 M ANTENNA/);
        await page.locator('#back-to-result').click();
        await page.locator('[data-antenna="0"]').click();
        assert.match(await page.locator('#antenna-impact').textContent(), /95\/193/);
      }
      if (width === 1440) {
        const pointerTargets = await page.evaluate(() => ['site-choice', 'day-choice'].map(id => {
          const rect = document.getElementById(id).getBoundingClientRect();
          return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.id;
        }));
        assert.deepEqual(pointerTargets, ['site-choice', 'day-choice'], 'The selectors do not receive pointer input');
        const cta = await page.evaluate(() => ({ buttonBottom: document.querySelector('#show-why').getBoundingClientRect().bottom, panelBottom: document.querySelector('.science').getBoundingClientRect().bottom }));
        assert.ok(cta.buttonBottom <= cta.panelBottom, '3D explanation action is hidden below the panel fold');
        await page.locator('#day-choice').click();
        await page.keyboard.press('Escape');
        await page.locator('.science .panel-title').hover();
        await page.mouse.wheel(0, 520);
        await page.waitForFunction(() => document.querySelector('.science').scrollTop > 0);
        const beforeHour = await page.locator('#time').inputValue();
        await page.locator('#mission-chart svg').click({ position: { x: 150, y: 20 } });
        assert.notEqual(await page.locator('#time').inputValue(), beforeHour, 'Clicking the visibility chart did not change UTC hour');
      }
      for (const id of ['topographic', 'slope', 'photometric']) {
        await page.locator(`#${id}`).click({ timeout: 12000 });
        assert.equal(await page.locator(`#${id}`).getAttribute('aria-pressed'), 'true', `${width}px: ${id} did not activate`);
      }
      await page.locator('#show-why').click({ timeout: 12000 });
      assert.equal(await page.locator('#show-why').getAttribute('aria-pressed'), 'true');
      if (width === 390) {
        assert.equal(await page.locator('#mobile-explanation').isVisible(), true);
        assert.equal(await page.locator('.content').isVisible(), false);
        await page.locator('#back-to-result').click();
        assert.equal(await page.locator('#mobile-explanation').isVisible(), false);
      }
      assert.equal(await page.locator('#mission-profile').isVisible(), true);
      if (width === 390) {
        await page.locator('#day-choice').selectOption('2026-11-14');
        assert.match(await page.locator('#mission-detail').textContent(), /\/24/);
        await page.locator('#site-choice').selectOption('04');
        await page.waitForURL(/site=04/);
        await page.waitForFunction(() => !document.querySelector('#loading') || document.querySelector('#loading').classList.contains('done'), undefined, { timeout: 30000 });
        assert.equal(await page.locator('#site-choice').inputValue(), '04');
        assert.equal(await page.locator('#day-choice').inputValue(), '2026-11-14');
        await page.locator('#language').click();
        await page.waitForURL(/lang=ru/);
        assert.equal(await page.locator('html').getAttribute('lang'), 'ru');
        await page.locator('#back-home').click();
        await page.waitForURL(`${base}/#terrain`);
      }
      console.log(`Science ${width}px: controls, state, layout OK`);
      await page.close();
    }
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 850 }, reducedMotion: width === 390 ? 'reduce' : 'no-preference' });
      await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: landing overflows horizontally`);
      await page.locator('#atlas-stage').scrollIntoViewIfNeeded();
      await page.locator('#atlas-stage.is-ready').waitFor({ timeout: 30000 });
      if (width === 390) {
        const boundary = await page.locator('.atlas-note span').boundingBox();
        const source = await page.locator('.atlas-note a').boundingBox();
        assert.ok(source.y >= boundary.y + boundary.height + 4, 'mobile source link overlaps atlas note');
      }
      await page.locator('[data-atlas-landmark="tycho"]').click();
      assert.equal(await page.locator('#atlas-stage').getAttribute('data-mode'), 'landmark');
      assert.match(await page.locator('#atlas-source').getAttribute('href'), /planetarynames\.wr\.usgs\.gov\/Feature\/6163/);
      assert.equal(await page.locator('#atlas-enter').isVisible(), false);
      await page.locator('#atlas-focus').click();
      await page.waitForTimeout(1000);
      assert.equal(await page.locator('#atlas-stage').getAttribute('data-mode'), 'pole');
      assert.equal(await page.locator('#atlas-pins').isVisible(), true);
      assert.equal(await page.locator('#atlas-pin-lines').isVisible(), true);
      await page.locator('#atlas-hour').fill('24');
      assert.match(await page.locator('#atlas-time-label').textContent(), /15 NOV 2026/);
      assert.match(await page.locator('#atlas-enter').getAttribute('href'), /day=2026-11-15/);
      await page.locator('[data-lang="ru"]').click();
      assert.match(await page.locator('#atlas-enter').getAttribute('href'), /lang=ru/);
      await page.locator('[data-atlas-pin="01"]').click();
      if (width === 1440) await page.locator('#atlas-transition.visible').waitFor({ timeout: 1200 });
      await page.waitForURL(/\/science\//, { timeout: 15000 });
      const destination = new URL(page.url());
      assert.equal(destination.searchParams.get('site'), '01');
      assert.equal(destination.searchParams.get('day'), '2026-11-15');
      assert.equal(destination.searchParams.get('lang'), 'ru');
      assert.equal(await page.locator('body.from-atlas').count(), 1);
      await page.waitForFunction(() => !document.querySelector('#loading') || document.querySelector('#loading').classList.contains('done'), undefined, { timeout: 30000 });
      assert.equal(await page.locator('#site-choice').inputValue(), '01');
      await page.locator('#back-home').click();
      await page.waitForURL(`${base}/#terrain`);
      await page.locator('#atlas-stage.is-ready').waitFor({ timeout: 30000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: atlas overflows horizontally`);
      console.log(`Landing ${width}px: landmarks, one-click transition, return, time, language, layout OK`);
      await page.close();
    }
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
