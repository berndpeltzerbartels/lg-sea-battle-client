import { test, expect } from '@playwright/test';

test('underwater hit line ignores surface targets and finds the deep submarine behind them', async ({ page }) => {
  await page.goto('/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const result = await page.evaluate(() => {
    const surface = { id: 'surface', vehicleType: 'torpedo-boat', y: 0, depthState: 'surface', position: { x: 0, z: 70 }, heading: 0 };
    const deep = { id: 'deep', vehicleType: 'submarine', y: -9.63, depthState: 'submerged', position: { x: 0, z: 140 }, heading: 0 };
    const inspect = window.seaBattleScenarioTest.radarTargetAtDepthForTest;
    return [inspect([surface], -9.03), inspect([surface, deep], -9.03), inspect([surface, deep], .05),
      inspect([{ ...deep, y: -15 }], -9.03)];
  });
  expect(result).toEqual([null, 'deep', 'surface', null]);
});
