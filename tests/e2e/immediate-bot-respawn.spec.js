import { test, expect } from '@playwright/test';

test('active replacement and sinking wreck render independently even when the death snapshot was missed', async ({ page }) => {
  test.setTimeout(60000);
  const errors = []; page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR', error.message); });
  const own = { id: 'own', teamId: 'light', controlledBy: 'player-CAP-test', vehicleType: 'torpedo-boat',
    state: 'active', x: 0, y: 0, z: 0, heading: 0, speed: 0, turnVelocity: 0,
    rudderDegrees: 0, engineOrder: 2, torpedoesRemaining: 12, depthState: 'surface',
    flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0 };
  const enemy = { ...own, id: 'enemy', lifeId: 0, controlledBy: 'bot', teamId: 'dark', x: 20, z: 60 };
  const state = { type: 'state', sessionId: 'wreck-test', instanceId: 'wreck-test', state: 'running', t: 1,
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
  await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest && window.testStream);
  const send = () => page.evaluate(state => window.testStream.onmessage({
    data: JSON.stringify({ type: 'game-stream', state }) }), state);
  const remotes = () => page.evaluate(() => window.seaBattleScenarioTest.remoteShipsForTest());
  const wrecks = () => page.evaluate(() => window.seaBattleScenarioTest.wrecksForTest());
  await send();
  expect((await remotes()).find(ship => ship.id === 'enemy').state).toBe('active');

  for (let i = 0; i < 4; i++) {
    const dead = { ...state.ships[1] };
    if (i === 2) Object.assign(dead, { vehicleType: 'submarine', y: -19.26, depthState: 'submerged' });
    if (i === 3) Object.assign(dead, { vehicleType: 'scout-plane', y: 170, depthState: 'surface' });
    state.t = 2 + i;
    state.wrecks.push({ id: `death-${i}`, sunkAt: state.t, ship: dead });
    state.ships[1] = { ...dead, lifeId: dead.lifeId + 1, x: dead.x + 200, y: i === 3 ? 170 : 0, depthState: 'surface' };
    if (i === 1) state.flakHits = [{ id: 'cannon-fatal', targetShipId: 'enemy',
      x: dead.x, z: dead.z, y: .8, targetY: dead.y, t: state.t }];
    if (i === 2) state.flakHits = [{ id: 'flak-sub-fatal', targetShipId: 'enemy',
      x: dead.x, z: dead.z, y: -.1, targetY: dead.y, t: state.t }];
    await send();
    await send(); // repeated snapshots must not duplicate or restart the death animation
    const active = (await remotes()).filter(ship => ship.id === 'enemy');
    expect(active).toHaveLength(1);
    expect(active[0].state).toBe('active');
    expect(active[0].lifeId).toBe(i + 1);
    expect(active[0].visible).toBe(true);
    expect(active[0].position.x).toBeCloseTo(state.ships[1].x, 0);
    expect(await wrecks()).toHaveLength(i + 1);
    expect((await wrecks()).find(wreck => wreck.id === `death-${i}`).state)
      .toBe(i === 1 ? 'ship-cannon-hit' : i === 3 ? 'air-hit' : 'sinking');
    if (i === 2) expect((await wrecks()).find(wreck => wreck.id === 'death-2').position.y).toBeLessThan(-19);
  }
  await page.screenshot({ path: '/tmp/seabattle-independent-wrecks.png' });
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
  await expect.poll(async () => (await wrecks()).length, { timeout: 35000 }).toBe(0);
  await send();
  expect(await wrecks()).toHaveLength(0);
  expect((await remotes()).filter(ship => ship.id === 'enemy' && ship.state === 'active')).toHaveLength(1);
  expect(errors).toEqual([]);
});
