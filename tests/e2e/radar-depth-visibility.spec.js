import { test, expect } from '@playwright/test';

test('live submarine radar switches both ship and torpedo filters with depth', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const inspect = () => page.evaluate(() => window.seaBattleScenarioTest.radarDepthVisibilityForTest([
    { id: 'boat', vehicleType: 'torpedo-boat' },
    { id: 'plane', vehicleType: 'scout-plane' },
    { id: 'surface', vehicleType: 'submarine', depthState: 'surface' },
    { id: 'scope', vehicleType: 'submarine', depthState: 'periscope' },
    { id: 'deep', vehicleType: 'submarine', depthState: 'submerged' }
  ], [
    { x: 20, z: 20, y: .05, state: 'running' },
    { x: 30, z: 20, y: -9, state: 'running' },
    { x: 40, z: 20, y: -9, state: 'running' },
    { x: 3000, z: 20, y: -9, state: 'running' }
  ]));
  for (const depth of ['surface', 'submerged', 'periscope']) {
    await page.evaluate(d => window.seaBattleScenarioTest.setSubmarineDepthState(d), depth);
    await expect.poll(inspect, { timeout: 30000 }).toEqual(depth === 'submerged'
      ? { ships: ['boat', 'surface', 'scope', 'deep'], torpedoes: 3 }
      : { ships: ['boat', 'plane', 'surface'], torpedoes: 1 });
  }
});
