import { test, expect } from '@playwright/test';

test('position confirmation recovers and clears its warning while preserving failure reports', async ({ page }) => {
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
  let failMotion = false;
  const reports = [];
  const requests = [];
  const handovers = [];
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class {
      constructor() { window.testGameStream = this; setTimeout(() => this.onopen?.(), 50); }
      close() {}
    };
  });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.endsWith('/client-event')) reports.push(route.request().postDataJSON());
    if (path.includes('/session/')) body = { playerId, initials: 'CAP', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1,
      layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/crew/motion')) {
      if (failMotion) return route.fulfill({ status: 503, body: 'temporary failure' });
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
  failMotion = true;
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.motionSyncForTest().blocked)).toBe(true);
  await expect.poll(() => reports.some(r => r.event === 'motion-sync-failed'), { timeout: 8000 }).toBe(true);
  expect(await page.evaluate(() => window.seaBattleScenarioTest.motionSyncForTest().warning)).toContain('Fehler-ID');
  ship.x += 50;
  await page.evaluate(state => window.testGameStream.onmessage({ data: JSON.stringify({ type: 'game-stream', state }) }), state);
  expect(await page.evaluate(() => window.seaBattleScenarioTest.vehicleVisual('boat').x)).toBeCloseTo(ship.x, 2);
  expect(await page.evaluate(() => window.seaBattleScenarioTest.motionSyncForTest().blocked)).toBe(true);
  failMotion = false;
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.motionSyncForTest())).toEqual({ blocked: false, warning: null });
  await expect.poll(() => reports.some(r => r.event === 'motion-sync-recovered')).toBe(true);
  expect(await page.evaluate(() => document.body.dataset.playerStateSyncError)).toBeUndefined();
  expect(errors).toEqual([]);
});
