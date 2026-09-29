import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('bot depth charge victim sees the large destruction message once through game stream', async ({ page }, testInfo) => {
  const fixture = JSON.parse(readFileSync(new URL('../../../server/build/test-fixtures/depth-charge-victim.json', import.meta.url)));
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class {
      constructor() { window.testStream = this; setTimeout(() => this.onopen?.(), 50); }
      close() {}
    };
  });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.includes('/session/')) body = { playerId: 'player-DIV-test', initials: 'DIV', teamId: 'dark' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/state')) body = fixture.before;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=submarine');
  await page.waitForFunction(() => window.testStream?.onmessage);
  const send = () => page.evaluate(state => window.testStream.onmessage({
    data: JSON.stringify({ type: 'game-stream', state })
  }), fixture.after);
  await send();
  const alert = page.locator('#flakHitAlert');
  await expect(alert).toBeVisible();
  await expect(alert).toHaveClass(/is-visible/);
  await expect(alert).toContainText('Abgeschossen durch Wasserbomben von');
  await page.screenshot({ path: testInfo.outputPath('waterbomb-victim.png') });
  await expect(alert).not.toHaveClass(/is-visible/, { timeout: 6000 });
  await expect(alert).toHaveCSS('opacity', '0');
  await send();
  await expect(alert).not.toHaveClass(/is-visible/);
});
