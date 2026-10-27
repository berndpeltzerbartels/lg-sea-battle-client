import { test, expect } from '@playwright/test';

test('stronger periscope foam preserves quiet speeds and underwater concealment', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const [depthState, speed, engineOrder, visible] of [
    ['periscope', .9, 3, false], ['periscope', 2.93, 4, true],
    ['periscope', 6.18, 5, true], ['periscope', 9, 7, true],
    ['submerged', 6, 7, false]
  ]) {
    await page.evaluate(state => window.seaBattleScenarioTest.createRemoteSubmarineForTest(state), {
      id: 'wake-check', depthState, speed, engineOrder, heading: 0
    });
    await page.waitForTimeout(2400);
    const wake = await page.evaluate(() => window.seaBattleScenarioTest.enemyPeriscopeWakeSnapshot('wake-check'));
    expect(wake.wakeEnabled).toBe(visible);
    if (visible) {
      expect(wake.depositedFoam.active).toBeGreaterThan(6);
      expect(wake.depositedFoam.capacity).toBe(164);
    }
    else expect(wake.strength).toBe(0);
    if (speed === 9) {
      await page.screenshot({ path: testInfo.outputPath('periscope-foam.png') });
      if (process.env.SEA_BATTLE_PERISCOPE_PREVIEW) await page.screenshot({ path: process.env.SEA_BATTLE_PERISCOPE_PREVIEW });
      expect(wake.mastTops[0]).toBeCloseTo(.905, 1);
    }
  }
});

test('both fleet colours use the same deposited foam and extended mast', async ({ page }) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewMode=ship&viewHeight=.72');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const [teamId, x] of [['light', -2.5], ['dark', 2.5]]) {
    await page.evaluate(state => window.seaBattleScenarioTest.createRemoteSubmarineForTest(state), {
      id: `contrast-${teamId}`, teamId, x, z: 35, depthState: 'periscope', speed: 9, engineOrder: 7, heading: Math.PI
    });
  }
  await page.waitForTimeout(2400);
  for (const team of ['light', 'dark']) {
    const wake = await page.evaluate(id => window.seaBattleScenarioTest.enemyPeriscopeWakeSnapshot(id), `contrast-${team}`);
    expect(wake.depositedFoam.active).toBeGreaterThan(6);
    expect(wake.mastTops[0]).toBeCloseTo(.905, 1);
  }
  await page.evaluate(() => {
    window.seaBattleScenarioTest.setStation('lookout');
    document.querySelector('.side-view-camera-panel').style.display = 'none';
  });
  await page.waitForTimeout(100);
  if (process.env.SEA_BATTLE_PERISCOPE_PREVIEW) await page.screenshot({path: process.env.SEA_BATTLE_PERISCOPE_PREVIEW});
});

test('own periscope extends at actual depth and its optical view remains above water', async ({ page }) => {
  await page.goto('/app?vehicle=submarine&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset),
    {timeout:10000}).toBeCloseTo(-1.6, 2);
  const state=await page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot());
  expect(state.periscopeLift).toBeCloseTo(.05028, 3);
  expect(state.cameraY).toBeGreaterThan(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('surface'));
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().periscopeLift),
    {timeout:10000}).toBe(0);
});
