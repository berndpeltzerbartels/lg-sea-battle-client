import { test, expect } from '@playwright/test';

test('lookout elevation transfers to both weapons in every direction', async ({ page }) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const results = await page.evaluate(() => {
    const out = [];
    for (const weapon of ['cannon', 'flak']) for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      for (const pitch of [0, .1, .3]) out.push(window.seaBattleScenarioTest.lookoutAimDirectionForTest(weapon, yaw, pitch));
    }
    return out;
  });
  for (const r of results) expect(Math.abs(r.actual - r.requested), JSON.stringify(r)).toBeLessThan(.001);
});

test('taking a free gun preserves lookout aim after a previous alignment', async ({ page }) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const weapon of ['cannon', 'flak']) {
    await page.evaluate(w => window.seaBattleScenarioTest.transferLookoutAimForTest(w, .6, .2), weapon);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => window.seaBattleScenarioTest.stationState());
    expect(state[`${weapon}Yaw`]).toBeCloseTo(.6, 2);
    expect(state[`${weapon}Pitch`]).toBeCloseTo(.2, 2);
  }
});
