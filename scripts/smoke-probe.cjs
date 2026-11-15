const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream', '.gz': 'application/gzip', '.png': 'image/png' };
const server = http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const body = await fs.readFile(file);
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
  }
  catch { response.writeHead(404).end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/science/?site=07&find=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('#loading')?.classList.contains('done'), undefined, { timeout: 30000 });
      await page.locator('#loading').waitFor({ state: 'detached', timeout: 5000 });
      if (width === 1440) {
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(root, 'docs/screenshots/mission-window.png') });
      }
      await page.locator('#probe-open').click();
      assert.equal(await page.locator('#probe-tool').isVisible(), true);
      if (width === 1440) {
        await page.locator('#probe-example').click();
        await page.waitForFunction(() => document.querySelector('#probe-tool')?.hidden, undefined, { timeout: 30000 });
        assert.match(await page.locator('#find-window').textContent(), /193\/193/);
        assert.match(await page.locator('#mission-sensitivity').textContent(), /193 of 193/);
        assert.equal(await page.locator('#mission-sensitivity').isVisible(), true, 'Moved-point RMS sensitivity is hidden');
        await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(root, 'docs/screenshots/probe-point.png') });
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-hours').click()]);
        const csv = await fs.readFile(await download.path(), 'utf8');
        assert.match(csv.split('\n')[0], /horizon_range_m,dem_sample_m,ephemeris_method/);
        assert.equal(csv.split('\n')[1].split(',')[5], '6000');
        assert.match(csv.split('\n')[1].split(',')[7], /rotated bundled/);
        await page.locator('#show-why').click();
        assert.equal(await page.locator('#mission-profile').isVisible(), true);
        await page.locator('#probe-open').click();
      }
      const coordinate = await page.evaluate(async () => {
        const { polarInverse } = await import('./coordinate_probe.mjs');
        const site = await (await fetch('./luna_view_site07_data.json')).json();
        return polarInverse(site.site.x_m + 400, site.site.y_m - 650);
      });
      await page.locator('#probe-lat').fill(String(-coordinate.lat));
      await page.locator('#probe-lon').fill(String(coordinate.lon));
      await page.locator('#probe-analyze').click();
      await page.waitForFunction(() => document.querySelector('#probe-status')?.textContent.includes('READY'), undefined, { timeout: 30000 });
      assert.match(page.url(), /lat=.*lon=/);
      assert.equal(await page.locator('#probe-delta').isVisible(), true);
      assert.equal(await page.locator('.probe-outcome').isVisible(), true);
      assert.match(await page.locator('#mission-limit').textContent(), /6 km terrain horizon/);
      assert.equal(await page.locator('#mission-chart svg').isVisible(), true);
      if (width === 390) {
        await page.locator('#show-why').click();
        assert.equal(await page.locator('#mobile-explanation').isVisible(), true);
        await page.locator('#back-to-result').click();
      }
      assert.deepEqual(errors, []);
      if (width === 1440) {
        await page.locator('#probe-open').click();
        await page.locator('#probe-pick').click();
        assert.equal(await page.locator('#probe-pick').getAttribute('aria-pressed'), 'true');
        await page.mouse.click(740, 400);
        await page.waitForFunction(() => document.querySelector('#probe-tool')?.hidden, undefined, { timeout: 30000 });
        assert.equal(await page.locator('.probe-outcome').isVisible(), true);
        await page.locator('#probe-open').click();
        await page.locator('#probe-lat').fill('88');
        await page.locator('#probe-lon').fill('0');
        await page.locator('#probe-analyze').click();
        assert.match(await page.locator('#probe-status').textContent(), /Outside/);
        assert.equal(await page.locator('#probe-delta').isVisible(), true);
        await page.locator('#probe-reset').click();
        assert.equal(await page.locator('#probe-delta').isVisible(), false);
        assert.doesNotMatch(page.url(), /lat=/);
        const otherSite = await page.evaluate(async () => (await (await fetch('./luna_view_site04_data.json')).json()).site);
        await page.locator('#probe-lat').fill(String(-otherSite.lat_deg));
        await page.locator('#probe-lon').fill(String(otherSite.lon_e_deg));
        await page.locator('#probe-analyze').click();
        await page.waitForURL(/site=04.*lat=/, { timeout: 30000 });
        await page.waitForFunction(() => document.querySelector('.probe-outcome') && !document.querySelector('.probe-outcome').hidden, undefined, { timeout: 30000 });
        assert.match(await page.locator('.probe-outcome').textContent(), /MOVED 0 M/);
      }
      console.log(`Probe ${width}px: coordinate, result, coverage and layout OK`);
      await page.close();
    }
    const shadowCheck = await browser.newPage({ viewport: { width: 1551, height: 740 }, reducedMotion: 'reduce' });
    await shadowCheck.goto(`${base}/science/?site=04&find=1`, { waitUntil: 'domcontentloaded' });
    await shadowCheck.waitForFunction(() => !document.querySelector('#loading') || document.querySelector('#loading').classList.contains('done'), undefined, { timeout: 30000 });
    await shadowCheck.locator('#loading').waitFor({ state: 'detached', timeout: 5000 });
    await shadowCheck.screenshot({ path: path.join(root, 'docs/screenshots/site04-surface.png') });
    await shadowCheck.locator('#slope').click();
    await shadowCheck.waitForTimeout(1300);
    await shadowCheck.screenshot({ path: path.join(os.tmpdir(), 'luna-site04-slope-current.png') });
    assert.equal(await shadowCheck.locator('#overhead').getAttribute('aria-pressed'), 'true');
    await shadowCheck.locator('#probe-open').click();
    await shadowCheck.locator('#probe-example').click();
    await shadowCheck.waitForFunction(() => document.querySelector('#probe-tool')?.hidden, undefined, { timeout: 30000 });
    assert.match(await shadowCheck.locator('#find-window').textContent(), /45\/193/);
    const lowHeightLayout = await shadowCheck.evaluate(() => ({
      outcomeBottom: document.querySelector('.probe-outcome').getBoundingClientRect().bottom,
      dockTop: document.querySelector('.bottom').getBoundingClientRect().top,
    }));
    assert.ok(lowHeightLayout.outcomeBottom < lowHeightLayout.dockTop - 8, `740px: point result overlaps the time dock (${JSON.stringify(lowHeightLayout)})`);
    await shadowCheck.close();
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
