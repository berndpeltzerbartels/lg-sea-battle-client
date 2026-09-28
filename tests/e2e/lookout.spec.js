import { test, expect } from '@playwright/test';

test('lookout is accessible from every station and binocular commands retain the station', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const station of ['bridge', 'cannon', 'flak', 'torpedo']) {
    await page.evaluate(s => window.seaBattleScenarioTest.setStation(s), station);
    await page.keyboard.press('KeyO');
    await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
    await expect(page.locator('#lookoutViewButton')).toHaveClass(/is-active/);
  }
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  const radarBefore = await page.locator('#radarCanvas').screenshot();
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  expect((await page.locator('#radarCanvas').screenshot()).equals(radarBefore)).toBe(false);
  await expect(page.locator('.lookout-reticle')).toBeVisible();
  // German QWERTZ produces KeyY for the letter Z, including when a HUD button has focus.
  await page.locator('#lookoutZoomButton').focus();
  await page.locator('#lookoutZoomButton').dispatchEvent('keydown', { key: 'z', code: 'KeyY', bubbles: true });
  await expect(page.locator('body')).toHaveAttribute('data-lookout-binoculars', 'active');
  await page.locator('#renderCanvas').focus();
  await page.keyboard.press('KeyZ');
  await expect(page.locator('body')).toHaveAttribute('data-lookout-binoculars', 'inactive');
  await page.keyboard.press('KeyZ');
  await expect(page.locator('.lookout-binocular-mask')).toBeVisible();
  await page.keyboard.press('Shift+KeyC');
  await expect(page.locator('#lookoutFeedback')).toHaveText('Kanone ausgerichtet');
  await page.keyboard.press('Shift+KeyF');
  await expect(page.locator('#lookoutFeedback')).toHaveText('Flak ausgerichtet');
  await expect(page.locator('body')).toHaveAttribute('data-lookout-view', 'active');
  await page.screenshot({ path: testInfo.outputPath('lookout-desktop.png') });
  const frame = await page.locator('#renderCanvas').screenshot();
  const pixels = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = 32; copy.height = 32;
    const ctx = copy.getContext('2d');
    ctx.drawImage(image, 0, 0, 32, 32);
    return new Set(Array.from(ctx.getImageData(0, 0, 32, 32).data)).size;
  }, frame.toString('base64'));
  expect(pixels).toBeGreaterThan(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('lookout-mobile.png') });
  for (const id of ['lookoutZoomButton', 'lookoutCannonButton', 'lookoutFlakButton']) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
  await page.keyboard.press('KeyB');
  await expect(page.locator('#lookoutHud')).toBeHidden();
  await expect(page.locator('.lookout-binocular-mask')).toBeHidden();
  await expect(page.locator('.lookout-reticle')).toBeHidden();
  expect(errors).toEqual([]);
});
