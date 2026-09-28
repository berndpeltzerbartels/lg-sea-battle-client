import { test, expect } from '@playwright/test';

test('bridge and lookout share replicated releases, explosions, controls and role hints', async ({ browser }, testInfo) => {
  test.setTimeout(60000);
  const errors = [];
  const members = [
    { playerId: 'player-CAP-test', name: 'Captain', station: 'bridge', revision: 1 },
    { playerId: 'player-LOOK-test', name: 'Lookout', station: 'lookout', revision: 2 }
  ];
  const ship = { id: 'boat', teamId: 'light', x: 0, z: 0, y: 0, heading: 0, speed: 0, turnVelocity: 0,
    rudderDegrees: 0, engineOrder: 2, state: 'active', controlledBy: members[0].playerId,
    vehicleType: 'torpedo-boat', torpedoesRemaining: 12, flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0, depthState: 'surface' };
  const state = { type: 'state', sessionId: 'depth-test', instanceId: 'depth-test', state: 'running', t: 0,
    ships: [ship], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [], flakProjectiles: [], weaponShots: [],
    flakHits: [], flakImpacts: [], ramHits: [], depthCharges: [], killsByPlayer: {}, destroyedShipsByTeam: {} };
  const pages = [];
  let requests = 0;
  for (const member of members) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    pages.push(page);
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('accountId', 'test');
      window.EventSource = class {
        constructor() { window.testStream = this; setTimeout(() => this.onopen?.(), 50); }
        close() {}
      };
    });
    const crew = { id: 'crew', shipId: 'boat', controller: members[0].playerId, station: member.station,
      revision: member.revision, members, aimRequests: [], lookoutReset: 0 };
    await page.route('**/game/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path.includes('/session/')) body = { playerId: member.playerId, initials: member.station === 'bridge' ? 'CAP' : 'LOOK', teamId: 'light' };
      else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
      else if (path.endsWith('/depth-charges')) {
        requests++;
        state.depthCharges = [{ id: 'charge-0', shipId: 'boat', playerId: member.playerId, lane: 0, releasedAt: 0,
          explodesAt: 2.5, x: -.675, z: -13, heading: 0, radius: 24, readyAt: 13, exploded: false, targetShipIds: [] }];
        body = state;
      } else if (path.includes('/crew/')) body = crew;
      else if (path.endsWith('/state')) body = state;
      await route.fulfill({ json: body });
    });
    await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
    await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
    await page.waitForFunction(() => window.seaBattleScenarioTest && window.testStream);
    await page.locator('#renderCanvas').click();
    await expect(page.locator('#depthChargeButton')).toBeVisible();
    await expect(page.locator('#roleHotkeys')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${member.station}-controls.png`) });
  }
  const broadcast = async () => {
    for (let i = 0; i < pages.length; i++) await pages[i].evaluate(message =>
      window.testStream.onmessage({ data: JSON.stringify(message) }), { type: 'game-stream', state });
  };
  await pages[1].keyboard.press('KeyW');
  await expect.poll(() => requests).toBe(1);
  await broadcast();
  for (const page of pages) {
    await expect(page.locator('#depthChargeButton')).toBeDisabled();
    expect(await page.evaluate(() => window.seaBattleScenarioTest.depthChargeEffects().activeRacks)).toBe(1);
  }
  await pages[0].keyboard.press('KeyW');
  expect(requests).toBe(1);
  state.t = 2.5;
  state.depthCharges.push({ ...state.depthCharges[0], id: 'charge-1', lane: 1, releasedAt: 2.5, explodesAt: 5, x: .675 });
  await broadcast();
  state.t = 2.5;
  state.depthCharges[0].exploded = true;
  await broadcast();
  for (const page of pages) {
    const first = await page.evaluate(() => window.seaBattleScenarioTest.depthChargeEffects());
    expect(first.effects).toBeGreaterThan(20);
    expect(first.effects).toBeLessThan(60);
    expect(first.audio).toBe('running');
  }
  await broadcast();
  await pages[0].screenshot({ path: testInfo.outputPath('bridge-water-explosion.png') });
  state.t = 5;
  state.depthCharges[1].exploded = true;
  await broadcast();
  await broadcast();
  for (const page of pages) expect(await page.evaluate(() => window.seaBattleScenarioTest.depthChargeEffects().hits)).toBe(2);
  expect(await pages[0].evaluate(() => window.seaBattleScenarioTest.torpedoWaterEffect())).toBe(true);
  await pages[1].keyboard.down('ArrowRight');
  await pages[1].waitForTimeout(500);
  await pages[1].keyboard.up('ArrowRight');
  expect(Math.abs(await pages[1].evaluate(() => window.seaBattleScenarioTest.stationState().lookoutYaw))).toBeGreaterThan(.01);
  await pages[1].keyboard.press('KeyA');
  await expect.poll(() => pages[1].evaluate(() => Math.abs(window.seaBattleScenarioTest.stationState().lookoutYaw))).toBeLessThan(.002);
  const occupiedCrew = { id: 'crew', shipId: 'boat', controller: members[0].playerId, station: 'bridge', revision: 1,
    members: [...members, { playerId: 'gunner', station: 'flak' }, { playerId: 'gunner2', station: 'cannon' }], aimRequests: [], lookoutReset: 0 };
  await pages[0].evaluate(message => window.testStream.onmessage({ data: JSON.stringify(message) }),
    { type: 'game-stream', state, crew: occupiedCrew });
  await expect(pages[0].locator('#alignWeaponsButton')).toBeDisabled();
  await expect(pages[0].locator('#alignAirDefenseButton')).toBeDisabled();
  for (const page of pages) {
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#roleHotkeys')).toBeHidden();
    const box = await page.locator('#depthChargeButton').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(844);
  }
  expect(errors).toEqual([]);
  for (const page of pages) await page.context().close();
});
