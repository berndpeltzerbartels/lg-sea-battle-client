import { test, expect } from '@playwright/test';

test('underwater engine decodes and loops once, follows power and can be muted', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const downloads = [];
  page.on('request', request => { if (request.url().includes('submarine-underwater-loop')) downloads.push(request.url()); });
  await page.goto('/sea-battle/index.html?vehicle=submarine&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.engineAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  expect((await sound()).looping).toBe(true);
  expect((await sound()).gain).toBe(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 8 }));
  await expect.poll(async () => (await sound()).surfaceGain).toBeGreaterThan(0.7);
  expect((await sound()).underwaterGain).toBe(0);
  expect((await sound()).voices).toBe(2);
  await page.evaluate(() => {
    window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 8 });
    window.seaBattleScenarioTest.setSubmarineDepthState('submerged');
  });
  await expect.poll(async () => (await sound()).underwaterGain, { timeout: 15000 }).toBeGreaterThan(0.7);
  expect((await sound()).rate).toBe(1);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 4 }));
  await expect.poll(async () => (await sound()).rate).toBeLessThan(0.8);
  await page.getByRole('button', { name: 'Motorton umschalten' }).click();
  await expect.poll(async () => (await sound()).gain).toBe(0);
  await expect(page.locator('#engineSoundToggle')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#engineSoundToggle').click();
  await expect.poll(async () => (await sound()).gain).toBeGreaterThan(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 2 }));
  await expect.poll(async () => (await sound()).gain).toBe(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 3 }));
  await expect.poll(async () => (await sound()).gain).toBe(0);
  expect(downloads).toHaveLength(1);
  expect(errors).toEqual([]);
});


test('torpedo boat uses only the diesel and reserves Stop and Slow', async ({ page }) => {
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.engineAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  expect((await sound()).voices).toBe(1);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 8 }));
  await expect.poll(async () => (await sound()).surfaceGain).toBeGreaterThan(.7);
  expect((await sound()).underwaterGain).toBe(0);
  expect((await sound()).rate).toBe(1);
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 3 }));
  await expect.poll(async () => (await sound()).gain).toBe(0);
});
