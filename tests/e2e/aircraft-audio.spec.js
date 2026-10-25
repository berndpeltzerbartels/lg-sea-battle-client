import { test, expect } from '@playwright/test';

test('pilot hears one bounded engine loop and the shared mute works', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sea-battle/index.html?vehicle=scout-plane&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.aircraftAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  await expect.poll(async () => (await sound()).voices).toBe(1);
  expect((await sound()).maxVoices).toBe(4);
  await page.locator('#engineSoundToggle').click();
  await expect.poll(async () => (await sound()).voices).toBe(0);
  await page.locator('#engineSoundToggle').click();
  await expect.poll(async () => (await sound()).voices).toBe(1);
  expect(errors).toEqual([]);
});
