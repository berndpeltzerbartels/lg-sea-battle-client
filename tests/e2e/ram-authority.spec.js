import { test, expect } from '@playwright/test';

test('server ram stops the bridge once and does not repeat when snapshots repeat', async ({ page }) => {
  const ship = { id: 'boat', controlledBy: 'player-CAP-test', teamId: 'light', vehicleType: 'torpedo-boat',
    x: 0, y: 0, z: 0, heading: 0, speed: 8, engineOrder: 7, rudderDegrees: 0, turnVelocity: 0,
    state: 'active', depthState: 'surface', torpedoesRemaining: 12, flakYaw: Math.PI, flakPitch: 0, cannonYaw: 0, cannonPitch: 0 };
  const state = { instanceId: 'ram-test', sessionId: 'ram-test', state: 'running', t: 0, ships: [ship],
    ramHits: [], torpedoes: [], torpedoImpacts: [], flakHits: [], flakProjectiles: [], flakImpacts: [],
    bombs: [], bombImpacts: [], depthCharges: [], weaponShots: [], killsByPlayer: {}, destroyedShipsByTeam: {} };
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
    if (path.includes('/session/')) body = { playerId: 'player-CAP-test', initials: 'CAP', teamId: 'light' };
    else if (path.endsWith('/world')) body = { landmasses: [], instrumentMap: { version: 1, layers: [0, 50, 150].map(height => ({ height, contours: [] })) } };
    else if (path.endsWith('/state')) body = state;
    else if (path.includes('/crew/')) body = { id: 'crew', shipId: 'boat', controller: 'player-CAP-test', station: 'bridge', revision: 1,
      members: [{ playerId: 'player-CAP-test', name: 'Captain', station: 'bridge', revision: 1 }], aimRequests: [], lookoutReset: 0 };
    await route.fulfill({ json: body });
  });
  await page.route('**/crew-inbox.html', route => route.fulfill({ body: '' }));
  await page.goto('/app?vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.testStream?.onmessage && window.seaBattleScenarioTest);
  const send = () => page.evaluate(state => window.testStream.onmessage({ data: JSON.stringify({ type: 'game-stream', state }) }), state);
  await send();
  state.ramHits = [{ id: 'ram-1', shipId: 'boat', targetShipId: 'victim', teamId: 'light', x: 0, z: 10, t: 1 }];
  state.t = 1;
  ship.speed = 0;
  ship.engineOrder = 2;
  await send();
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().engineOrder)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().speed)).toBe(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ speed: 4, engineOrder: 5 }));
  await send();
  expect(await page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().engineOrder)).toBe(5);
});
