import { test, expect } from '@playwright/test';

test('torpedo launch plays once and moving propulsion loops release after the torpedo leaves', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.torpedoAudioForTest());
  await expect.poll(async () => (await sound())?.engine.loaded).toBe(true);
  await expect.poll(async () => (await sound())?.launch.loaded).toBe(true);
  const result = await page.evaluate(() => {
    const t = window.seaBattleScenarioTest;
    const listener = { x: 0, y: 0, z: 0, heading: 0, vx: 0, vz: 0 };
    const torpedoes = [{ id: 'passing', x: 10, y: 0, z: 5, vx: -30, vz: 0 }];
    const launch = { id: 'launch', x: 0, z: 0, own: true, vehicleType: 'torpedo-boat' };
    t.torpedoAudioForTest(listener, torpedoes, launch);
    return t.torpedoAudioForTest(listener, torpedoes, launch);
  });
  expect(result.engine.voices).toBe(1);
  expect(result.launch.voices).toBe(1);
  await expect.poll(async () => (await sound()).engine.voices).toBe(0);
  await expect.poll(async () => (await sound()).launch.voices, { timeout: 5000 }).toBe(0);
  expect(errors).toEqual([]);
});
