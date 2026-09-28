import { test, expect } from '@playwright/test';

for (const layout of ['stern', 'throwers']) test(`${layout} visibly launches, reloads once, empties, and can be restocked`, async ({ page }, testInfo) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`/sea-battle/?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&depthChargeLayout=${layout}&viewMode=orbit&viewDistance=27&viewHeight=1.6&viewYaw=155`);
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  const port = page.locator('[data-depth-charge-fire="0"]');
  const starboard = page.locator('[data-depth-charge-fire="1"]');
  const refill = page.locator('[data-depth-charge-refill]');
  await port.click();
  await expect(port).toBeDisabled();
  await expect(refill).toBeDisabled();
  await expect(starboard).toBeEnabled();
  await page.waitForTimeout(300);
  await page.screenshot({ path: testInfo.outputPath('depth-charge-flight.png') });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: testInfo.outputPath('depth-charge-reload.png') });
  await expect(port).toHaveText(`Backbord (${layout === 'stern' ? 2 : 1})`, { timeout: 15000 });
  await port.click();
  await expect(port).toHaveText(`Backbord (${layout === 'stern' ? 2 : 0})`, { timeout: 15000 });
  if (layout === 'throwers') await expect(port).toBeDisabled();
  else await expect(port).toBeEnabled();
  await refill.click();
  await expect(port).toHaveText('Backbord (2)');
  await expect(port).toBeEnabled();
  expect(errors).toEqual([]);
});

test('depth charge layouts switch without changing the camera and leave aft flak aim clear', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/sea-battle/?vehicle=torpedo-boat&sandbox=side-view&scenarioTest=1&viewMode=orbit&viewDistance=27&viewHeight=1.6&viewYaw=155');
  await page.waitForFunction(() => window.seaBattleScenarioTest);
  for (const [layout, label] of [['stern', 'Heckgestelle'], ['throwers', 'Seitenwerfer']]) {
    const button = page.getByRole('button', { name: label, exact: true });
    await button.click();
    await page.waitForURL(new RegExp(`depthChargeLayout=${layout}`));
    await page.waitForFunction(() => window.seaBattleScenarioTest);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).searchParams.get('viewYaw')).toBe('155');
    const blocked = await page.evaluate(() => {
      const failures = [];
      for (let degrees = 100; degrees <= 260; degrees += 5) {
        const shot = window.seaBattleScenarioTest.flakShotLineAt({ yaw: degrees * Math.PI / 180, pitch: 0 });
        if (shot.blocked) failures.push({ degrees, blocker: shot.blocker });
      }
      return failures;
    });
    expect(blocked).toEqual([]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: testInfo.outputPath(`${layout}-desktop.png`) });
    const before = await page.locator('#renderCanvas').screenshot();
    await page.mouse.move(900, 350);
    await page.mouse.down();
    await page.mouse.move(940, 360, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const after = await page.locator('#renderCanvas').screenshot();
    expect(before.equals(after)).toBe(false);
    const colors = await page.evaluate(async base64 => {
      const img = new Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 64, 64);
      return new Set(ctx.getImageData(0, 0, 64, 64).data).size;
    }, after.toString('base64'));
    expect(colors).toBeGreaterThan(20);
    // Restore the initial camera before comparing the other layout.
    const url = new URL(page.url());
    url.searchParams.set('viewYaw', '155');
    await page.goto(url.href);
    await page.waitForFunction(() => window.seaBattleScenarioTest);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: testInfo.outputPath('throwers-mobile-landscape.png') });
  expect(errors).toEqual([]);
});
