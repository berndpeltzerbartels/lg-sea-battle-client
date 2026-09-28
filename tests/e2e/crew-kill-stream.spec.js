import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Generate these snapshots with the server's CrewKillBrowserFixtureTest first.
for (const weapon of ['cannon', 'flak']) for (const station of ['bridge', weapon]) {
test(`${station} receives real ${weapon} kill through the normal game stream`, async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const fixture = JSON.parse(readFileSync(new URL(`../../../server/build/test-fixtures/crew-kill-${weapon}.json`, import.meta.url)));
  const playerId = 'player-GUN-test';
  const state = fixture.before;
  const ship = state.ships.find(s => s.id === 'boat');
  const crew = { shipId: ship.id, controller: ship.controlledBy, station, revision: 1,
    members: [{ playerId, name: 'GUN', station, revision: 1 }], aimRequests: [], lookoutReset: 0 };
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
    if (path.includes('/session/')) body = { playerId, initials: 'GUN', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.includes('/crew/')) body = crew;
    else if (path.endsWith('/state')) body = state;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=torpedo-boat');
  await page.waitForFunction(() => window.testStream?.onmessage);
  await page.evaluate(message => window.testStream.onmessage({ data: JSON.stringify(message) }), { type: 'game-stream', state: fixture.after, crew });
  await expect(page.locator('#crewKillSuccess')).toBeVisible();
  await expect(page.locator('#crewKillSuccess')).toContainText('ANNA');
  await page.screenshot({ path: testInfo.outputPath('kill-success.png') });
  expect(errors).toEqual([]);
});
}
