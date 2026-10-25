import { test, expect } from '@playwright/test';

test('cannon shots are one-shots, deduplicated and bounded, with automatic cleanup', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.cannonAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  const result = await page.evaluate(() => {
    const t = window.seaBattleScenarioTest;
    t.cannonAudioForTest('same', 0, 10);
    t.cannonAudioForTest('same', 0, 10);
    const single = t.cannonAudioForTest().voices;
    for (let i = 0; i < 25; i++) t.cannonAudioForTest(`other-${i}`, 0, i + 20);
    return { single, all: t.cannonAudioForTest('own', 0, 0, true).voices };
  });
  expect(result).toEqual({ single: 1, all: 6 });
  await expect.poll(async () => (await sound()).voices, { timeout: 7000 }).toBe(0);
  expect(errors).toEqual([]);
});
