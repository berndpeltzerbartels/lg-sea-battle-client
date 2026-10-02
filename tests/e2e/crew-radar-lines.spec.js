import { test, expect } from '@playwright/test';

test('both weapon lines remain visible at every station', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.stroke;
    window.weaponLineCount = 0;
    CanvasRenderingContext2D.prototype.stroke = function (...args) {
      if (this.canvas.id === 'radarCanvas' && this.lineWidth === 1 && this.strokeStyle.includes('155, 229, 223')) window.weaponLineCount++;
      return original.apply(this, args);
    };
  });
  for (const station of ['bridge', 'lookout', 'cannon', 'flak']) {
    await page.evaluate(station => {
      window.seaBattleScenarioTest.setStation(station);
      window.weaponLineCount = 0;
    }, station);
    await expect.poll(() => page.evaluate(() => window.weaponLineCount)).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: testInfo.outputPath(`${station}.png`) });
  }
});
