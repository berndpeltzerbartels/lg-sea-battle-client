import { test, expect } from '@playwright/test';

test('cannon hotkeys clear the angle and zoom instruments', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1512, height: 800 });
  await page.goto('/app?setup=8&vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.addStyleTag({ content: '.side-view-camera-panel { display: none !important; }' });
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('cannon'));
  const keys = page.locator('#roleHotkeys');
  await expect(keys).toBeVisible();
  await expect(page.locator('.cannon-elevation')).toBeVisible();
  await expect.poll(async () => {
    const a = await keys.boundingBox();
    const b = await page.locator('.cannon-elevation').boundingBox();
    return a.y + a.height <= b.y - 7;
  }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('cannon-keys.png') });
});

test('submarine shows depth-specific hotkeys', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1512, height: 800 });
  await page.goto('/app?setup=8&vehicle=submarine&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.addStyleTag({ content: '.side-view-camera-panel { display: none !important; }' });
  const keys = page.locator('#roleHotkeys');
  await expect(keys).toBeVisible();
  await expect(keys).toContainText('Abtauchen');
  await expect(keys).not.toContainText('Wasserbomben');
  await page.evaluate(() => window.seaBattleScenarioTest.setSubmarineDepthState('submerged'));
  await expect(keys).toContainText('360°-Sehrohr', { timeout: 12000 });
  await expect(keys).toContainText('Auftauchen');
  await expect(keys).not.toContainText('Flak');
  await page.screenshot({ path: testInfo.outputPath('submarine-keys.png') });
});

test('long kill list stays above the sight mask and hotkeys find free space', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1512, height: 800 });
  await page.goto('/app?setup=8&vehicle=torpedo-boat&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.addStyleTag({ content: '.side-view-camera-panel { display: none !important; } .player-list { height: 490px; }' });
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('cannon'));
  const keys = page.locator('#roleHotkeys');
  await expect(keys).toBeVisible();
  await expect.poll(async () => (await keys.boundingBox()).x).toBeLessThan(756);
  const foreground = await page.locator('.player-list').evaluate(element => {
    const mask = document.querySelector('.cannon-scope-vignette');
    element.style.pointerEvents = 'auto';
    mask.style.pointerEvents = 'auto';
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.x + 8, box.y + 8);
    const result = element === top || element.contains(top);
    element.style.pointerEvents = '';
    mask.style.pointerEvents = '';
    return result;
  });
  expect(foreground).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('notebook-keys-and-kills.png') });
});
