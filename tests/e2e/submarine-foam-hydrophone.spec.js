import { test, expect } from '@playwright/test';

test('surfaced submarine deposits stern foam and loses its surface wake when diving', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/app?vehicle=submarine&sandbox=side-view&scenarioTest=1&viewDistance=32&viewYaw=160&viewHeight=3.2');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const foam = await page.evaluate(() => window.seaBattleScenarioTest.previewSternFoamForTest(9, 3));
  expect(foam.active).toBeGreaterThan(0);
  expect(foam.capacity).toBe(144);
  await page.screenshot({ path: '/tmp/seabattle-submarine-stern-foam.png' });
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset),
    { timeout: 10000 }).toBeCloseTo(-1.6, 2);
  expect(await page.evaluate(() => window.seaBattleScenarioTest.sternFoamForTest().active)).toBe(0);
  expect(errors).toEqual([]);
});

test('underwater listener hears actual nearby ship tracks and can mute them', async ({ page }) => {
  test.setTimeout(60000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const own = { id: 'own', teamId: 'light', controlledBy: 'player-CAP-test', vehicleType: 'submarine',
    state: 'active', x: 0, y: -.78, z: 0, heading: 0, speed: 0, turnVelocity: 0, rudderDegrees: 0,
    engineOrder: 2, depthState: 'surface', torpedoesRemaining: 12, flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0 };
  const state = { type: 'state', sessionId: 'hydrophone-test', instanceId: 'hydrophone-test', state: 'running', t: 0,
    ships: [own, { ...own, id: 'passing', controlledBy: 'bot', teamId: 'dark', vehicleType: 'torpedo-boat', x: 10, y: 0, speed: 10 }],
    torpedoes: [], torpedoImpacts: [], bombs: [], bombImpacts: [], flakProjectiles: [], weaponShots: [], flakHits: [],
    flakImpacts: [], ramHits: [], depthCharges: [], depthChargeControls: {}, killsByPlayer: {}, destroyedShipsByTeam: {} };
  await page.addInitScript(() => {
    localStorage.setItem('accountId', 'test'); localStorage.setItem('engineSoundMuted', 'false');
    window.EventSource = class { constructor() { window.testStream = this; setTimeout(() => this.onopen?.(), 50); } close() {} };
  });
  await page.route('**/game/**', async route => {
    const url = new URL(route.request().url()).pathname; let body = {};
    if (url.includes('/session/')) body = { playerId: own.controlledBy, initials: 'CAP', teamId: 'light' };
    else if (url.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (url.includes('/crew/')) body = null;
    else if (url.endsWith('/state') || url.endsWith('/player-state')) body = state;
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=submarine&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest && window.testStream);
  await page.locator('#renderCanvas').click({ position: { x: 500, y: 300 } });
  const audio = () => page.evaluate(() => window.seaBattleScenarioTest.underwaterShipAudioForTest());
  await expect.poll(async () => (await audio())?.propellers.loaded).toBe(true);
  expect((await audio()).propellers.voices).toBe(0);
  await page.evaluate(state => window.testStream.onmessage({ data: JSON.stringify({ type: 'game-stream', state }) }), state);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset),
    { timeout: 10000 }).toBeCloseTo(-1.6, 2);
  expect((await audio()).propellers.voices).toBe(0);
  expect((await audio()).sonar.voices).toBe(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await expect.poll(async () => (await audio()).propellers.voices, { timeout: 20000 }).toBe(1);
  await expect.poll(async () => (await audio()).sonar.voices, { timeout: 10000 }).toBe(1);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await expect.poll(async () => (await audio()).propellers.voices).toBe(0);
  await page.locator('#engineSoundToggle').click();
  await expect.poll(async () => (await audio()).propellers.voices).toBe(0);
  expect(errors).toEqual([]);
});
