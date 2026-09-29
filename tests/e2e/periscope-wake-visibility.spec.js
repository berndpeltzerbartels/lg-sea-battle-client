import { test, expect } from '@playwright/test';

test('stronger periscope foam preserves quiet speeds and underwater concealment', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const [depthState, speed, engineOrder, visible] of [
    ['periscope', .9, 3, false], ['periscope', 2.93, 4, false],
    ['periscope', 6.18, 5, true], ['periscope', 9, 7, true],
    ['submerged', 6, 7, false]
  ]) {
    await page.evaluate(state => window.seaBattleScenarioTest.createRemoteSubmarineForTest(state), {
      id: 'wake-check', depthState, speed, engineOrder, heading: 0
    });
    await page.waitForTimeout(700);
    const wake = await page.evaluate(() => window.seaBattleScenarioTest.enemyPeriscopeWakeSnapshot('wake-check'));
    expect(wake.wakeEnabled).toBe(visible);
    if (visible) expect(wake.enabledParts).toBeGreaterThan(6);
    else expect(wake.strength).toBe(0);
    if (speed === 9) await page.screenshot({ path: testInfo.outputPath('periscope-foam.png') });
  }
});
