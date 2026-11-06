import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const template = fs.readFileSync(new URL('../../../server/src/main/java/one/xis/seabattle/webapp/gameconfig/GameConfigParameterPage.html', import.meta.url), 'utf8');
const transferScript = fs.readFileSync(new URL('../../../server/src/main/resources/public/game-config-transfer.js', import.meta.url), 'utf8');

test('JSON downloads work on a dynamically inserted admin page and after navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // XIS loads public scripts in the root head, before inserting the actual page.
  await page.setContent(`<html><head><script>${transferScript}</script></head><body></body></html>`);
  const body = template.match(/<body>([\s\S]*?)<\/body>/)[1]
    .replaceAll('${profileDownload}', 'data:application/json;base64,')
    .replaceAll('${profileExportId}', '');
  const profile = { version: 1, name: 'Browsertest', parameters: { 'TORPEDO_BOAT_BOT.AIM_RESPONSE': '0.6' } };
  for (let navigation = 0; navigation < 2; navigation++) {
    await page.evaluate(({ body, profile }) => {
      document.body.innerHTML = body;
      document.querySelector('#settings-form').noValidate = true;
      let revision = 0;
      // Emulate the XIS action response, without a running app or changing stored settings.
      document.querySelector('#export-profile').addEventListener('click', event => {
        event.preventDefault();
        queueMicrotask(() => {
          const link = document.querySelector('#download-profile');
          link.href = 'data:application/json;base64,' + btoa(JSON.stringify(profile));
          link.dataset.exportId = String(++revision);
        });
      });
    }, { body, profile });
    for (let repeat = 0; repeat < 2; repeat++) {
      const pending = page.waitForEvent('download');
      await page.locator('#download-export').click();
      const download = await pending;
      expect(download.suggestedFilename()).toBe('spielprofil.json');
      expect(JSON.parse(fs.readFileSync(await download.path(), 'utf8'))).toEqual(profile);
    }
  }
  expect(errors).toEqual([]);
});
