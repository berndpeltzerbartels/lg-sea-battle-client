import { test, expect } from '@playwright/test';

test('flak buffer decodes once, mixes nearby ships within its budget and releases bursts', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const state = () => page.evaluate(() => window.seaBattleScenarioTest.flakAudioForTest());
  await expect.poll(async () => (await state())?.loaded).toBe(true);
  const result = await page.evaluate(() => {
    const test = window.seaBattleScenarioTest;
    for (let i = 0; i < 30; i++) test.flakAudioForTest(`ship-${i}`, i, 10);
    return test.flakAudioForTest('own', 0, 0, true);
  });
  expect(result.voices).toBe(8);
  await expect.poll(async () => (await state()).voices).toBe(0);
  expect(errors).toEqual([]);
});
