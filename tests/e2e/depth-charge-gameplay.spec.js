import { test, expect } from '@playwright/test';

test('bridge lookout and flak share replicated releases, explosions, controls and role hints', async ({ browser }, testInfo) => {
  test.setTimeout(60000);
  const errors = [];
  const members = [
    { playerId: 'player-CAP-test', name: 'Captain', station: 'bridge', revision: 1 },
    { playerId: 'player-LOO-test', name: 'Lookout', station: 'lookout', revision: 2 },
    { playerId: 'player-FLA-test', name: 'Gunner', station: 'flak', revision: 3 }
  ];
  const ship = { id: 'boat', teamId: 'light', x: 0, z: 0, y: 0, heading: 0, speed: 0, turnVelocity: 0,
    rudderDegrees: 0, engineOrder: 2, state: 'active', controlledBy: members[0].playerId,
    vehicleType: 'torpedo-boat', torpedoesRemaining: 12, flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0, depthState: 'surface' };
  const state = { type: 'state', sessionId: 'depth-test', instanceId: 'depth-test', state: 'running', t: 0,
    ships: [ship], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [], flakProjectiles: [], weaponShots: [],
    flakHits: [], flakImpacts: [], ramHits: [], depthCharges: [], depthChargeControls: {}, killsByPlayer: {}, destroyedShipsByTeam: {} };
  const pages = [];
  let requests = 0;
  let warning = null;
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
      if (path.includes('/session/')) body = { playerId: member.playerId, initials: member.playerId.split('-')[1], teamId: 'light' };
      else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
      else if (path.endsWith('/submarine-warning') || path.endsWith('/aircraft-warning')) {
        const kind = path.endsWith('/aircraft-warning') ? 'aircraft' : 'submarine';
        expect(route.request().postDataJSON()).not.toHaveProperty('bearing');
        warning = { id: `warning-${kind}`, kind, sender: member.name, expiresAt: Date.now() + 10000 };
        body = { ...crew, submarineWarning: warning };
      } else if (path.endsWith('/depth-charges')) {
        requests++;
        if (requests === 1) state.depthCharges = [{ id: 'charge-0', shipId: 'boat', playerId: member.playerId, lane: 0, releasedAt: 0,
          explodesAt: 2.5, x: -.675, z: -13, heading: 0, radius: 24, readyAt: 4.8, exploded: false, targetShipIds: [] }];
        state.depthChargeControls = { boat: { active: true, queued: requests > 1, readyAt: 4.8 } };
        body = state;
      } else if (path.includes('/crew/')) body = crew;
      else if (path.endsWith('/state')) body = state;
      await route.fulfill({ json: body });
    });
    await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
    await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
    await expect.poll(async () => ({ errors, ready: await page.evaluate(() => !!window.seaBattleScenarioTest && !!window.testStream) }))
      .toEqual({ errors: [], ready: true });
    await page.locator('#renderCanvas').click();
    await expect(page.locator('#depthChargeButton')).toBeVisible();
    await expect(page.locator('#roleHotkeys')).toBeVisible();
    await expect(page.locator('#lookoutWarningButton')).toBeVisible();
    await expect(page.locator('#lookoutAircraftWarningButton')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${member.station}-controls.png`) });
  }
  const broadcast = async () => {
    for (let i = 0; i < pages.length; i++) await pages[i].evaluate(message =>
      window.testStream.onmessage({ data: JSON.stringify(message) }), { type: 'game-stream', state });
  };
  await expect(pages[1].locator('#lookoutHud button')).toHaveCount(6);
  await pages[1].keyboard.press('KeyU');
  await expect.poll(() => warning !== null).toBe(true);
  for (const [i, page] of pages.entries()) {
    await page.evaluate(message => window.testStream.onmessage({ data: JSON.stringify(message) }), {
      type: 'game-stream', state,
      crew: { id: 'crew', shipId: 'boat', controller: members[0].playerId, station: members[i].station,
        revision: members[i].revision, members, aimRequests: [], lookoutReset: 0, submarineWarning: warning }
    });
    await expect(page.locator('#crewSubmarineWarning')).toBeVisible();
    await expect(page.locator('#crewSubmarineWarning')).toContainText('U-Boot gesichtet');
    await expect(page.locator('.submarine-warning-arrow')).toHaveCount(0);
    await expect(page.locator('#crewSubmarineWarning')).not.toContainText('°');
  }
  await pages[1].screenshot({ path: testInfo.outputPath('lookout-warning.png') });
  await expect(pages[1].locator('#lookoutAircraftWarningButton')).toBeEnabled({ timeout: 7000 });
  await pages[0].keyboard.press('KeyL');
  await expect.poll(() => warning.kind).toBe('aircraft');
  for (const [i, page] of pages.entries()) {
    await page.evaluate(message => window.testStream.onmessage({ data: JSON.stringify(message) }), {
      type: 'game-stream', state,
      crew: { id: 'crew', shipId: 'boat', controller: members[0].playerId, station: members[i].station,
        revision: members[i].revision, members, aimRequests: [], lookoutReset: 0, submarineWarning: warning }
    });
    await expect(page.locator('#crewSubmarineWarning')).toContainText('Flugzeug greift an');
    await expect(page.locator('.submarine-warning-arrow')).toHaveCount(0);
  }
  await pages[1].screenshot({ path: testInfo.outputPath('lookout-aircraft-warning.png') });
  await pages[1].keyboard.press('z');
  for (const [width, height] of [[1280, 720], [844, 390]]) {
    await pages[1].setViewportSize({ width, height });
    const panel = await pages[1].locator('#lookoutHud').boundingBox();
    const lens = await pages[1].locator('.lookout-binocular-mask').boundingBox();
    expect(panel.y).toBeGreaterThanOrEqual(lens.y + lens.height);
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    await pages[1].screenshot({ path: testInfo.outputPath(`lookout-compact-${width}.png`) });
  }
  await pages[1].keyboard.press('z');
  await pages[1].setViewportSize({ width: 1600, height: 1000 });
  await pages[1].locator('#lookoutDepthChargeButton').click();
  await expect.poll(() => requests).toBe(1);
  await broadcast();
  for (const page of pages) {
    await expect(page.locator('#depthChargeButton')).toBeEnabled();
    await expect(page.locator('#depthChargeButton')).toContainText('Weitere Serie vormerken');
    expect(await page.evaluate(() => window.seaBattleScenarioTest.depthChargeEffects().activeRacks)).toBe(1);
  }
  await pages[2].keyboard.press('KeyW');
  await expect.poll(() => requests).toBe(2);
  await broadcast();
  for (const page of pages) {
    await expect(page.locator('#depthChargeButton')).toBeDisabled();
    await expect(page.locator('#depthChargeButton')).toContainText('Serie vorgemerkt');
    await page.keyboard.press('KeyW');
  }
  expect(requests).toBe(2);
  await expect(pages[1].locator('#lookoutDepthChargeButton')).toBeDisabled();
  await expect(pages[1].locator('#lookoutDepthChargeButton')).toContainText('Serie vorgemerkt');
  await pages[0].screenshot({ path: testInfo.outputPath('queued-salvo.png') });
  state.t = 2.5;
  state.depthCharges.push({ ...state.depthCharges[0], id: 'charge-1', lane: 2, releasedAt: 2.5, explodesAt: 5, x: -24, z: .3 });
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
  state.depthChargeControls.boat.queued = false;
  await broadcast();
  for (const page of pages) await expect(page.locator('#depthChargeButton')).toBeEnabled();
  expect(await pages[0].evaluate(() => window.seaBattleScenarioTest.torpedoWaterEffect())).toBe(true);
  await pages[1].keyboard.down('ArrowRight');
  await pages[1].waitForTimeout(500);
  await pages[1].keyboard.up('ArrowRight');
  expect(Math.abs(await pages[1].evaluate(() => window.seaBattleScenarioTest.stationState().lookoutYaw))).toBeGreaterThan(.01);
  await pages[1].keyboard.press('KeyA');
  await expect.poll(() => pages[1].evaluate(() => Math.abs(window.seaBattleScenarioTest.stationState().lookoutYaw))).toBeLessThan(.002);
  const occupiedCrew = { id: 'crew', shipId: 'boat', controller: members[0].playerId, station: 'bridge', revision: 1,
    members: [...members, { playerId: 'gunner2', station: 'cannon' }], aimRequests: [], lookoutReset: 0 };
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
