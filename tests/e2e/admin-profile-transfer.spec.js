import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const template = fs.readFileSync(new URL('../../../server/src/main/java/one/xis/seabattle/webapp/gameconfig/GameConfigParameterPage.html', import.meta.url), 'utf8');
const controls = fs.readFileSync(new URL('../../../server/src/main/resources/public/game-config-form.js', import.meta.url), 'utf8');
const fixtures = new URL('../../../server/build/test-fixtures/', import.meta.url);

test('native XIS redirect downloads the HTTP attachment and preserves the edited form', async ({ page }) => {
  const fixture = JSON.parse(fs.readFileSync(new URL('game-config-download.json', fixtures), 'utf8'));
  const xis = fs.readFileSync(new URL('xis-download-runtime.js', fixtures), 'utf8');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://capture.invalid/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === fixture.url) return route.fulfill({ status: 200, headers: fixture.headers, body: fixture.body });
    if (url.pathname === '/xis.js') return route.fulfill({ contentType: 'text/javascript', body: xis });
    if (url.pathname === '/game-config-form.js') return route.fulfill({ contentType: 'text/javascript', body: controls });
    return route.fulfill({ contentType: 'text/html', body: '<html><head><script src="/xis.js"></script><script src="/game-config-form.js"></script></head><body></body></html>' });
  });
  await page.goto('http://capture.invalid/admin/game-config.html');
  const body = template.match(/<body>([\s\S]*?)<\/body>/)[1];
  await page.evaluate(({ body, url }) => {
    document.body.innerHTML = body;
    document.querySelector('#settings-form').noValidate = true;
    document.querySelector('#aimResponse').value = '0.7';
    document.querySelector('#export-profile').addEventListener('click', event => {
      event.preventDefault();
      // Use the exact installed XIS browser-navigation implementation for its redirect result.
      new Client('download-test').forward(url);
    });
  }, { body, url: fixture.url });
  for (let repeat = 0; repeat < 2; repeat++) {
    const pending = page.waitForEvent('download');
    await page.locator('#download-export').click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(fixture.fileName);
    expect(fs.readFileSync(await download.path(), 'utf8')).toBe(fixture.body);
    await expect(page.locator('#aimResponse')).toHaveValue('0.7');
    expect(new URL(page.url()).pathname).toBe('/admin/game-config.html');
  }
  expect(errors).toEqual([]);
});
