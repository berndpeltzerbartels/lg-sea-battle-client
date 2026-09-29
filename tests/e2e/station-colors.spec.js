import { test, expect } from '@playwright/test';

for (const width of [1280, 844]) test(`station occupancy colors remain distinct at ${width}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: width === 1280 ? 800 : 600 });
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => window.seaBattleScenarioTest.setStation('bridge'));
  const own = page.locator('#bridgeViewButton');
  const occupied = page.locator('#flakViewButton');
  await occupied.evaluate(button => {
    button.classList.add('crew-occupied');
    button.disabled = true;
    button.title = 'Besetzt: Testspieler';
  });
  await expect(own).toHaveClass(/is-active/);
  await expect(own).toHaveCSS('border-top-color', 'rgb(116, 201, 242)');
  await expect(occupied).toBeDisabled();
  await expect(occupied).toHaveCSS('opacity', '1');
  await expect(occupied).toHaveCSS('border-top-color', 'rgb(223, 121, 93)');
  await expect(page.locator('#cannonViewButton')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: testInfo.outputPath('station-colors.png') });
});
