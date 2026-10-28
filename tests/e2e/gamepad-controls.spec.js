import { test, expect } from '@playwright/test';

async function controller(page) {
  await page.addInitScript(() => {
    window.testPad = { id: 'DualSense Wireless Controller', index: 0, connected: true, mapping: 'standard',
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [window.testPad] });
  });
}
async function neutral(page) {
  await page.evaluate(() => { window.testPad.axes = [0, 0, 0, 0]; window.testPad.buttons.forEach(b => { b.pressed = false; b.value = 0; }); });
  await page.waitForTimeout(150);
}
async function button(page, index) {
  await page.evaluate(index => { window.testPad.buttons[index].pressed = true; window.testPad.buttons[index].value = 1; }, index);
}

test('DualSense stick aims diagonally, R2 fires, and releasing or disconnecting stops controls', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await controller(page);
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('#renderCanvas').click({ position: { x: 300, y: 350 } });
  await expect(page.locator('body')).toHaveAttribute('data-gamepad', 'connected');
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('cannon'));
  await neutral(page);
  const before = await page.evaluate(() => window.seaBattleScenarioTest.cannonAimDisplay());
  await page.evaluate(() => { window.testPad.axes = [-.8, -.8, 0, 0]; });
  await expect.poll(() => page.evaluate(before => {
    const a = window.seaBattleScenarioTest.cannonAimDisplay();
    return Math.atan2(Math.sin(a.targetYaw - before.targetYaw), Math.cos(a.targetYaw - before.targetYaw)) < -.02
      && a.targetPitch > before.targetPitch + .02;
  }, before)).toBe(true);
  await neutral(page);
  const stopped = await page.evaluate(() => window.seaBattleScenarioTest.cannonAimDisplay());
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.seaBattleScenarioTest.cannonAimDisplay());
  expect(after.targetYaw).toBeCloseTo(stopped.targetYaw, 4);
  expect(after.targetPitch).toBeCloseTo(stopped.targetPitch, 4);
  await button(page, 6);
  await expect(page.locator('body')).not.toHaveAttribute('data-cannon-sight', 'I');
  await neutral(page);
  const shots = await page.evaluate(() => window.seaBattleScenarioTest.cannonEffects().blasts);
  await button(page, 7);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.cannonEffects().blasts)).toBe(shots + 1);
  await neutral(page);
  await button(page, 5); // R1: cannon -> torpedo precision
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().torpedo)).toBe(true);
  await neutral(page);
  await button(page, 4);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().cannon)).toBe(true);
  await neutral(page);
  await page.evaluate(() => { window.testPad.axes = [1, 1, 0, 0]; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { window.testPad.connected = false; });
  await expect(page.locator('body')).toHaveAttribute('data-gamepad', 'disconnected');
  const disconnected = await page.evaluate(() => window.seaBattleScenarioTest.cannonAimDisplay());
  await page.waitForTimeout(300);
  expect((await page.evaluate(() => window.seaBattleScenarioTest.cannonAimDisplay())).targetYaw).toBeCloseTo(disconnected.targetYaw, 4);
  expect(errors).toEqual([]);
});

test('controller station changes skip occupied crew posts and never request them from the server', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await controller(page);
  const playerId = 'player-CAP-test';
  const ship = { id: 'boat', teamId: 'light', controlledBy: playerId, vehicleType: 'torpedo-boat',
    state: 'active', x: 0, y: 0, z: 0, heading: 0, speed: 0, engineOrder: 2, turnVelocity: 0,
    rudderDegrees: 0, torpedoesRemaining: 12, flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0, depthState: 'surface' };
  const state = { type: 'state', sessionId: 'gamepad-crew', instanceId: 'gamepad-crew', state: 'running', t: 0,
    ships: [ship], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [], flakProjectiles: [], weaponShots: [],
    flakHits: [], flakImpacts: [], ramHits: [], destroyedShipsByTeam: {}, killsByPlayer: {}, depthCharges: [], depthChargeControls: {} };
  const crew = { shipId: ship.id, controller: playerId, station: 'lookout', revision: 1,
    members: [{ playerId, name: 'CAP', station: 'lookout', revision: 1 },
      { playerId: 'other', name: 'GUN', station: 'flak' }, { playerId: 'other2', name: 'CAN', station: 'cannon' }],
    aimRequests: [], lookoutReset: 0 };
  const requests = [];
  await page.addInitScript(() => { localStorage.setItem('accountId', 'test');
    window.EventSource = class { constructor() { setTimeout(() => this.onopen?.(), 50); } close() {} }; });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname; let body = {};
    if (path.includes('/session/')) body = { playerId, initials: 'CAP', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1,
      layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/crew/station')) {
      const station = route.request().postDataJSON().station;
      requests.push(station); crew.station = station; crew.members[0].station = station; crew.revision++;
      body = { ...crew, ship };
    } else if (path.endsWith('/crew/motion') || path.endsWith('/crew/aim')) body = state;
    else if (path.includes('/crew/')) body = { ...crew, ship };
    else if (path.endsWith('/state') || path.endsWith('/player-state')) body = state;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest?.stationState().lookout);
  await page.locator('#renderCanvas').click({ position: { x: 700, y: 300 } });
  await neutral(page);
  await button(page, 5);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().torpedo)).toBe(true);
  expect(requests).toEqual(['bridge']);
  expect(errors).toEqual([]);
});

test('submarine diving and both periscope positions work without a second stick', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await controller(page);
  await page.goto('/app?vehicle=submarine&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('#renderCanvas').click({ position: { x: 300, y: 350 } });
  await neutral(page);
  await button(page, 13);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().depthState)).toBe('periscope');
  await neutral(page);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset),
    { timeout: 10000 }).toBeCloseTo(-1.6, 2);
  await button(page, 5);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().submarinePeriscopeMode)).toBe('observation-scope');
  await neutral(page);
  await button(page, 4);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().submarinePeriscopeMode)).toBe('forward-scope');
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().torpedo)).toBe(true);
  await neutral(page);
  await button(page, 13);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().depthState)).toBe('submerged');
  await neutral(page);
  await button(page, 12);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().depthState)).toBe('periscope');
  expect(errors).toEqual([]);
});
