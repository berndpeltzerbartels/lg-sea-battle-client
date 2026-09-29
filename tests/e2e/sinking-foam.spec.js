import { test, expect } from '@playwright/test';

test('sinking foam stays on water and is removed after fading', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewMode=orbit&viewDistance=32&viewHeight=1.6&viewYaw=65');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const count = await page.evaluate(() => window.seaBattleScenarioTest.sinkingFoamForTest(true).length);
  expect(count).toBe(12);
  await page.waitForTimeout(1200);
  const patches = await page.evaluate(() => window.seaBattleScenarioTest.sinkingFoamForTest());
  expect(patches).toHaveLength(12);
  expect(patches.every(p => p.enabled && p.y > 0 && p.y < .12 && p.visibility > .3)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('sinking-foam.png') });
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.sinkingFoamForTest().length), { timeout: 10000 }).toBe(0);
});
