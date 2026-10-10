import { test, expect } from '@playwright/test';

test('reverse motion survives bridge/flak handover even when the event stream is stale', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const playerId = 'player-CAP-test';
  const ship = { id: 'boat', teamId: 'light', controlledBy: playerId, vehicleType: 'torpedo-boat',
    state: 'active', x: 0, y: 0, z: 0, heading: 0, speed: -2, engineOrder: 0,
    turnVelocity: 0, rudderDegrees: 0, torpedoesRemaining: 12,
    flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0, depthState: 'surface' };
  const state = { type: 'state', sessionId: 'handover', instanceId: 'handover', state: 'running', t: 0,
    ships: [ship], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [],
    flakProjectiles: [], weaponShots: [], flakHits: [], flakImpacts: [], ramHits: [],
    destroyedShipsByTeam: {}, killsByPlayer: {}, depthCharges: [], depthChargeControls: {} };
  const crew = { shipId: ship.id, controller: playerId, station: 'bridge', revision: 1,
    members: [{ playerId, name: 'CAP', station: 'bridge', revision: 1 }], aimRequests: [], lookoutReset: 0 };
  const requests = [];
  const handovers = [];
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class {
      constructor() { setTimeout(() => this.onopen?.(), 50); }
      close() {}
    };
  });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.includes('/session/')) body = { playerId, initials: 'CAP', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1,
      layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/crew/motion')) {
      requests.push('motion');
      const { motion } = route.request().postDataJSON();
      Object.assign(ship, motion);
      body = state;
    } else if (path.endsWith('/crew/station')) {
      requests.push('station');
      crew.station = route.request().postDataJSON().station;
      crew.revision++;
      crew.members[0].station = crew.station;
      ship.z -= 5;
      handovers.push(ship.z);
      body = { ...crew, ship };
    } else if (path.endsWith('/crew/aim')) body = state;
    else if (path.includes('/crew/')) body = { ...crew, ship };
    else if (path.endsWith('/state')) body = state;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest?.vehicleVisual('boat'));
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ speed: -2, engineOrder: 0 }));
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('flak'));
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().flak)).toBe(true);
  const flak = await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('boat'));
  expect(flak.z).toBeLessThanOrEqual(handovers[0] + .1);
  expect(flak.speed).toBeLessThan(0);
  expect(requests[requests.indexOf('station') - 1]).toBe('motion');
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('bridge'));
  await expect.poll(() => handovers.length).toBe(2);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.stationState().flak)).toBe(false);
  const bridge = await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('boat'));
  expect(bridge.z).toBeLessThanOrEqual(handovers[1] + .1);
  expect(bridge.speed).toBeLessThan(0);
  expect(errors).toEqual([]);
});
