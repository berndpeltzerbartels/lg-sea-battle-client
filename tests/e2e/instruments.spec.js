import { test, expect } from '@playwright/test';

test('idle resets cannon, binocular, torpedo and map zoom, while echo only measures proximity', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const [station, attribute] of [['cannon', 'data-cannon-sight'], ['torpedo', 'data-torpedo-scope-zoom']]) {
    await page.evaluate(s => window.seaBattleScenarioTest.setStation(s), station);
    const normal = await page.locator('body').getAttribute(attribute);
    await page.keyboard.press('KeyZ');
    await expect(page.locator('body')).not.toHaveAttribute(attribute, normal);
    await page.evaluate(() => window.seaBattleScenarioTest.expireZoomIdle());
    await expect(page.locator('body')).toHaveAttribute(attribute, normal);
  }
  await page.keyboard.press('KeyO');
  await page.keyboard.press('KeyZ');
  await expect(page.locator('body')).toHaveAttribute('data-lookout-binoculars', 'active');
  await page.evaluate(() => { document.getElementById('mapZoom').value = '5'; window.seaBattleScenarioTest.expireZoomIdle(); });
  await expect(page.locator('body')).toHaveAttribute('data-lookout-binoculars', 'inactive');
  await expect(page.locator('#mapZoom')).toHaveValue('2');
  await page.keyboard.press('KeyB');
  const echo = page.locator('#submarineEchoMeter');
  const setContact = async x => page.evaluate(x => window.seaBattleScenarioTest.echoContacts([
    { id: 'echo-sub', vehicleType: 'submarine', state: 'active', depthState: 'submerged', x, z: 0, y: -20 }
  ]), x);
  await setContact(100);
  await expect(echo).toHaveAttribute('aria-valuenow', '0');
  await setContact(35.46);
  await expect(echo).toHaveAttribute('aria-valuenow', '50');
  await setContact(0);
  await expect(echo).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('#submarineEcho')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('echolot-desktop.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath('echolot-mobile.png') });
  const box = await page.locator('#submarineEcho').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(844);
  expect(errors).toEqual([]);
});

test('idle resets both submarine periscope zooms', async ({ page }) => {
  await page.goto('/app?vehicle=submarine&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('periscope'));
  await expect(page.locator('body')).toHaveAttribute('data-torpedo-view', 'active', { timeout: 20000 });
  for (const key of ['1', '2']) {
    await page.keyboard.press(key);
    await page.keyboard.press('KeyZ');
    await expect(page.locator('body')).toHaveAttribute('data-observation-periscope-zoom', 'II');
    await page.evaluate(() => window.seaBattleScenarioTest.expireZoomIdle());
    await expect(page.locator('body')).toHaveAttribute('data-observation-periscope-zoom', 'I');
    await expect(page.locator('body')).toHaveAttribute('data-torpedo-scope-zoom', 'I');
  }
  await expect(page.locator('#submarineEcho')).toBeHidden();
});
