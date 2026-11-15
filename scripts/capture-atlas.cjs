const { chromium } = require('playwright-core');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      page.on('console', message => { if (message.type() === 'error') console.error(name, message.text()); });
      page.on('pageerror', error => console.error(name, 'PAGE ERROR', error));
      await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
      await page.locator('#atlas-stage').scrollIntoViewIfNeeded();
      await page.locator('#atlas-stage.is-ready').waitFor({ timeout: 30000 });
      if (name === 'desktop') await page.waitForFunction(() => document.querySelector('#atlas-stage')?.dataset.quality === '4k', undefined, { timeout: 30000 });
      await page.addStyleTag({ content: '.site-header { display: none !important }' });
      await page.waitForTimeout(500);
      await page.locator('#terrain').screenshot({ path: path.resolve(__dirname, `../docs/screenshots/lunar-atlas-${name}.png`) });
      if (name === 'desktop') {
        await page.locator('[data-atlas-landmark="tycho"]').click();
        await page.waitForTimeout(900);
        await page.locator('#terrain').screenshot({ path: path.resolve(__dirname, '../docs/screenshots/lunar-atlas-tycho.png') });
      }
      await page.locator('#atlas-focus').click();
      await page.locator('#atlas-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await page.locator('#atlas-stage').screenshot({ path: path.resolve(__dirname, `../docs/screenshots/lunar-atlas-pole-${name}.png`) });
      console.log(name, await page.locator('#atlas-stage').getAttribute('class'));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
