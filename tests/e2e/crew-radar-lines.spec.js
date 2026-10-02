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

test('warning buttons stay at the upper left on bridge and are hidden at guns', async ({ page }, testInfo) => {
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const viewport of [{ width: 1512, height: 800 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const station of ['bridge', 'flak', 'cannon']) {
      await page.evaluate(station => {
        window.seaBattleScenarioTest.setStation(station);
        // The sandbox has no crew session; reveal the normal station controls for layout checks.
        document.getElementById('lookoutHud').hidden = false;
      }, station);
      if (station !== 'bridge') {
        await expect(page.locator('#lookoutWarningButton')).toBeHidden();
        await expect(page.locator('#lookoutAircraftWarningButton')).toBeHidden();
        continue;
      }
      const first = await page.locator('#lookoutWarningButton').boundingBox();
      const second = await page.locator('#lookoutAircraftWarningButton').boundingBox();
      expect(first.y).toBe(12);
      expect(first.x).toBeGreaterThanOrEqual(12);
      expect(second.x + second.width).toBeLessThanOrEqual(viewport.width);
      if (station === 'bridge') {
        expect(second.y).toBe(first.y);
        expect(second.x).toBeGreaterThan(first.x);
      } else {
        expect(second.x).toBe(first.x);
        expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
      }
      await page.screenshot({ path: testInfo.outputPath(`warnings-${station}-${viewport.width}.png`) });
    }
  }
});
