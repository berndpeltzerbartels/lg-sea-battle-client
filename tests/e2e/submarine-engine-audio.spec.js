import { test, expect } from '@playwright/test';

test('submerged fan runs at fixed pitch even at Stop and Slow, and can be muted', async ({ page }) => {
  const errors = [], downloads = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('.wav')) downloads.push(request.url()); });
  await page.goto('/sea-battle/index.html?vehicle=submarine&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.engineAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  expect((await sound()).looping).toBe(true);
  expect((await sound()).fanGain).toBe(0);
  expect((await sound()).voices).toBe(1);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await expect.poll(async () => (await sound()).fanGain, { timeout: 15000 }).toBeCloseTo(.65);
  for (const order of [8, 3, 2]) {
    await page.evaluate(engineOrder => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder }), order);
    expect((await sound()).fanRate).toBe(1);
    expect((await sound()).fanGain).toBeCloseTo(.65);
  }
  await page.getByRole('button', { name: 'U-Boot-Ton umschalten' }).click();
  await expect.poll(async () => (await sound()).fanGain).toBe(0);
  await page.locator('#engineSoundToggle').click();
  await expect.poll(async () => (await sound()).fanGain).toBeCloseTo(.65);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('surface'));
  await expect.poll(async () => (await sound()).fanGain, { timeout: 15000 }).toBe(0);
  expect(downloads).toHaveLength(1);
  expect(downloads[0]).toContain('submarine-fan-loop');
  expect(errors).toEqual([]);
});

test('torpedo boat does not load the withdrawn engine recordings', async ({ page }) => {
  const downloads = [];
  page.on('request', request => { if (request.url().endsWith('.wav')) downloads.push(request.url()); });
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  expect(await page.evaluate(() => window.seaBattleScenarioTest.engineAudioForTest())).toBeNull();
  await expect(page.locator('#engineSoundToggle')).toBeHidden();
  expect(downloads).toHaveLength(0);
});
