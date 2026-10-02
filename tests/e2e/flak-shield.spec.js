import { test, expect } from '@playwright/test';

test('both flak shell previews render and switch variants', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const variant of ['split', 'enclosed']) {
    for (const viewport of [{ width: 1512, height: 900 }, { width: 844, height: 600 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&flakShield=${variant}&viewFocus=flak&viewDistance=3&viewYaw=145&viewFov=.78`);
      await page.waitForFunction(() => window.seaBattleScenarioTest);
      await expect(page.locator(`[data-flak-shield="${variant}"]`)).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(500);
      const pixels = await page.locator('#renderCanvas').screenshot();
      const colors = await page.evaluate(async base64 => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 100, 100);
        const data = ctx.getImageData(0, 0, 100, 100).data, distinct = new Set();
        for (let i = 0; i < data.length; i += 4) distinct.add(`${data[i]},${data[i+1]},${data[i+2]}`);
        return distinct.size;
      }, pixels.toString('base64'));
      expect(colors).toBeGreaterThan(30);
      await page.screenshot({ path: testInfo.outputPath(`${variant}-${viewport.width}.png`) });
    }
  }
  expect(errors).toEqual([]);
  await page.locator('[data-flak-shield="split"]').click();
  await expect(page).toHaveURL(/flakShield=split/);
});

test('inspect the moving gunner camera at minimum and maximum elevation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  for (const variant of ['split', 'enclosed']) {
    await page.goto(`/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&flakShield=${variant}`);
    await page.waitForFunction(() => window.seaBattleScenarioTest);
    await page.locator('[data-camera-mode="gunner"]').click();
    for (const pitch of [-.12, 0, .6, 1.18]) {
      await page.evaluate(pitch => window.seaBattleScenarioTest.flakShotLineAt({ yaw: Math.PI, pitch }), pitch);
      await page.waitForTimeout(400);
      await page.screenshot({ path: testInfo.outputPath(`${variant}-gunner-${pitch}.png`) });
    }
  }
});
