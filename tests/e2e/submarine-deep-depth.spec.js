import { test, expect } from '@playwright/test';

test('deep dive settles at double depth while periscope depth stays unchanged', async ({ page }) => {
  test.setTimeout(45000);
  await page.goto('/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  const snapshot = () => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot());
  await expect.poll(async () => (await snapshot()).boatY, { timeout: 30000 }).toBeCloseTo(-19.26, 1);
  expect((await snapshot()).radarDepthMode).toBe('submerged');
  const deep = await snapshot();
  expect(deep.seaFloorY).toBe(-32);
  expect(deep.boatY - deep.seaFloorY).toBeGreaterThan(10);
  expect(deep.cameraY).toBeGreaterThan(deep.seaFloorY);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  expect((await snapshot()).targetDepthOffset).toBe(-1.6);
});
