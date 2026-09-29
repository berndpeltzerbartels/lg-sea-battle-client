import { test, expect } from '@playwright/test';

test('deep ship hit leaves brief surface foam, without duplicates or travelling traces', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewMode=orbit&viewDistance=55&viewHeight=28&viewYaw=155');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const impact = { id: 'foam-test', reason: 'ship-hit', x: -12, z: 8, y: -9, heading: 0, t: 1 };
  const read = impacts => page.evaluate(events => window.seaBattleScenarioTest.underwaterHitFoamForTest(events), impacts);
  expect(await read([])).toHaveLength(0);
  expect(await read([{ ...impact, id: 'expired', reason: 'expired' },
    { ...impact, id: 'wall', reason: 'land-hit' }])).toHaveLength(0);
  expect(await read([impact])).toHaveLength(6);
  await page.waitForTimeout(450);
  const patches = await read([impact]);
  expect(patches).toHaveLength(6);
  for (const patch of patches) {
    expect(patch.y).toBeGreaterThan(0);
    expect(patch.y).toBeLessThan(.1);
    expect(patch.visibility).toBeGreaterThan(.1);
    expect(patch.visibility).toBeLessThan(.46);
    expect(Math.hypot(patch.x - impact.x, patch.z - impact.z)).toBeLessThan(5);
  }
  await page.screenshot({ path: testInfo.outputPath('surface-foam.png') });
  await expect.poll(async () => (await read([])).length, { timeout: 6000 }).toBe(0);
  expect(await read([impact])).toHaveLength(0);
});
