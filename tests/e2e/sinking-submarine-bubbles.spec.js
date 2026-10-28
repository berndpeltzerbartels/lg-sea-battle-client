import { test, expect } from '@playwright/test';

test('a submarine observer sees a persistent bubble plume after another submarine is destroyed', async ({ page }) => {
  test.setTimeout(45000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const own = { id: 'own', teamId: 'light', controlledBy: 'player-CAP-test', vehicleType: 'submarine',
    state: 'active', x: 0, y: -.78, z: 0, heading: 0, speed: 0, turnVelocity: 0,
    rudderDegrees: 0, engineOrder: 2, torpedoesRemaining: 12, depthState: 'surface',
    flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0, lifeId: 0 };
  const enemy = { ...own, id: 'enemy', controlledBy: 'bot', teamId: 'dark',
    x: 0, y: -19.26, z: 35, heading: Math.PI, depthState: 'submerged' };
  const state = { type: 'state', sessionId: 'bubble-test', instanceId: 'bubble-test', state: 'running', t: 0,
    ships: [own, enemy], wrecks: [], torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [],
    flakProjectiles: [], weaponShots: [], flakHits: [], flakImpacts: [], ramHits: [], depthCharges: [],
    depthChargeControls: {}, killsByPlayer: {}, destroyedShipsByTeam: {} };
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test');
    window.EventSource = class { constructor() { window.testStream = this; setTimeout(() => this.onopen?.(), 50); } close() {} };
  });
  await page.route('**/game/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.includes('/session/')) body = { playerId: own.controlledBy, initials: 'CAP', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1,
      layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.includes('/crew/')) body = null;
    else if (path.endsWith('/state') || path.endsWith('/player-state')) body = state;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=submarine&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest && window.testStream);
  const send = () => page.evaluate(state => window.testStream.onmessage({
    data: JSON.stringify({ type: 'game-stream', state }) }), state);
  await send();
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset),
    { timeout: 20000 }).toBeCloseTo(-6.16, 1);
  state.t = 1;
  state.wrecks.push({ id: 'submarine-death', sunkAt: 1, ship: enemy });
  state.ships[1] = { ...enemy, lifeId: 1, x: 1000, y: -.78, depthState: 'surface' };
  await send();
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.sinkingBubblesForTest().active)).toBeGreaterThan(5);
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => window.seaBattleScenarioTest.sinkingBubblesForTest().active)).toBeGreaterThan(8);
  await page.screenshot({ path: '/tmp/seabattle-sinking-submarine-bubbles.png' });
  expect(errors).toEqual([]);
});
