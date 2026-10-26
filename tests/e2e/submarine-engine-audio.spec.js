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
  expect((await sound()).voices).toBe(3);
  expect((await sound()).surfaceGain).toBeGreaterThan(0);
  expect((await sound()).underwaterGain).toBe(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await expect.poll(async () => (await sound()).fanGain, { timeout: 15000 }).toBeCloseTo(.65);
  await expect.poll(() => page.evaluate(() => window.seaBattleScenarioTest.submarineDiveSequenceSnapshot().depthOffset), { timeout: 15000 }).toBeLessThan(-2);
  for (const order of [8, 3, 2]) {
    await page.evaluate(engineOrder => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder }), order);
    expect((await sound()).fanRate).toBe(1);
    await expect.poll(async () => (await sound()).fanGain).toBeCloseTo(.65);
    await expect.poll(async () => (await sound()).underwaterGain).toBe(0);
    if (order === 8) await expect.poll(async () => (await sound()).rate).toBe(1);
    if (order === 3) await expect.poll(async () => (await sound()).rate).toBeLessThan(.7);
  }
  await page.evaluate(() => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder: 8 }));
  await expect.poll(async () => (await sound()).underwaterGain).toBe(0);
  await page.getByRole('button', { name: 'Schiffston umschalten' }).click();
  await expect.poll(async () => (await sound()).fanGain).toBe(0);
  expect((await sound()).underwaterGain).toBe(0);
  await page.locator('#engineSoundToggle').click();
  await expect.poll(async () => (await sound()).fanGain).toBeCloseTo(.65);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('surface'));
  await expect.poll(async () => (await sound()).fanGain, { timeout: 15000 }).toBe(0);
  expect((await sound()).underwaterGain).toBe(0);
  expect((await sound()).surfaceGain).toBeGreaterThan(.7);
  expect((await sound()).surfaceRate).toBe(1);
  expect(downloads).toHaveLength(26);
  expect(downloads.some(url => url.includes('submarine-fan-loop'))).toBe(true);
  expect(downloads.some(url => url.includes('submarine-electric-motor-loop'))).toBe(true);
  expect(errors).toEqual([]);
});

test('torpedo boat keeps exterior diesel and mixes quieter ventilated interior stations', async ({ page }) => {
  const downloads = [];
  page.on('request', request => { if (request.url().endsWith('.wav')) downloads.push(request.url()); });
  await page.goto('/sea-battle/index.html?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.locator('canvas').first().click({ position: { x: 20, y: 20 } });
  const sound = () => page.evaluate(() => window.seaBattleScenarioTest.engineAudioForTest());
  await expect.poll(async () => (await sound())?.loaded).toBe(true);
  expect((await sound()).voices).toBe(2);
  expect((await sound()).fanGain).toBe(.5);
  expect((await sound()).underwaterGain).toBe(0);
  for (const [order, comparison] of [[7, 'equal'], [8, 'higher'], [4, 'lower']]) {
    await page.evaluate(engineOrder => window.seaBattleScenarioTest.setPlayerNavigationState({ engineOrder }), order);
    if (comparison === 'equal') await expect.poll(async () => (await sound()).surfaceRate).toBe(1);
    if (comparison === 'higher') await expect.poll(async () => (await sound()).surfaceRate).toBeGreaterThan(1);
    if (comparison === 'lower') await expect.poll(async () => (await sound()).surfaceRate).toBeLessThan(1);
  }
  await expect(page.locator('#engineSoundToggle')).toBeVisible();
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('flak'));
  await expect.poll(async () => (await sound()).fanGain).toBe(0);
  const exteriorLevel = (await sound()).surfaceGain;
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('lookout'));
  await expect.poll(async () => (await sound()).surfaceGain).toBeCloseTo(exteriorLevel);
  expect((await sound()).fanGain).toBe(0);
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('cannon'));
  await expect.poll(async () => (await sound()).surfaceGain).toBeCloseTo(exteriorLevel * .5);
  expect((await sound()).fanGain).toBe(.3);
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('bridge'));
  await expect.poll(async () => (await sound()).surfaceGain).toBeCloseTo(exteriorLevel * .7);
  expect((await sound()).fanGain).toBe(.5);
  expect(downloads).toHaveLength(25);
  expect(downloads.some(url => url.includes('surface-diesel-loop'))).toBe(true);
});
