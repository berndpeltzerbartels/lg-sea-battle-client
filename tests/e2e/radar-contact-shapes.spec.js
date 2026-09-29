import { test, expect } from '@playwright/test';

test('underwater radar uses slender hollow submerged contacts and solid surface contacts', async ({ page }) => {
  await page.goto('/sea-battle/?setup=8&vehicle=submarine&hide-beach=1&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const markers = await page.evaluate(() => {
    const render = (type, depth) => {
      const pixels = window.seaBattleScenarioTest.radarContactCanvasForTest(type, depth);
      const xs = [];
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        if (pixels[(y * 64 + x) * 4 + 3]) xs.push(x);
      }
      return { center: pixels[(32 * 64 + 32) * 4 + 3], width: Math.max(...xs) - Math.min(...xs), count: xs.length };
    };
    return {
      boat: render('torpedo-boat', 'surface'),
      surface: render('submarine', 'surface'),
      scope: render('submarine', 'periscope'),
      deep: render('submarine', 'submerged')
    };
  });
  expect(markers.boat.center).toBeGreaterThan(0);
  expect(markers.surface.center).toBeGreaterThan(0);
  // A subpixel outline can lightly antialias into the center pixel.
  expect(markers.scope.center).toBeLessThan(32);
  expect(markers.deep.center).toBeLessThan(32);
  expect(markers.deep.count).toBeGreaterThan(0);
  expect(markers.deep.width).toBeLessThan(markers.boat.width);
});
