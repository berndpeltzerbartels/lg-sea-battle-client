import { test, expect } from '@playwright/test';

test('heading hold requires manual aim after each station entry', async ({ page }) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const weapon of ['cannon', 'flak']) {
    await page.evaluate(w => window.seaBattleScenarioTest.setStation(w), weapon);
    expect(await page.evaluate(w => window.seaBattleScenarioTest.weaponHeadingHoldState()[w], weapon)).toBe(false);
    for (const key of ['ArrowRight', 'ArrowUp']) {
      await page.keyboard.down(key);
      await expect.poll(() => page.evaluate(w => window.seaBattleScenarioTest.weaponHeadingHoldState()[w], weapon)).toBe(true);
      await page.keyboard.up(key);
      await page.evaluate(() => window.seaBattleScenarioTest.setStation('bridge'));
      expect(await page.evaluate(w => window.seaBattleScenarioTest.weaponHeadingHoldState()[w], weapon)).toBe(false);
      await page.evaluate(w => window.seaBattleScenarioTest.setStation(w), weapon);
      expect(await page.evaluate(w => window.seaBattleScenarioTest.weaponHeadingHoldState()[w], weapon)).toBe(false);
    }
  }
});

test('cannon model receives the current aim in every frame while turning', async ({ page }) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('cannon'));
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({x: 4000, z: 4000, speed: 8, engineOrder: 5, rudderDegrees: 25}));
  await page.keyboard.down('ArrowUp');
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.weaponHeadingHoldState().cannon)).toBe(true);
  await page.keyboard.up('ArrowUp');
  const frames = await page.evaluate(async () => {
    const frames = [];
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame);
      frames.push(window.seaBattleScenarioTest.cannonAimDisplay());
    }
    return frames;
  });
  expect(Math.abs(frames.at(-1).targetYaw - frames[0].targetYaw)).toBeGreaterThan(.001);
  for (const frame of frames) expect(Math.abs(frame.yaw - frame.targetYaw)).toBeLessThan(1e-10);
});
