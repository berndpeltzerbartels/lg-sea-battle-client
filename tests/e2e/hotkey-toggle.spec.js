import { test, expect } from '@playwright/test';

for (const width of [844, 1512, 1920]) test(`hotkey toggle at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({width, height: 900});
  await page.goto('/app?vehicle=submarine&sandbox=side-view&scenarioTest=1');
  const toggle = page.locator('#roleHotkeysToggle');
  const panel = page.locator('#roleHotkeys');
  await expect(toggle).toBeVisible();
  // The model-preview tuner is not part of the gameplay HUD.
  await page.locator('.side-view-camera-panel').evaluate(element => element.remove());
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  await toggle.click();
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(900);
  await page.screenshot({path: testInfo.outputPath('expanded.png')});
  await toggle.click();
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('flak'));
  await expect(panel).toBeHidden();
  await expect(toggle).toBeVisible();
});
