import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('error screen preserves live crew DOM and the original failure', async ({ page }) => {
  const html = (await readFile(new URL('../../index.html', import.meta.url), 'utf8'))
    .replace(/<script type="module"[^>]*><\/script>/g, '');
  const reports = [];
  await page.route('**/game/client-error', route => {
    reports.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  });
  await page.route('**/game/version', route => route.fulfill({ json: { version: 'test' } }));
  await page.route('**/error-fixture', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('/error-fixture');
  await page.evaluate(() => {
    window.originalPanel = document.getElementById('lookoutAimRequest');
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Original TV failure', error: new Error('Original TV failure')
    }));
    // This is the same write made by an incoming crew SSE update.
    document.getElementById('lookoutAimRequest').hidden = true;
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Later failure', error: new Error('Later failure')
    }));
  });
  expect(await page.evaluate(() => window.originalPanel === document.getElementById('lookoutAimRequest')
    && window.originalPanel.isConnected)).toBe(true);
  await expect(page.locator('#startupErrorDetails')).toContainText('Original TV failure');
  await expect(page.locator('#startupErrorDetails')).not.toContainText('Later failure');
  await expect(page.locator('.startup-error')).toHaveCount(1);
  await expect.poll(() => reports.length).toBe(2);
  expect(reports[0].message).toBe('Original TV failure');
  expect(reports[0].stack).toContain('Scripts:');
  expect(reports[0].userAgent).toBeTruthy();
});


test('module initialization reports the actual exception to the server', async ({ page }) => {
  const bootstrap = await readFile(new URL('../../src/bootstrap.js', import.meta.url), 'utf8');
  const html = (await readFile(new URL('../../index.html', import.meta.url), 'utf8'));
  const reports = [];
  await page.route('**/game/version', route => route.fulfill({ json: { version: 'test' } }));
  await page.route('**/game/client-error', route => {
    reports.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  });
  await page.route('**/src/bootstrap.js', route => route.fulfill({ contentType: 'text/javascript', body: bootstrap }));
  await page.route('**/src/main.js', route => route.fulfill({ contentType: 'text/javascript',
    body: "throw new TypeError('TV initialization failure');" }));
  await page.route('**/error-fixture', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('/error-fixture');
  await expect(page.locator('#startupErrorDetails')).toContainText('TV initialization failure');
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0].stack).toContain('TypeError: TV initialization failure');
});
