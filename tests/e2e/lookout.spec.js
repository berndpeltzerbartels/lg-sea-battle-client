import { test, expect } from '@playwright/test';

test('lookout C/F requests occupied guns but aims and takes free guns through crew endpoints', async ({ page }) => {
  const playerId = 'player-LOOK-test';
  const crew = { id: 'crew', shipId: 'boat', controller: playerId, station: 'lookout', revision: 1,
    members: [{ playerId, name: 'Look', station: 'lookout' }], aimRequests: [], lookoutReset: 0 };
  const ship = { id: 'boat', teamId: 'light', x: 0, z: 0, y: 0, heading: 0, speed: 0, state: 'active',
    controlledBy: playerId, vehicleType: 'torpedo-boat', engineOrder: 2, rudderDegrees: 0, turnVelocity: 0,
    flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0, depthState: 'surface' };
  const state = { type: 'state', sessionId: 'lookout-test', instanceId: 'lookout-test', state: 'running', t: 0,
    ships: [ship], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [], flakProjectiles: [], weaponShots: [],
    flakHits: [], flakImpacts: [], ramHits: [], depthCharges: [], depthChargeControls: {}, killsByPlayer: {}, destroyedShipsByTeam: {} };
  let occupied = true;
  const actions = [];
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class { close() {} };
  });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.includes('/session/')) body = { playerId, initials: 'LOOK', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/lookout-aim')) {
      const command = route.request().postDataJSON();
      actions.push(`aim:${command.weapon}`);
      ship[`${command.weapon}Yaw`] = command.yaw;
      ship[`${command.weapon}Pitch`] = command.pitch;
      body = { requested: occupied, snapshot: state };
    } else if (path.endsWith('/station')) {
      crew.station = route.request().postDataJSON().station;
      crew.members[0].station = crew.station;
      crew.revision++;
      actions.push(`station:${crew.station}`);
      body = crew;
    } else if (path.includes('/crew/')) body = crew;
    else if (path.endsWith('/state')) body = state;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
  await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
  for (const [key, weapon] of [['KeyC', 'cannon'], ['KeyF', 'flak']]) {
    occupied = true;
    actions.length = 0;
    await page.keyboard.press(key);
    await expect(page.locator('#lookoutFeedback')).toHaveText('Zustimmung angefragt');
    expect(actions).toEqual([`aim:${weapon}`]);
    await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
    occupied = false;
    await page.keyboard.press(key);
    await expect(page.locator('body')).toHaveAttribute('data-crew-station', weapon);
    expect(actions).toEqual([`aim:${weapon}`, `aim:${weapon}`, `station:${weapon}`]);
    await page.keyboard.press('KeyO');
    await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
  }
});

test('lookout is accessible from every station and C/F aim and take over free weapons', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const station of ['bridge', 'cannon', 'flak', 'torpedo']) {
    await page.evaluate(s => window.seaBattleScenarioTest.setStation(s), station);
    await page.keyboard.press('KeyO');
    await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
    await expect(page.locator('#lookoutViewButton')).toHaveClass(/is-active/);
  }
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  const radarBefore = await page.locator('#radarCanvas').screenshot();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  expect((await page.locator('#radarCanvas').screenshot()).equals(radarBefore)).toBe(false);
  await expect(page.locator('.lookout-reticle')).toBeVisible();
  // German QWERTZ produces KeyY for the letter Z, including when a HUD button has focus.
  await page.locator('#lookoutZoomButton').focus();
  await page.locator('#lookoutZoomButton').dispatchEvent('keydown', { key: 'z', code: 'KeyY', bubbles: true });
  await expect(page.locator('body')).toHaveAttribute('data-lookout-binoculars', 'active');
  await page.locator('#renderCanvas').focus();
  await page.keyboard.press('KeyZ');
  await expect(page.locator('body')).toHaveAttribute('data-lookout-binoculars', 'inactive');
  await page.keyboard.press('KeyZ');
  await expect(page.locator('.lookout-binocular-mask')).toBeVisible();
  await page.keyboard.press('KeyC');
  await expect(page.locator('body')).toHaveAttribute('data-cannon-view', 'active');
  await page.keyboard.press('KeyO');
  await page.keyboard.press('KeyF');
  await expect(page.locator('body')).toHaveAttribute('data-flak-view', 'active');
  await page.keyboard.press('KeyO');
  await page.keyboard.press('KeyZ');
  await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
  await page.screenshot({ path: testInfo.outputPath('lookout-desktop.png') });
  const frame = await page.locator('#renderCanvas').screenshot();
  const pixels = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = 32; copy.height = 32;
    const ctx = copy.getContext('2d');
    ctx.drawImage(image, 0, 0, 32, 32);
    return new Set(Array.from(ctx.getImageData(0, 0, 32, 32).data)).size;
  }, frame.toString('base64'));
  expect(pixels).toBeGreaterThan(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('lookout-mobile.png') });
  for (const id of ['lookoutZoomButton', 'lookoutCannonButton', 'lookoutFlakButton']) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.keyboard.press('KeyB');
  await expect(page.locator('#lookoutHud')).toBeHidden();
  await expect(page.locator('.lookout-binocular-mask')).toBeHidden();
  await expect(page.locator('.lookout-reticle')).toBeHidden();
  expect(errors).toEqual([]);
});
